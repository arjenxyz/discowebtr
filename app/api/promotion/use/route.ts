import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const getSelectedGuildId = async (): Promise<string> => {
  const cookieStore = await cookies();
  const selectedGuildId = cookieStore.get('selected_guild_id')?.value;
  return selectedGuildId || process.env.DISCORD_GUILD_ID || '1465698764453838882';
};

const getSupabase = () => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase credentials not configured');
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
};

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('discord_user_id')?.value;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code } = await request.json();
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
    }

    const supabase = getSupabase();
    const selectedGuildId = await getSelectedGuildId();

    // DEBUG: Log incoming promo usage attempt (temporary)
    console.log('[promo-debug] Attempting to use promo code', { code, selectedGuildId });

    // Get server ID
    const { data: server } = await supabase
      .from('servers')
      .select('id')
      .eq('discord_id', selectedGuildId)
      .single();

    if (!server) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 });
    }

    // DEBUG: server id used for promotion lookup
    console.log('[promo-debug] server id for lookup', { serverId: server.id });

    // Check if promotion code exists and is valid
    const { data: promotion, error: promoError } = await supabase
      .from('promotions')
      .select('*')
      .eq('server_id', server.id)
      .eq('code', code.toUpperCase())
      .eq('status', 'active')
      .is('deleted_at', null)
      .single();

    console.log('[promo-debug] promotion query result', { promoError: promoError ?? null, promotion: promotion ? { id: promotion.id, server_id: promotion.server_id, status: promotion.status, expires_at: promotion.expires_at, max_uses: promotion.max_uses, used_count: promotion.used_count } : null });

    if (promoError || !promotion) {
      // Check if promo exists on another server for clearer feedback
      const { data: otherPromo, error: otherPromoErr } = await supabase
        .from('promotions')
        .select('id, server_id')
        .eq('code', code.toUpperCase())
        .maybeSingle();

      console.log('[promo-debug] other promo check', { otherPromo: otherPromo ?? null, otherPromoErr: otherPromoErr ?? null });

      if (otherPromo && !otherPromoErr) {
        return NextResponse.json({ error: 'Bu promosyon kodu bu sunucuya ait değil' }, { status: 400 });
      }

      return NextResponse.json({ error: 'Geçersiz promosyon kodu' }, { status: 400 });
    }

    // More debug info for failing conditions
    if (promotion.expires_at && new Date(promotion.expires_at) < new Date()) {
      console.log('[promo-debug] promotion expired', { expires_at: promotion.expires_at });
      return NextResponse.json({ error: 'Promosyon kodu süresi dolmuş' }, { status: 400 });
    }

    if (promotion.max_uses && promotion.used_count >= promotion.max_uses) {
      console.log('[promo-debug] promotion max uses reached', { max_uses: promotion.max_uses, used_count: promotion.used_count });
      return NextResponse.json({ error: 'Promosyon kodu kullanım limiti dolmuş' }, { status: 400 });
    }

    const { data: existingPromotionUsage } = await supabase
      .from('promotion_usages')
      .select('id')
      .eq('promotion_id', promotion.id)
      .eq('user_id', userId)
      .single();

    console.log('[promo-debug] existing usage check', { existingPromotionUsage: existingPromotionUsage ?? null });

    if (existingPromotionUsage) {
      return NextResponse.json({ error: 'Bu promosyon kodunu zaten kullandınız' }, { status: 400 });
    }

    // Check expiration
    if (promotion.expires_at && new Date(promotion.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Promosyon kodu süresi dolmuş' }, { status: 400 });
    }

    // Check usage limit
    if (promotion.max_uses && promotion.used_count >= promotion.max_uses) {
      return NextResponse.json({ error: 'Promosyon kodu kullanım limiti dolmuş' }, { status: 400 });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('member_profiles')
      .select('wallet_balance')
      .eq('discord_id', userId)
      .eq('server_id', server.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profil bulunamadı' }, { status: 404 });
    }

    // Apply promotion
    const newBalance = profile.wallet_balance + promotion.value;

    // Update wallet balance
    const { error: walletError } = await supabase
      .from('member_profiles')
      .update({ wallet_balance: newBalance })
      .eq('discord_id', userId)
      .eq('server_id', server.id);

    if (walletError) {
      console.error('Wallet update error:', walletError);
      return NextResponse.json({ error: 'Cüzdan güncellenirken hata oluştu' }, { status: 500 });
    }

    // Record usage
    const { error: usageError } = await supabase
      .from('promotion_usages')
      .insert({
        promotion_id: promotion.id,
        user_id: userId,
        used_at: new Date().toISOString(),
      });

    if (usageError) {
      console.error('Usage record error:', usageError);
      // Don't fail the request if usage recording fails
    }

    // Update promotion usage count
    const { error: updateError } = await supabase
      .from('promotions')
      .update({ used_count: promotion.used_count + 1 })
      .eq('id', promotion.id);

    if (updateError) {
      console.error('Promotion update error:', updateError);
      // Don't fail the request if count update fails
    }

    return NextResponse.json({
      success: true,
      message: `${promotion.value} Papel hesabınıza eklendi!`,
      newBalance,
    });

  } catch (error) {
    console.error('Promotion usage error:', error);
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 });
  }
}