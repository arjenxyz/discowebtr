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

    const { code, itemId } = await request.json();
    if (!code || typeof code !== 'string' || !itemId) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const supabase = getSupabase();
    const selectedGuildId = await getSelectedGuildId();

    // DEBUG: Log incoming discount validation attempt (temporary)
    console.log('[discount-debug] Validating discount code', { code, itemId, selectedGuildId });

    // Get server ID
    const { data: server } = await supabase
      .from('servers')
      .select('id')
      .eq('discord_id', selectedGuildId)
      .single();

    if (!server) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 });
    }

    // Check if discount code exists and is valid
    const { data: discount, error: discountError } = await supabase
      .from('store_discounts')
      .select('*')
      .eq('server_id', server.id)
      .eq('code', code.toUpperCase())
      .eq('status', 'active')
      .single();

    if (discountError || !discount) {
      // Check if code exists on another server to provide clearer message
      const { data: other, error: otherErr } = await supabase
        .from('store_discounts')
        .select('id, server_id')
        .eq('code', code.toUpperCase())
        .maybeSingle();

      if (other && !otherErr) {
        return NextResponse.json({ error: 'Bu indirim kodu bu sunucuya ait değil' }, { status: 400 });
      }

      return NextResponse.json({ error: 'Geçersiz indirim kodu' }, { status: 400 });
    }

    // Check expiration
    if (discount.expires_at && new Date(discount.expires_at) < new Date()) {
      return NextResponse.json({ error: 'İndirim kodu süresi dolmuş' }, { status: 400 });
    }

    // Check usage limit
    if (discount.max_uses && discount.used_count >= discount.max_uses) {
      return NextResponse.json({ error: 'İndirim kodu kullanım limiti dolmuş' }, { status: 400 });
    }

    // Check if user already used this code
    const { data: existingUsage } = await supabase
      .from('discount_usages')
      .select('id')
      .eq('discount_id', discount.id)
      .eq('user_id', userId)
      .single();

    if (existingUsage) {
      return NextResponse.json({ error: 'Bu indirim kodunu zaten kullandınız' }, { status: 400 });
    }

    // Get item details
    const { data: item } = await supabase
      .from('store_items')
      .select('*')
      .eq('id', itemId)
      .eq('server_id', server.id)
      .single();

    if (!item) {
      return NextResponse.json({ error: 'Ürün bulunamadı' }, { status: 404 });
    }

    // Calculate discounted price
    const discountAmount = (item.price * discount.percent) / 100;
    const finalPrice = item.price - discountAmount;

    return NextResponse.json({
      success: true,
      discount: {
        id: discount.id,
        code: discount.code,
        percent: discount.percent,
        originalPrice: item.price,
        discountAmount,
        finalPrice,
      },
    });

  } catch (error) {
    console.error('Discount validation error:', error);
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 });
  }
}