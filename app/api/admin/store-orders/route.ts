import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { logWebEvent } from '@/lib/serverLogger';

const GUILD_ID = process.env.DISCORD_GUILD_ID ?? '1465698764453838882';
const ADMIN_ROLE_ID = process.env.DISCORD_ADMIN_ROLE_ID;
const DEFAULT_SLUG = 'default';

const getSupabase = () => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
};

const isAdminUser = async () => {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken || !ADMIN_ROLE_ID) {
    return false;
  }

  const cookieStore = await cookies();
  const userId = cookieStore.get('discord_user_id')?.value;
  if (!userId) {
    return false;
  }

  const memberResponse = await fetch(`https://discord.com/api/guilds/${GUILD_ID}/members/${userId}`, {
    headers: { Authorization: `Bot ${botToken}` },
  });

  if (!memberResponse.ok) {
    return false;
  }

  const member = (await memberResponse.json()) as { roles: string[] };
  return member.roles.includes(ADMIN_ROLE_ID);
};

const getAdminId = async () => {
  const cookieStore = await cookies();
  return cookieStore.get('discord_user_id')?.value ?? null;
};

const resolveServerId = async (supabase: SupabaseClient) => {
  const { data: byDiscord } = await supabase
    .from('servers')
    .select('id')
    .eq('discord_id', GUILD_ID)
    .maybeSingle();

  const discordId = (byDiscord as { id?: string } | null)?.id;
  if (discordId) {
    return discordId;
  }

  const { data: bySlug } = await supabase
    .from('servers')
    .select('id')
    .eq('slug', DEFAULT_SLUG)
    .maybeSingle();

  return (bySlug as { id?: string } | null)?.id ?? null;
};

const getBalance = async (supabase: SupabaseClient, userId: string) => {
  const { data } = (await supabase
    .from('member_wallets')
    .select('balance')
    .eq('guild_id', GUILD_ID)
    .eq('user_id', userId)
    .maybeSingle()) as unknown as { data: { balance?: number } | null };

  return Number(data?.balance ?? 0);
};

const setBalance = async (supabase: SupabaseClient, userId: string, balance: number) => {
  await (supabase.from('member_wallets') as unknown as {
    upsert: (values: Record<string, unknown>, options?: { onConflict?: string }) => Promise<unknown>;
  }).upsert(
    {
      guild_id: GUILD_ID,
      user_id: userId,
      balance,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'guild_id,user_id' },
  );
};

export async function GET(request: Request) {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });
  }

  const serverId = await resolveServerId(supabase);
  if (!serverId) {
    return NextResponse.json({ error: 'server_not_found' }, { status: 404 });
  }

  const url = new URL(request.url);
  const mode = url.searchParams.get('mode');

  const selectFields = 'id,user_id,amount,status,created_at,item_title,role_id,duration_days,applied_at,store_items(title)';

  const mapOrders = (orders: Array<Record<string, unknown>> | null) =>
    (orders ?? []).map((order) => {
      const itemTitle =
        'store_items' in order && order.store_items && typeof order.store_items === 'object'
          ? (order.store_items as { title?: string | null }).title ?? null
          : null;
      return { ...order, item_title: (order as { item_title?: string | null }).item_title ?? itemTitle };
    });

  if (mode === 'pending') {
    const { data, error } = await supabase
      .from('store_orders')
      .select(selectFields)
      .eq('server_id', serverId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
    }

    return NextResponse.json(mapOrders(data as Array<Record<string, unknown>>));
  }

  if (mode === 'stuck') {
    const { data, error } = await supabase
      .from('store_orders')
      .select(selectFields)
      .eq('server_id', serverId)
      .eq('status', 'paid')
      .is('applied_at', null)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
    }

    return NextResponse.json(mapOrders(data as Array<Record<string, unknown>>));
  }

  const [pendingResult, stuckResult] = await Promise.all([
    supabase
      .from('store_orders')
      .select(selectFields)
      .eq('server_id', serverId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true }),
    supabase
      .from('store_orders')
      .select(selectFields)
      .eq('server_id', serverId)
      .eq('status', 'paid')
      .is('applied_at', null)
      .order('created_at', { ascending: true }),
  ]);

  if (pendingResult.error || stuckResult.error) {
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }

  return NextResponse.json({
    pending: mapOrders(pendingResult.data as Array<Record<string, unknown>>),
    stuck: mapOrders(stuckResult.data as Array<Record<string, unknown>>),
  });
}

export async function POST(request: Request) {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });
  }

  const serverId = await resolveServerId(supabase);
  if (!serverId) {
    return NextResponse.json({ error: 'server_not_found' }, { status: 404 });
  }

  const adminId = await getAdminId();
  const payload = (await request.json()) as {
    orderId?: string;
    action?: 'approve' | 'reject';
    reason?: string;
  };

  if (!payload.orderId || !payload.action) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  const { data: order } = (await supabase
    .from('store_orders')
    .select('id,user_id,amount,status')
    .eq('id', payload.orderId)
    .eq('server_id', serverId)
    .maybeSingle()) as unknown as { data: { id: string; user_id: string; amount: number; status: string } | null };

  if (!order) {
    return NextResponse.json({ error: 'order_not_found' }, { status: 404 });
  }

  if (order.status !== 'pending') {
    return NextResponse.json({ error: 'invalid_status' }, { status: 400 });
  }

  if (payload.action === 'approve') {
    await supabase
      .from('store_orders')
      .update({ status: 'paid', applied_at: null, failure_reason: null })
      .eq('id', order.id);

    await logWebEvent(request, {
      event: 'admin_store_order_approve',
      status: 'success',
      userId: adminId ?? undefined,
      guildId: GUILD_ID,
      metadata: {
        orderId: order.id,
        targetUserId: order.user_id,
        amount: order.amount,
      },
    });

    return NextResponse.json({ status: 'ok' });
  }

  const failureReason = payload.reason?.trim() || 'Admin reddetti';
  await supabase
    .from('store_orders')
    .update({ status: 'failed', failure_reason: failureReason })
    .eq('id', order.id);

  const currentBalance = await getBalance(supabase, order.user_id);
  const nextBalance = Number((currentBalance + Number(order.amount)).toFixed(2));
  await setBalance(supabase, order.user_id, nextBalance);
  await (supabase.from('wallet_ledger') as unknown as {
    insert: (values: Record<string, unknown>) => Promise<unknown>;
  }).insert({
    guild_id: GUILD_ID,
    user_id: order.user_id,
    amount: Number(order.amount),
    type: 'refund',
    balance_after: nextBalance,
    metadata: { orderId: order.id, reason: failureReason },
  });

  await logWebEvent(request, {
    event: 'admin_store_order_reject',
    status: 'success',
    userId: adminId ?? undefined,
    guildId: GUILD_ID,
    metadata: {
      orderId: order.id,
      targetUserId: order.user_id,
      amount: order.amount,
      reason: failureReason,
    },
  });

  return NextResponse.json({ status: 'ok', balance: nextBalance });
}