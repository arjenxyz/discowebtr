import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { checkMaintenance } from '@/lib/maintenance';
import { logWebEvent } from '@/lib/serverLogger';

const GUILD_ID = process.env.DISCORD_GUILD_ID ?? '1465698764453838882';

const getSelectedGuildId = async (): Promise<string> => {
  const cookieStore = await cookies();
  const selectedGuildId = cookieStore.get('selected_guild_id')?.value;
  return selectedGuildId || GUILD_ID; // Fallback to default
};

const getSupabase = (): SupabaseClient | null => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
};

const getBalance = async (supabase: SupabaseClient, userId: string, guildId: string) => {
  const { data } = (await supabase
    .from('member_wallets')
    .select('balance')
    .eq('guild_id', guildId)
    .eq('user_id', userId)
    .maybeSingle()) as unknown as { data: { balance?: number } | null };

  return Number(data?.balance ?? 0);
};

const setBalance = async (supabase: SupabaseClient, userId: string, guildId: string, balance: number) => {
  await (supabase.from('member_wallets') as unknown as {
    upsert: (values: Record<string, unknown>, options?: { onConflict?: string }) => Promise<unknown>;
  }).upsert(
    {
      guild_id: guildId,
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

  const selectedGuildId = await getSelectedGuildId();

  const payload = (await request.json()) as { itemId?: string; discountCode?: string };
  if (!payload.itemId) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  const { data: server, error: serverError } = await supabase
    .from('servers')
    .select('id')
    .eq('discord_id', selectedGuildId)
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

  let finalPrice = Number(item.price);
  let appliedDiscount = null;

  // Check discount code if provided
  if (payload.discountCode) {
    const { data: discount, error: discountError } = await supabase
      .from('store_discounts')
      .select('*')
      .eq('server_id', server.id)
      .eq('code', payload.discountCode.toUpperCase())
      .eq('status', 'active')
      .is('expires_at', null)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .single();

    if (discountError || !discount) {
      return NextResponse.json({ error: 'invalid_discount_code' }, { status: 400 });
    }

    // Check usage limit
    if (discount.max_uses && discount.used_count >= discount.max_uses) {
      return NextResponse.json({ error: 'discount_code_expired' }, { status: 400 });
    }

    // Check if user already used this discount
    const { data: existingUsage } = await supabase
      .from('discount_usages')
      .select('id')
      .eq('discount_id', discount.id)
      .eq('user_id', userId)
      .single();

    if (existingUsage) {
      return NextResponse.json({ error: 'discount_already_used' }, { status: 400 });
    }

    // Apply discount
    const discountAmount = (finalPrice * discount.percent) / 100;
    finalPrice = finalPrice - discountAmount;
    appliedDiscount = discount;
  }

  const currentBalance = await getBalance(supabase, userId, server.id);
  if (currentBalance < finalPrice) {
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
      amount: finalPrice,
      status: 'pending',
      discount_code: appliedDiscount?.code,
      discount_percent: appliedDiscount?.percent,
    })
    .select('id,amount,status,created_at,expires_at')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }

  const newBalance = Number((currentBalance - finalPrice).toFixed(2));
  await setBalance(supabase, userId, server.id, newBalance);
  await (supabase.from('wallet_ledger') as unknown as {
    insert: (values: Record<string, unknown>) => Promise<unknown>;
  }).insert({
    guild_id: server.id,
    user_id: userId,
    amount: finalPrice,
    type: 'purchase',
    balance_after: newBalance,
    metadata: { orderId: order?.id, itemId: item.id, discountCode: appliedDiscount?.code },
  });

  // Record discount usage if applied
  if (appliedDiscount) {
    await supabase.from('discount_usages').insert({
      discount_id: appliedDiscount.id,
      user_id: userId,
      order_id: order?.id,
    });

    // Increment discount used count
    await supabase
      .from('store_discounts')
      .update({ used_count: appliedDiscount.used_count + 1 })
      .eq('id', appliedDiscount.id);
  }

  await logWebEvent(request, {
    event: 'store_purchase',
    status: 'success',
    userId,
    guildId: selectedGuildId,
    roleId: item.role_id ?? undefined,
    metadata: {
      orderId: order?.id,
      itemId: item.id,
      title: item.title,
      price: finalPrice,
      originalPrice: item.price,
      discountCode: appliedDiscount?.code,
      discountPercent: appliedDiscount?.percent,
      durationDays: item.duration_days,
      balanceAfter: newBalance,
    },
  });

  return NextResponse.json({ status: 'ok', order, balance: newBalance });
}
