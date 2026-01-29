import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { checkMaintenance } from '@/lib/maintenance';

const DEFAULT_SLUG = 'default';

const getSupabase = (): SupabaseClient | null => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
};

const getBalance = async (supabase: SupabaseClient, userId: string) => {
  const { data } = (await supabase
    .from('member_wallets')
    .select('balance')
    .eq('guild_id', process.env.DISCORD_GUILD_ID ?? '1465698764453838882')
    .eq('user_id', userId)
    .maybeSingle()) as unknown as { data: { balance?: number } | null };

  return Number(data?.balance ?? 0);
};

const setBalance = async (supabase: SupabaseClient, userId: string, balance: number) => {
  await (supabase.from('member_wallets') as unknown as {
    upsert: (values: Record<string, unknown>, options?: { onConflict?: string }) => Promise<unknown>;
  }).upsert(
    {
      guild_id: process.env.DISCORD_GUILD_ID ?? '1465698764453838882',
      user_id: userId,
      balance,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'guild_id,user_id' },
  );
};

export async function POST(request: Request) {
  const maintenance = await checkMaintenance(['site', 'store']);
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

  const payload = (await request.json()) as { itemId?: string };
  if (!payload.itemId) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  const { data: server, error: serverError } = await supabase
    .from('servers')
    .select('id')
    .eq('slug', DEFAULT_SLUG)
    .maybeSingle();

  if (serverError || !server) {
    return NextResponse.json({ error: 'server_not_found' }, { status: 404 });
  }

  const { data: item, error: itemError } = await supabase
    .from('store_items')
    .select('id,title,price,role_id,duration_days,status')
    .eq('id', payload.itemId)
    .eq('server_id', server.id)
    .eq('status', 'active')
    .maybeSingle();

  if (itemError || !item) {
    return NextResponse.json({ error: 'item_not_found' }, { status: 404 });
  }

  if (!item.role_id) {
    return NextResponse.json({ error: 'missing_role' }, { status: 400 });
  }

  const currentBalance = await getBalance(supabase, userId);
  if (currentBalance < Number(item.price)) {
    return NextResponse.json({ error: 'insufficient_funds' }, { status: 400 });
  }

  const { data: order, error } = await supabase
    .from('store_orders')
    .insert({
      server_id: server.id,
      user_id: userId,
      item_id: item.id,
      item_title: item.title,
      role_id: item.role_id,
      duration_days: item.duration_days,
      expires_at: null,
      amount: item.price,
      status: 'pending',
    })
    .select('id,amount,status,created_at,expires_at')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }

  const newBalance = Number((currentBalance - Number(item.price)).toFixed(2));
  await setBalance(supabase, userId, newBalance);
  await (supabase.from('wallet_ledger') as unknown as {
    insert: (values: Record<string, unknown>) => Promise<unknown>;
  }).insert({
    guild_id: process.env.DISCORD_GUILD_ID ?? '1465698764453838882',
    user_id: userId,
    amount: Number(item.price),
    type: 'purchase',
    balance_after: newBalance,
    metadata: { orderId: order?.id, itemId: item.id },
  });

  return NextResponse.json({ status: 'ok', order, balance: newBalance });
}
