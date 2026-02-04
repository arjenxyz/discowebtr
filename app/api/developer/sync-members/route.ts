import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface DiscordUser {
  id: string;
  username: string;
  global_name?: string;
  avatar?: string;
}

interface DiscordMember {
  user: DiscordUser;
  nick?: string;
  roles: string[];
}

const getSupabase = () => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
};

export async function POST() {
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

    // Botun bulunduğu sunucuları al
    const botGuildsResponse = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: { Authorization: `Bot ${botToken}` },
    });

    if (!botGuildsResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch bot guilds' }, { status: 500 });
    }

    const botGuilds = await botGuildsResponse.json();

    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    let totalSynced = 0;

    // Her sunucu için üyeleri çek ve kaydet
    for (const guild of botGuilds) {
      try {
        console.log(`Syncing members for guild: ${guild.name} (${guild.id})`);

        // Sunucu üyelerini al
        const membersResponse = await fetch(
          `https://discord.com/api/guilds/${guild.id}/members?limit=1000`,
          {
            headers: { Authorization: `Bot ${botToken}` },
          },
        );

        if (!membersResponse.ok) {
          const errorText = await membersResponse.text();
          console.error(`Failed to fetch members for guild ${guild.id}: ${membersResponse.status} ${membersResponse.statusText} - ${errorText}`);
          continue;
        }

        const members = await membersResponse.json() as DiscordMember[];

        console.log(`Fetched ${members.length} members for guild ${guild.name}`);
        if (members.length > 0) {
          console.log('Sample member:', JSON.stringify(members[0], null, 2));
        }

        if (members.length === 0) {
          console.log('No members to sync for this guild');
          continue;
        }

        // Sunucu bilgilerini al/güncelle
        const { data: serverData, error: serverError } = await supabase
          .from('servers')
          .upsert(
            {
              discord_id: guild.id,
              name: guild.name,
              slug: guild.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
              is_setup: false, // TODO: check setup status
            },
            { onConflict: 'discord_id' }
          )
          .select('id')
          .single();

        if (serverError || !serverData) {
          console.error(`Failed to upsert server ${guild.id}:`, serverError);
          continue;
        }

        const serverId = serverData.id;

        // Üyeleri işle
        const memberInserts = members.map((member: DiscordMember) => {
          const user = member.user;
          const displayName = user.global_name || user.username;
          const avatarUrl = user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : null;

          return {
            server_id: serverId,
            discord_id: user.id,
            username: user.username,
            display_name: displayName,
            avatar_url: avatarUrl,
            points: 0, // Default points
            role_level: 0, // Default role level
          };
        });

        // Batch upsert
        const { error: membersError } = await supabase
          .from('members')
          .upsert(memberInserts, { onConflict: 'server_id,discord_id' });

        if (membersError) {
          console.error(`Failed to upsert members for server ${guild.id}:`, membersError);
        } else {
          console.log(`Synced ${memberInserts.length} members for server ${guild.name}`);
          totalSynced += memberInserts.length;
        }

        // Rate limit için bekle
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error syncing guild ${guild.id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${totalSynced} members across ${botGuilds.length} servers`,
    });
  } catch (error) {
    console.error('Error in sync-members:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}