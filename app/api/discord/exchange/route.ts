import { NextResponse } from 'next/server';
import { logWebEvent } from '@/lib/serverLogger';
import { createClient } from '@supabase/supabase-js';

interface Guild {
  id: string;
  name: string;
  isAdmin: boolean;
  isSetup: boolean;
  verifyRoleId: string | null;
  isOwner: boolean;
}

const GUILD_ID = process.env.DISCORD_GUILD_ID ?? '1465698764453838882';
const REQUIRED_ROLE_ID = process.env.DISCORD_REQUIRED_ROLE_ID ?? '1465999952940498975';
const ADMIN_ROLE_ID = process.env.DISCORD_ADMIN_ROLE_ID;

const getSupabase = () => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
};

export async function POST(request: Request) {
  try {
    const { code } = (await request.json()) as { code?: string };

    const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;
    const redirectUri = process.env.NEXT_PUBLIC_REDIRECT_URI;
    const botToken = process.env.DISCORD_BOT_TOKEN;

    if (!code || !clientId || !clientSecret || !redirectUri || !botToken) {
      await logWebEvent(request, {
        event: 'discord_exchange_failed',
        status: 'missing_env_or_code',
      });
      return NextResponse.json({ status: 'error' }, { status: 400 });
    }

    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      scope: 'identify email guilds guilds.join',
    });

    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!tokenResponse.ok) {
      await logWebEvent(request, {
        event: 'discord_exchange_failed',
        status: 'token_exchange_failed',
      });
      return NextResponse.json({ status: 'error' }, { status: 401 });
    }

    const tokenData = (await tokenResponse.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      token_type?: string;
    };

    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userResponse.ok) {
      await logWebEvent(request, {
        event: 'discord_exchange_failed',
        status: 'user_fetch_failed',
      });
      return NextResponse.json({ status: 'error' }, { status: 401 });
    }

    const user = (await userResponse.json()) as {
      id: string;
      username: string;
      avatar: string | null;
      discriminator: string;
      email?: string | null;
    };

    // Kullanıcının bulunduğu tüm sunucuları al
    const guildsResponse = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!guildsResponse.ok) {
      await logWebEvent(request, {
        event: 'discord_exchange_failed',
        status: 'guilds_fetch_failed',
      });
      return NextResponse.json({ status: 'error' }, { status: 401 });
    }

    const guilds = (await guildsResponse.json()) as Array<{
      id: string;
      name: string;
      permissions: string;
      owner?: boolean;
    }>;

    const supabase = getSupabase();

    if (supabase) {
      const expiresAt = tokenData.expires_in
        ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
        : null;
      await (supabase.from('users') as unknown as {
        upsert: (values: Array<Record<string, unknown>>, options?: { onConflict?: string }) => Promise<unknown>;
      }).upsert(
        [
          {
            discord_id: user.id,
            username: user.username,
            email: user.email ?? null,
            oauth_access_token: tokenData.access_token,
            oauth_refresh_token: tokenData.refresh_token ?? null,
            oauth_expires_at: expiresAt,
            updated_at: new Date().toISOString(),
          },
        ],
        { onConflict: 'discord_id' },
      );
    }

    // OAuth ile gelen sunucuları sakla (kullanıcı izin verdiyse)
    if (supabase && guilds.length > 0) {
      await (supabase.from('user_guilds') as unknown as {
        upsert: (values: Array<Record<string, unknown>>, options?: { onConflict?: string }) => Promise<unknown>;
      }).upsert(
        guilds.map((guild) => ({
          user_id: user.id,
          guild_id: guild.id,
          guild_name: guild.name,
          guild_icon: (guild as { icon?: string | null }).icon ?? null,
          updated_at: new Date().toISOString(),
        })),
        { onConflict: 'user_id,guild_id' },
      );
    }

    // Sadece setup yapılmış ve kullanıcının erişebildiği sunucuları döndür
    const adminGuilds: Guild[] = [];

    if (supabase) {
      // Önce Supabase'den setup edilmiş sunucuları çek
      const { data: setupServers } = await supabase
        .from('servers')
        .select('discord_id, name, admin_role_id, verify_role_id, is_setup')
        .eq('is_setup', true);

      if (setupServers) {
        for (const server of setupServers) {
          // Bu sunucu kullanıcının bulunduğu sunucular arasında mı kontrol et
          const userGuild = guilds.find(g => g.id === server.discord_id);
          if (!userGuild) continue; // Kullanıcı bu sunucuda değil

          // Daha detaylı loglama ekle
          console.log(`Admin kontrolü başlatıldı: Sunucu=${server.name}, Kullanıcı=${user.id}`);

          try {
            const memberResponse = await fetch(
              `https://discord.com/api/guilds/${server.discord_id}/members/${user.id}`,
              {
                headers: { Authorization: `Bot ${botToken}` },
              },
            );

            if (memberResponse.ok) {
              const member = (await memberResponse.json()) as { roles: string[] };
              const isAdmin = server.admin_role_id ? member.roles.includes(server.admin_role_id) : false;

              console.log(`Sunucu ${server.name}: admin_role_id=${server.admin_role_id}, user_roles=${member.roles}, isAdmin=${isAdmin}`);

              adminGuilds.push({
                id: server.discord_id,
                name: server.name,
                isAdmin: isAdmin,
                isSetup: true,
                verifyRoleId: server.verify_role_id,
                isOwner: Boolean(userGuild.owner)
              });
            } else {
              console.log(`Discord API isteği başarısız: Sunucu=${server.name}, Kullanıcı=${user.id}, Status=${memberResponse.status}`);
            }
          } catch (error) {
            console.log(`Sunucu ${server.name} kontrol edilemedi:`, error);
          }
        }
      }

      // Ayrıca botun bulunduğu ama setup edilmemiş sunucuları da kontrol et
      // Bu sunucularda bot varsa ama setup yapılmamışsa, kullanıcıyı bilgilendir
      const allUserGuilds = guilds.filter(g => {
        // Bu sunucu zaten setup edilmiş listede var mı kontrol et
        const isAlreadyInSetup = setupServers?.some(s => s.discord_id === g.id);
        return !isAlreadyInSetup; // Setup edilmemiş olanları al
      });

      for (const userGuild of allUserGuilds) {
        try {
          // Bot bu sunucuda mı kontrol et
          const botGuildResponse = await fetch(
            `https://discord.com/api/guilds/${userGuild.id}`,
            {
              headers: { Authorization: `Bot ${botToken}` },
            },
          );

          if (botGuildResponse.ok) {
            // Bot bu sunucuda, ama setup edilmemiş
            const botGuild = await botGuildResponse.json();

            // Kullanıcının bu sunucuda üye olup olmadığını tekrar kontrol et
            const memberResponse = await fetch(
              `https://discord.com/api/guilds/${userGuild.id}/members/${user.id}`,
              {
                headers: { Authorization: `Bot ${botToken}` },
              },
            );

            if (memberResponse.ok) {
              const member = (await memberResponse.json()) as { roles: string[] };

              // Bu sunucu için veritabanında kayıt var mı kontrol et
              const { data: existingServer } = await supabase
                .from('servers')
                .select('admin_role_id, verify_role_id, is_setup')
                .eq('discord_id', userGuild.id)
                .single();

              if (existingServer) {
                // Sunucu kayıtlı ama setup edilmemiş
                const isAdmin = existingServer.admin_role_id ? member.roles.includes(existingServer.admin_role_id) : false;
                adminGuilds.push({
                  id: userGuild.id,
                  name: botGuild.name,
                  isAdmin: isAdmin,
                  isSetup: false, // Setup edilmemiş olarak işaretle
                  verifyRoleId: existingServer.verify_role_id,
                  isOwner: Boolean(userGuild.owner)
                });
              } else {
                // Sunucu hiç kayıtlı değil, ama bot orada
                adminGuilds.push({
                  id: userGuild.id,
                  name: botGuild.name,
                  isAdmin: false, // Setup olmadığı için admin değil
                  isSetup: false,
                  verifyRoleId: null,
                  isOwner: Boolean(userGuild.owner)
                });
              }
            }
          }
        } catch (error) {
          console.log(`Sunucu ${userGuild.name} (${userGuild.id}) kontrol edilemedi:`, error);
        }
      }
    }

    // Ana sunucudaki rol kontrolü (mevcut sistem için)
    const mainGuildMemberResponse = await fetch(
      `https://discord.com/api/guilds/${GUILD_ID}/members/${user.id}`,
      {
        headers: { Authorization: `Bot ${botToken}` },
      },
    );

    let hasRole = false;
    let isAdmin = false;

    if (mainGuildMemberResponse.ok) {
      const member = (await mainGuildMemberResponse.json()) as { roles: string[] };
      hasRole = member.roles.includes(REQUIRED_ROLE_ID);
      
      // Supabase'den admin_role_id'yi çek
      let adminRoleId = ADMIN_ROLE_ID; // fallback
      if (supabase) {
        const { data: serverData } = await supabase
          .from('servers')
          .select('admin_role_id')
          .eq('discord_id', GUILD_ID)
          .single();
        if (serverData?.admin_role_id) {
          adminRoleId = serverData.admin_role_id;
        }
      }
      
      isAdmin = adminRoleId ? member.roles.includes(adminRoleId) : false;

      console.log(`Ana sunucu kontrolü: user_roles=${member.roles}, required_role=${REQUIRED_ROLE_ID}, hasRole=${hasRole}, admin_role=${adminRoleId}, isAdmin=${isAdmin}`);
    }

    // Status'u belirle
    let status: 'ok' | 'needs_rules' | 'no_guilds' = 'no_guilds';
    
    if (adminGuilds.length > 0) {
      // Admin olan sunucu varsa, OK
      const hasAdminGuild = adminGuilds.some(g => g.isAdmin);
      if (hasAdminGuild) {
        status = 'ok';
      } else {
        // Admin olmayan ama verify rolü olan sunucu varsa, rules gerekli
        // const needsRules = adminGuilds.some(g => g.verifyRoleId);
        // status = needsRules ? 'needs_rules' : 'ok';
        // Kurallar adımını atla - direkt dashboard'a git
        status = 'ok';
      }
    }

    console.log('Final status determination:', { adminGuilds, hasAdminGuild: adminGuilds.some(g => g.isAdmin), status, isAdmin });

    const response = NextResponse.json({ 
      status, 
      isAdmin,
      adminGuilds,
      user: {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        discriminator: user.discriminator
      }
    });
    
    console.log('Exchange response:', { status, isAdmin, adminGuilds }); // Debug log
    
    response.cookies.set('discord_user_id', user.id, {
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    response.cookies.set('discord_access_token', tokenData.access_token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    const cookieHeader = request.headers.get('cookie') || '';
    const guildIdMatch = cookieHeader.match(/selected_guild_id=([^;]+)/);
    const selectedGuildId = guildIdMatch ? guildIdMatch[1] : GUILD_ID;

    await logWebEvent(request, {
      event: 'discord_role_check',
      status: hasRole ? 'has_role' : 'missing_role',
      userId: user.id,
      guildId: selectedGuildId,
      roleId: REQUIRED_ROLE_ID,
      metadata: { username: user.username },
    });

    return response;
  } catch {
    await logWebEvent(request, {
      event: 'discord_exchange_failed',
      status: 'unhandled_exception',
    });
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}
