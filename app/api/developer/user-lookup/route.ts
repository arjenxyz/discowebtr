import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { serverCache } from '@/lib/serverCache';
import { logWebEvent } from '@/lib/serverLogger';

const getSupabase = () => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
};

type DiscordChannel = {
  id: string;
  type: number;
  name?: string;
};

export async function GET(request: NextRequest) {
  try {
    // Developer access kontrolü
    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({ error: 'Bot token not configured' }, { status: 500 });
    }

    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const discordUserId = cookieStore.get('discord_user_id')?.value;

    if (!discordUserId) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const developerRoleId = process.env.DEVELOPER_ROLE_ID ?? '1467580199481639013';
    const developerGuildId = process.env.DEVELOPER_GUILD_ID ?? process.env.DISCORD_GUILD_ID ?? '1465698764453838882';

    const developerResponse = await fetch(
      `https://discord.com/api/guilds/${developerGuildId}/members/${discordUserId}`,
      {
        headers: { Authorization: `Bot ${botToken}` },
      },
    );

    if (!developerResponse.ok) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 403 });
    }

    const developerMember = (await developerResponse.json()) as { roles: string[] };
    if (!developerMember.roles.includes(developerRoleId)) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 403 });
    }

    // Query parameter kontrolü
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query')?.trim();

    if (!query) {
      return NextResponse.json({ error: 'missing_query' }, { status: 400 });
    }

    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Kullanıcı arama
    let usersQuery = supabase
      .from('users')
      .select('id, discord_id, username, email, points, role_level, created_at');

    if (/^\d{10,}$/.test(query)) {
      // Discord ID ile arama
      usersQuery = usersQuery.eq('discord_id', query);
    } else if (query.length >= 3) {
      // Kullanıcı adı ile arama (partial match)
      usersQuery = usersQuery.ilike('username', `%${query}%`);
    } else {
      return NextResponse.json({ error: 'Query too short' }, { status: 400 });
    }

    const { data: users, error: usersError } = await usersQuery.limit(10);

    if (usersError) {
      console.error('Users query error:', usersError);
      return NextResponse.json({ error: 'Failed to search users' }, { status: 500 });
    }

    if (!users || users.length === 0) {
      // Fallback: if query looks like a Discord ID, try to fetch basic user info
      if (/^\d{10,}$/.test(query)) {
        try {
          const discordUserResp = await fetch(`https://discord.com/api/users/${query}`, {
            headers: { Authorization: `Bot ${botToken}` },
          });

          if (discordUserResp.ok) {
            const du = await discordUserResp.json();
            const fallbackUser = {
              id: null,
              discord_id: du.id,
              username: du.username + (du.discriminator ? `#${du.discriminator}` : ''),
              email: null,
              points: 0,
              role_level: 0,
              created_at: null,
              fetched_from_discord: true,
            };

            return NextResponse.json({
              users: [fallbackUser],
              servers: [],
              oauthGuilds: [],
            });
          }
        } catch (err) {
          console.error('Discord fallback user fetch failed:', err);
        }
      }

      return NextResponse.json({
        users: [],
        servers: [],
        oauthGuilds: []
      });
    }

    // Her kullanıcı için üye olduğu sunucuları bul ve widget kontrolü yap
    const userDiscordIds = users.map(u => u.discord_id);
    const { data: members, error: membersError } = await supabase
      .from('members')
      .select(`
        discord_id,
        username,
        display_name,
        avatar_url,
        servers!inner (
          id,
          name,
          slug,
          discord_id
        )
      `)
      .in('discord_id', userDiscordIds);

    if (membersError) {
      console.error('Members query error:', membersError);
      return NextResponse.json({ error: 'Failed to fetch member servers' }, { status: 500 });
    }

    // Kullanıcı başına benzersiz sunucuları topla (her kullanıcının sadece kendi sunucuları)
    const userServersMap = new Map<string, Map<string, { id: string; discord_id: string | null; name: string; slug: string }>>();
    if (members) {
      members.forEach(member => {
        if (member.servers) {
          const server = Array.isArray(member.servers) ? member.servers[0] : member.servers;
          if (server && server.discord_id) {
            let mapForUser = userServersMap.get(member.discord_id);
            if (!mapForUser) {
              mapForUser = new Map();
              userServersMap.set(member.discord_id, mapForUser);
            }
            if (!mapForUser.has(server.id)) {
              mapForUser.set(server.id, {
                id: server.id,
                discord_id: server.discord_id,
                name: server.name,
                slug: server.slug,
              });
            }
          }
        }
      });
    }

    // Her sunucu için widget kontrolü yap
    // Seçili (ilk) kullanıcıyı hedefle ve sadece onun sunucularını işle
    const selectedDiscordId = users && users.length > 0 ? users[0].discord_id : null;
    const selectedUserServers = selectedDiscordId ? Array.from(userServersMap.get(selectedDiscordId || '')?.values() || []) : [];

    const serversPromises = selectedUserServers.map(async (server) => {
      let inviteLink = null;

      try {
        // Widget API'sini kontrol et
        const widgetResponse = await fetch(
          `https://discord.com/api/guilds/${server.discord_id}/widget`,
          {
            headers: { Authorization: `Bot ${botToken}` },
          }
        );

        if (widgetResponse.ok) {
          const widgetData = await widgetResponse.json();
          if (widgetData.instant_invite) {
            inviteLink = widgetData.instant_invite;
          }
        }
      } catch (error) {
        console.error(`Widget check failed for server ${server.discord_id}:`, error);
      }

      return {
        discord_id: server.discord_id,
        name: server.name,
        slug: server.slug,
        invite_link: inviteLink
      };
    });

    const servers = await Promise.all(serversPromises);

    // OAuth guilds için Discord API çağrısı (öncelik: oturumdaki token, değilse hedef kullanıcının saklı tokenı)
    const oauthGuilds: Array<{
      discord_id: string | null;
      name: string;
      slug: string;
      icon_url?: string | null;
      link?: string | null;
      invite?: string | null;
    }> = [];

    // Target user's OAuth guilds (if we have their stored token)
    const targetOauthGuilds: Array<{
      discord_id: string;
      name: string;
      icon_url?: string | null;
      owner?: boolean;
      permissions?: string;
    }> = [];

    try {
      // Mevcut geliştirici oturumunun tokenı (cookie)
      const accessToken = cookieStore.get('discord_access_token')?.value;

      // Eğer oturum tokenı varsa, developer'ın görebileceği oauthGuilds'i al
      if (accessToken) {
        const cacheKey = `dev_guilds_${accessToken}`;
        let guilds: any[] | null = serverCache.get(cacheKey);
        if (!guilds) {
          const guildsResponse = await fetch('https://discord.com/api/users/@me/guilds', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (guildsResponse.ok) {
            guilds = await guildsResponse.json();
            serverCache.set(cacheKey, guilds, 30);
          } else {
            guilds = [];
          }
        }

        for (const g of guilds || []) {
          oauthGuilds.push({
            discord_id: g.id,
            name: g.name,
            slug: g.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
            icon_url: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png` : null,
            link: null,
            invite: null,
          });
        }
      }

      // Hedef (aranan) kullanıcının saklanmış OAuth token'ı varsa onun sunucularını getir
      const selectedDiscordId = users && users.length > 0 ? users[0].discord_id : null;
      if (selectedDiscordId) {
        try {
          const { data: userRecord } = await supabase.from('users').select('oauth_access_token').eq('discord_id', selectedDiscordId).single();
          const targetToken = (userRecord as any)?.oauth_access_token;
          if (targetToken) {
            const targetResp = await fetch('https://discord.com/api/users/@me/guilds', {
              headers: { Authorization: `Bearer ${targetToken}` },
            });
              if (targetResp.ok) {
                const tg = await targetResp.json();
                for (const g of tg) {
                  targetOauthGuilds.push({
                    discord_id: g.id,
                    name: g.name,
                    icon_url: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png` : null,
                    owner: Boolean(g.owner),
                    permissions: g.permissions,
                  });
                }
              }
          }
        } catch (err) {
          console.error('Error fetching target user guilds from stored token:', err);
        }
      }
    } catch (error) {
      console.error('Error fetching OAuth guilds:', error);
    }

    // Mutual / registered flags: check which oauthGuilds are registered in our DB and
    // which of them the target user is actually a member of (from targetOauthGuilds)
    try {
      const allGuildIds = [
        ...new Set([
          ...oauthGuilds.map(g => g.discord_id).filter(Boolean),
          ...targetOauthGuilds.map(g => g.discord_id).filter(Boolean),
        ] as string[]),
      ];

      const { data: registeredServers } = await supabase
        .from('servers')
        .select('discord_id')
        .in('discord_id', allGuildIds || [] as string[]);

      const registeredSet = new Set((registeredServers || []).map((s: any) => s.discord_id));
      const targetSet = new Set(targetOauthGuilds.map(g => g.discord_id));

      // Annotate oauthGuilds
      for (const g of oauthGuilds) {
        (g as any).registered = registeredSet.has(g.discord_id || '');
        (g as any).mutual = targetSet.has(g.discord_id || '');
      }

      // Also annotate targetOauthGuilds for completeness
      for (const g of targetOauthGuilds) {
        (g as any).registered = registeredSet.has(g.discord_id || '');
      }
    } catch (err) {
      console.error('Error annotating mutual/registered flags:', err);
    }

    // Audit log for developer lookup
    try {
      await logWebEvent(request, {
        event: 'developer_user_lookup',
        status: 'ok',
        userId: users && users[0] ? users[0].discord_id : null,
        metadata: { performedBy: discordUserId, query },
      });
    } catch (err) {
      console.error('Failed to write audit log for user-lookup:', err);
    }

    return NextResponse.json({
      users,
      servers,
      oauthGuilds,
      targetOauthGuilds
    });
  } catch (error) {
    console.error('Error in user-lookup:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}