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

export async function POST(request: Request) {
  try {
    const { guildId } = (await request.json()) as { guildId?: string };

    if (!guildId) {
      return NextResponse.json({ error: 'guild_id_required' }, { status: 400 });
    }

    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({ error: 'bot_token_missing' }, { status: 500 });
    }

    const cookieStore = await cookies();
    const userId = cookieStore.get('discord_user_id')?.value;
    if (!userId) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ error: 'database_error' }, { status: 500 });
    }

    // Sunucunun verify_role_id'sini al
    const { data: server } = await supabase
      .from('servers')
      .select('verify_role_id')
      .eq('discord_id', guildId)
      .maybeSingle();

    if (!server?.verify_role_id) {
      return NextResponse.json({ hasRole: false });
    }

    // Discord API'den kullanıcının rollerini al
    const memberResponse = await fetch(
      `https://discord.com/api/guilds/${guildId}/members/${userId}`,
      {
        headers: { Authorization: `Bot ${botToken}` },
      },
    );

    if (!memberResponse.ok) {
      return NextResponse.json({ hasRole: false });
    }

    const member = (await memberResponse.json()) as { roles: string[] };
    const hasVerifyRole = member.roles.includes(server.verify_role_id);

    return NextResponse.json({ hasRole: hasVerifyRole });
  } catch (error) {
    console.error('Check role error:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}