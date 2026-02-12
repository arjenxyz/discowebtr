import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { checkMaintenance } from '@/lib/maintenance';

const GUILD_ID = process.env.DISCORD_GUILD_ID ?? '1465698764453838882';

const getSupabase = () => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
};

export async function GET(req: Request) {
  const maintenance = await checkMaintenance(['site']);
  if (maintenance.blocked) {
    return NextResponse.json({ error: 'maintenance', key: maintenance.key, reason: maintenance.reason }, { status: 503 });
  }

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });

  const cookieStore = await cookies();
  const userId = cookieStore.get('discord_user_id')?.value;
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const rangeHours = Number(url.searchParams.get('rangeHours') ?? '24');

  // compute start date for daily stats (floor to date)
  const now = new Date();
  const start = new Date(now.getTime() - Math.max(1, rangeHours) * 60 * 60 * 1000);
  const startDate = start.toISOString().split('T')[0];

  try {
    const [{ data: overview }, { data: rangeTotals }] = await Promise.all([
      supabase.from('server_overview_stats').select('total_messages,total_voice_minutes').eq('guild_id', GUILD_ID).maybeSingle(),
      supabase
        .from('server_daily_stats')
        .select('message_count,voice_minutes')
        .eq('guild_id', GUILD_ID)
        .gte('stat_date', startDate),
    ]);

    let rangeMessages = 0;
    let rangeVoiceMinutes = 0;
    if (Array.isArray(rangeTotals)) {
      for (const r of rangeTotals) {
        rangeMessages += Number(r.message_count ?? 0);
        rangeVoiceMinutes += Number(r.voice_minutes ?? 0);
      }
    }

    return NextResponse.json({
      rangeHours,
      rangeMessages,
      rangeVoiceMinutes,
      totalMessages: Number(overview?.total_messages ?? 0),
      totalVoiceMinutes: Number(overview?.total_voice_minutes ?? 0),
      // tag/boost metrics not tracked as daily aggregates in the schema currently
      tagUsage: { messages: 0, voiceMinutes: 0 },
      boostUsage: { seconds: 0 },
    });
  } catch (err) {
    return NextResponse.json({ error: 'query_failed', detail: String(err) }, { status: 500 });
  }
}
