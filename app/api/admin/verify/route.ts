import { cookies } from 'next/headers';
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

const getSelectedGuildId = async (): Promise<string> => {
  const cookieStore = await cookies();
  const selectedGuildId = cookieStore.get('selected_guild_id')?.value;
  return selectedGuildId || process.env.DISCORD_GUILD_ID || '1465698764453838882';
};

export async function GET() {
  try {
    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({ isAdmin: false }, { status: 200 });
    }

    const cookieStore = await cookies();
    const userId = cookieStore.get('discord_user_id')?.value;

    if (!userId) {
      return NextResponse.json({ isAdmin: false }, { status: 200 });
    }

    const selectedGuildId = await getSelectedGuildId();

    // Supabase'den admin_role_id'yi al
    const supabase = getSupabase();
    let adminRoleId: string | null = null;

    if (supabase) {
      const { data: server } = await supabase
        .from('servers')
        .select('admin_role_id')
        .eq('discord_id', selectedGuildId)
        .maybeSingle();

      adminRoleId = server?.admin_role_id || null;
    }

    if (!adminRoleId) {
      return NextResponse.json({ isAdmin: false }, { status: 200 });
    }

    const memberResponse = await fetch(
      `https://discord.com/api/guilds/${selectedGuildId}/members/${userId}`,
      {
        headers: { Authorization: `Bot ${botToken}` },
      },
    );

    if (!memberResponse.ok) {
      return NextResponse.json({ isAdmin: false }, { status: 200 });
    }

    const member = (await memberResponse.json()) as { roles: string[] };
    const isAdmin = member.roles.includes(adminRoleId);

    return NextResponse.json({ isAdmin }, { status: 200 });
  } catch {
    return NextResponse.json({ isAdmin: false }, { status: 200 });
  }
}
