import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkMaintenance } from '@/lib/maintenance';

const DEFAULT_SLUG = 'default';
const GUILD_ID = process.env.DISCORD_GUILD_ID ?? '1465698764453838882';

const getSupabase = () => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
};

const getTodayStartIso = () => {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
  return start.toISOString();
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

  const { data: server } = await supabase
    .from('servers')
    .select('id,transfer_daily_limit,transfer_tax_rate')
    .eq('slug', DEFAULT_SLUG)
    .maybeSingle();

  if (!server) {
    return NextResponse.json({ error: 'server_not_found' }, { status: 404 });
  }

  const { data: wallet } = await supabase
    .from('member_wallets')
    .select('balance')
    .eq('guild_id', GUILD_ID)
    .eq('user_id', userId)
    .maybeSingle();

  const { data: sentToday } = await supabase
    .from('wallet_ledger')
    .select('amount')
    .eq('guild_id', GUILD_ID)
    .eq('user_id', userId)
    .eq('type', 'transfer_out')
    .gte('created_at', getTodayStartIso());

  const totalSent = sentToday?.reduce((sum, row) => sum + Number(row.amount ?? 0), 0) ?? 0;

  return NextResponse.json({
    balance: wallet?.balance ?? 0,
    dailyLimit: server.transfer_daily_limit,
    taxRate: server.transfer_tax_rate,
    sentToday: totalSent,
  });
}
