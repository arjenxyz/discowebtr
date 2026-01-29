import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { checkMaintenance } from '@/lib/maintenance';

const GUILD_ID = process.env.DISCORD_GUILD_ID ?? '1465698764453838882';

const getSupabase = () => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
};

export async function GET() {
  const maintenance = await checkMaintenance(['site']);
  if (maintenance.blocked) {
    return NextResponse.json(
      { error: 'maintenance', key: maintenance.key, reason: maintenance.reason },
      { status: 503 },
    );
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });
  }

  const cookieStore = await cookies();
  const userId = cookieStore.get('discord_user_id')?.value;
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const [{ data: serverTotals }, { data: userTotals }] = await Promise.all([
    supabase
      .from('server_overview_stats')
      .select('total_messages,total_voice_minutes')
      .eq('guild_id', GUILD_ID)
      .maybeSingle(),
    supabase
      .from('member_overview_stats')
      .select('total_messages,total_voice_minutes')
      .eq('guild_id', GUILD_ID)
      .eq('user_id', userId)
      .maybeSingle(),
  ]);

  let joinedAt: string | null = null;
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (botToken) {
    const memberResponse = await fetch(`https://discord.com/api/guilds/${GUILD_ID}/members/${userId}`, {
      headers: { Authorization: `Bot ${botToken}` },
    });
    if (memberResponse.ok) {
      const member = (await memberResponse.json()) as { joined_at?: string };
      joinedAt = member.joined_at ?? null;
    }
  }

  return NextResponse.json({
    joinedAt,
    serverMessages: Number(serverTotals?.total_messages ?? 0),
    serverVoiceMinutes: Number(serverTotals?.total_voice_minutes ?? 0),
    userMessages: Number(userTotals?.total_messages ?? 0),
    userVoiceMinutes: Number(userTotals?.total_voice_minutes ?? 0),
  });
}
