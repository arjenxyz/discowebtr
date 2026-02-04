import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

    // Benzersiz sunucuları topla
    const uniqueServers = new Map<string, { id: string; discord_id: string | null; name: string; slug: string }>();
    if (members) {
      members.forEach(member => {
        if (member.servers) {
          const server = Array.isArray(member.servers) ? member.servers[0] : member.servers;
          if (server && server.discord_id && !uniqueServers.has(server.id)) {
            uniqueServers.set(server.id, {
              id: server.id,
              discord_id: server.discord_id,
              name: server.name,
              slug: server.slug
            });
          }
        }
      });
    }

    // Her sunucu için widget kontrolü yap
    const serversPromises = Array.from(uniqueServers.values()).map(async (server) => {
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

    // OAuth guilds için Discord API çağrısı
    const oauthGuilds: Array<{
      discord_id: string | null;
      name: string;
      slug: string;
      icon_url?: string | null;
      link?: string | null;
      invite?: string | null;
    }> = [];

    try {
      // Mevcut kullanıcının OAuth token'ını cookie'den al
      const accessToken = cookieStore.get('discord_access_token')?.value;

      if (accessToken) {
        const guildsResponse = await fetch('https://discord.com/api/users/@me/guilds', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (guildsResponse.ok) {
          const guilds = await guildsResponse.json();

          // Her sunucu için invite linki almayı dene
          for (const guild of guilds) {
            let inviteLink = null;
            let inviteCode = null;

            try {
              // Önce Discord Widget API'sini kontrol et (izin gerektirmez)
              const widgetResponse = await fetch(
                `https://discord.com/api/guilds/${guild.id}/widget`,
                {
                  headers: { Authorization: `Bot ${botToken}` },
                }
              );

              if (widgetResponse.ok) {
                const widgetData = await widgetResponse.json();
                if (widgetData.instant_invite) {
                  inviteCode = widgetData.instant_invite.split('/').pop(); // URL'den code çıkar
                  inviteLink = widgetData.instant_invite;
                }
              }

              // Widget invite yoksa, mevcut invite'ları kontrol et
              if (!inviteLink) {
                const invitesResponse = await fetch(
                  `https://discord.com/api/guilds/${guild.id}/invites`,
                  {
                    headers: { Authorization: `Bot ${botToken}` },
                  }
                );

                if (invitesResponse.ok) {
                  const invites = await invitesResponse.json();
                  if (invites.length > 0) {
                    // İlk invite'ı kullan
                    inviteCode = invites[0].code;
                    inviteLink = `https://discord.gg/${inviteCode}`;
                  }
                }
              }

              // Hala invite yoksa, kullanıcının token'ı ile invite oluşturmayı dene
              if (!inviteLink && accessToken) {
                // Sistem kanalını veya kurallar kanalını bul
                const channelsResponse = await fetch(
                  `https://discord.com/api/guilds/${guild.id}/channels`,
                  {
                    headers: { Authorization: `Bearer ${accessToken}` },
                  }
                );

                if (channelsResponse.ok) {
                  const channels = await channelsResponse.json();
                  // Text kanallarından ilkini seç
                  const textChannel = channels.find((ch: DiscordChannel) => ch.type === 0); // 0 = text channel

                  if (textChannel) {
                    const createInviteResponse = await fetch(
                      `https://discord.com/api/channels/${textChannel.id}/invites`,
                      {
                        method: 'POST',
                        headers: {
                          Authorization: `Bearer ${accessToken}`,
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          max_age: 604800, // 7 gün
                          max_uses: 0, // sınırsız
                          temporary: false,
                          unique: true,
                        }),
                      }
                    );

                    if (createInviteResponse.ok) {
                      const invite = await createInviteResponse.json();
                      inviteCode = invite.code;
                      inviteLink = `https://discord.gg/${inviteCode}`;
                    }
                  }
                }
              }

              // Hala invite yoksa, bot ile invite oluşturmayı dene
              if (!inviteLink) {
                // Sistem kanalını veya kurallar kanalını bul
                const channelsResponse = await fetch(
                  `https://discord.com/api/guilds/${guild.id}/channels`,
                  {
                    headers: { Authorization: `Bot ${botToken}` },
                  }
                );

                if (channelsResponse.ok) {
                  const channels = await channelsResponse.json();
                  // Text kanallarından ilkini seç
                  const textChannel = channels.find((ch: DiscordChannel) => ch.type === 0); // 0 = text channel

                  if (textChannel) {
                    const createInviteResponse = await fetch(
                      `https://discord.com/api/channels/${textChannel.id}/invites`,
                      {
                        method: 'POST',
                        headers: {
                          Authorization: `Bot ${botToken}`,
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          max_age: 604800, // 7 gün
                          max_uses: 0, // sınırsız
                          temporary: false,
                          unique: true,
                        }),
                      }
                    );

                    if (createInviteResponse.ok) {
                      const invite = await createInviteResponse.json();
                      inviteCode = invite.code;
                      inviteLink = `https://discord.gg/${inviteCode}`;
                    }
                  }
                }
              }
            } catch (error) {
              console.error(`Failed to get/create invite for guild ${guild.id}:`, error);
            }

            oauthGuilds.push({
              discord_id: guild.id,
              name: guild.name,
              slug: guild.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
              icon_url: guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png` : null,
              link: inviteLink,
              invite: inviteLink, // Aynı linki kullan
            });
          }
        }
      }
    } catch (error) {
      // OAuth guilds alınamazsa devam et
      console.error('Error fetching OAuth guilds:', error);
    }

    return NextResponse.json({
      users,
      servers,
      oauthGuilds
    });
  } catch (error) {
    console.error('Error in user-lookup:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}