import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const getSupabase = () => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
};

export async function GET() {
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

    // Supabase'den verileri al
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Tüm sunucuları al
    const { data: servers, error: serversError } = await supabase
      .from('servers')
      .select('id, name, slug, discord_id, is_setup, created_at')
      .order('created_at', { ascending: false });

    if (serversError) {
      console.error('Servers query error:', serversError);
      return NextResponse.json({ error: 'Failed to fetch servers' }, { status: 500 });
    }

    // Her sunucu için üyeleri al
    const serversWithMembers = await Promise.all(
      (servers || []).map(async (server) => {
        const { data: members, error: membersError } = await supabase
          .from('members')
          .select('id, username')
          .eq('server_id', server.id);

        if (membersError) {
          console.error(`Members query error for server ${server.id}:`, membersError);
          return {
            ...server,
            members: [],
            member_count: 0,
          };
        }

        return {
          ...server,
          members: members || [],
          member_count: (members || []).length,
        };
      })
    );

    return NextResponse.json({ items: serversWithMembers });
  } catch (error) {
    console.error('Error fetching servers-members:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}