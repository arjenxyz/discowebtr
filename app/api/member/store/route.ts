import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkMaintenance } from '@/lib/maintenance';
import { discordFetch } from '@/lib/discordRest';

const GUILD_ID = process.env.DISCORD_GUILD_ID ?? '1465698764453838882';

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
  return selectedGuildId || GUILD_ID;
};

export async function GET() {
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

  const selectedGuildId = await getSelectedGuildId();

  const { data: server, error: serverError } = await supabase
    .from('servers')
    .select('id')
    .eq('discord_id', selectedGuildId)
    .maybeSingle();

  if (serverError || !server) {
    return NextResponse.json({ error: 'server_not_found' }, { status: 404 });
  }

  const now = new Date().toISOString();

  const { data: promotions, error: promotionsError } = await supabase
    .from('promotions')
    .select('id,code,value,max_uses,used_count,status,expires_at,created_at')
    .eq('server_id', server.id)
    .eq('status', 'active')
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order('created_at', { ascending: false })
    .limit(10);

  if (promotionsError) {
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }

  const { data: items, error: itemsError } = await supabase
    .from('store_items')
    .select('id,title,description,price,status,role_id,duration_days,created_at')
    .eq('server_id', server.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(20);

  if (itemsError) {
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }

  return NextResponse.json({ promotions: promotions ?? [], items: items ?? [] });
}

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
  const selectedGuildId = await getSelectedGuildId();

  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  console.log('Checkout request:', { userId, selectedGuildId });

  const { data: server } = await supabase
    .from('servers')
    .select('id')
    .eq('discord_id', selectedGuildId)
    .maybeSingle();

  if (!server) {
    return NextResponse.json({ error: 'server_not_found' }, { status: 404 });
  }

  console.log('Server found:', server.id);

  // Parse cart items from request
  const body = await request.json().catch(() => ({}));
  const { items, appliedCoupon }: { items: Array<{ itemId: string; qty: number }>; appliedCoupon?: { id: string } } = body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'invalid_cart' }, { status: 400 });
  }

  // Get item details and calculate total
  const itemIds = items.map(i => i.itemId);
  const { data: storeItems } = await supabase
    .from('store_items')
    .select('id, title, price, role_id, duration_days')
    .in('id', itemIds);

  if (!storeItems || storeItems.length !== itemIds.length) {
    return NextResponse.json({ error: 'invalid_items' }, { status: 400 });
  }

  let subtotal = 0;
  const orderItems = items.map(cartItem => {
    const item = storeItems.find(si => si.id === cartItem.itemId);
    if (!item) throw new Error('item_not_found');
    const itemTotal = item.price * cartItem.qty;
    subtotal += itemTotal;
    return {
      item_id: item.id,
      title: item.title,
      price: item.price,
      qty: cartItem.qty,
      total: itemTotal,
      role_id: item.role_id,
      duration_days: item.duration_days,
    };
  });

  // Calculate discount
  let discountAmount = 0;
  let discountId = null;
  if (appliedCoupon?.id) {
    const { data: coupon } = await supabase
      .from('store_discounts')
      .select('id, percent, min_spend, status')
      .eq('id', appliedCoupon.id)
      .eq('status', 'active')
      .maybeSingle();

    if (coupon) {
      // enforce min_spend if present
      const minSpend = Number(coupon.min_spend ?? 0);
      if (minSpend > 0 && subtotal < minSpend) {
        const remaining = Number((minSpend - subtotal).toFixed(2));
        return NextResponse.json({ error: 'MIN_SPEND_NOT_MET', remaining, minSpend }, { status: 400 });
      }

      discountAmount = Math.round((subtotal * coupon.percent) / 100 * 100) / 100;
      discountId = coupon.id;
    }
  }

  const total = Math.max(0, subtotal - discountAmount);

  // Check wallet balance (create if not exists)
  let { data: wallet } = await supabase
    .from('member_wallets')
    .select('balance')
    .eq('user_id', userId)
    .eq('guild_id', selectedGuildId)
    .maybeSingle();

  if (!wallet) {
    // Create wallet if not exists
    const { data: newWallet, error: createError } = await supabase
      .from('member_wallets')
      .insert({
        user_id: userId,
        guild_id: selectedGuildId,
        balance: 0,
      })
      .select('balance')
      .single();

    if (createError) {
      console.error('Wallet creation failed:', createError);
      return NextResponse.json({ error: 'wallet_creation_failed', details: createError.message }, { status: 500 });
    }
    wallet = newWallet;
  }

  console.log('Checkout debug:', { userId, selectedGuildId, serverId: server.id, total, wallet: wallet?.balance });

  if (wallet.balance < total) {
    return NextResponse.json({ error: 'insufficient_balance', required: total, available: wallet.balance }, { status: 400 });
  }

  // Create order with pending status
  const { data: order, error: orderError } = await supabase
    .from('store_orders')
    .insert({
      user_id: userId,
      server_id: server.id,
      items: orderItems,
      subtotal,
      discount_amount: discountAmount,
      amount: total,
      // Use first item's role/duration to satisfy NOT NULL constraints
      role_id: orderItems[0]?.role_id,
      duration_days: orderItems[0]?.duration_days,
      status: 'pending',
    })
    .select('id')
    .single();

  if (orderError) {
    console.error('Order creation failed:', orderError);
    // Return error details temporarily to help debugging schema/constraint issues
    return NextResponse.json({ error: 'order_failed', details: orderError.message ?? orderError }, { status: 500 });
  }

  // --- PRE-CHECK: validate roles and attempt assignment BEFORE deducting funds ---
  const assignedRoles: Array<{ roleId: string }> = [];
  try {
    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
      await supabase.from('store_orders').update({ status: 'failed', failure_reason: 'missing_bot_token' }).eq('id', order?.id);
      return NextResponse.json({ error: 'missing_bot_token' }, { status: 500 });
    }

    // fetch guild roles once
    const rolesRes = await discordFetch(`https://discord.com/api/guilds/${selectedGuildId}/roles`, { headers: { Authorization: `Bot ${botToken}` } }, { retries: 3 });
    if (!rolesRes.ok) {
      await supabase.from('store_orders').update({ status: 'failed', failure_reason: 'roles_fetch_failed' }).eq('id', order?.id);
      return NextResponse.json({ error: 'roles_fetch_failed' }, { status: 500 });
    }
    const rolesList = await rolesRes.json();

    // bot identity
    const meRes = await discordFetch('https://discord.com/api/users/@me', { headers: { Authorization: `Bot ${botToken}` } }, { retries: 2 });
    const me = meRes.ok ? await meRes.json().catch(() => null) : null;
    const botId = me?.id;
    let botMember = null;
    if (botId) {
      const botMemberRes = await discordFetch(`https://discord.com/api/guilds/${selectedGuildId}/members/${botId}`, { headers: { Authorization: `Bot ${botToken}` } }, { retries: 2 });
      if (botMemberRes.ok) botMember = await botMemberRes.json().catch(() => null);
    }

    // compute bot perms/position
    let botMaxPos = -1;
    let botPerms = BigInt(0);
    if (botMember && Array.isArray(botMember.roles)) {
      for (const rId of botMember.roles) {
        const r = (rolesList || []).find((x: any) => String(x.id) === String(rId));
        if (r) {
          botMaxPos = Math.max(botMaxPos, Number(r.position ?? 0));
          try { botPerms = botPerms | BigInt(r.permissions || 0); } catch (e) {}
        }
      }
    }
    const MANAGE_ROLES = BigInt(0x10000000);

    for (const it of orderItems) {
      if (!it.role_id) continue;
      const targetRole = (rolesList || []).find((r: any) => String(r.id) === String(it.role_id));
      if (!targetRole) {
        await supabase.from('store_orders').update({ status: 'failed', failure_reason: 'invalid_role_id' }).eq('id', order?.id);
        return NextResponse.json({ error: 'invalid_role_id', message: 'Ürün rolü sunucuda bulunamadı.' }, { status: 400 });
      }

      const targetPos = Number(targetRole.position ?? 0);
      if (botPerms && (botPerms & MANAGE_ROLES) !== MANAGE_ROLES) {
        await supabase.from('store_orders').update({ status: 'failed', failure_reason: 'bot_missing_manage_roles' }).eq('id', order?.id);
        return NextResponse.json({ error: 'bot_missing_manage_roles', message: 'Botun rol yönetimi yetkisi yok.' }, { status: 403 });
      }
      if (botMaxPos >= 0 && botMaxPos <= targetPos) {
        await supabase.from('store_orders').update({ status: 'failed', failure_reason: 'bot_role_hierarchy' }).eq('id', order?.id);
        return NextResponse.json({ error: 'bot_role_hierarchy', message: 'Botun rol hiyerarşisi yetmiyor.' }, { status: 403 });
      }

      // attempt to assign role
      const assignRes = await discordFetch(`https://discord.com/api/guilds/${selectedGuildId}/members/${userId}/roles/${it.role_id}`, { method: 'PUT', headers: { Authorization: `Bot ${botToken}` } }, { retries: 2 });
      if (!assignRes.ok) {
        const respText = await assignRes.text().catch(() => '');
        await supabase.from('store_orders').update({ status: 'failed', failure_reason: 'role_assign_failed', failure_code: assignRes.status, failure_response: respText }).eq('id', order?.id);

        // send system mail HTML
        try {
          const siteUrl = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || '';
          const normalizedSite = siteUrl ? siteUrl.replace(/\/$/, '') : '';
          const refundUrl = normalizedSite ? `${normalizedSite}/api/member/refund?orderId=${order?.id}` : null;
          const { refundButtonHtml } = await import('@/lib/mailHelpers');
          const buttonHtml = refundButtonHtml('role_assign_failed', refundUrl);
          const html = `<!doctype html><html><head><meta charset="utf-8"></head><body style="background:#0f1113;color:#e6eef8;font-family:Inter,system-ui,Arial;padding:20px"><div style="max-width:600px;margin:0 auto;background:#0b0c0d;padding:20px;border-radius:12px"><div style="display:flex;gap:12px;align-items:center"><div style="width:48px;height:48;border-radius:10px;background:linear-gradient(135deg,#5865F2,#8b5cf6);display:flex;align-items:center;justify-content:center;font-weight:800;color:#fff">FOX</div><div><div style="font-weight:800">🛠️ Sistem Raporu: İşlem Kesintisi Bildirimi</div><div style="color:#b9bbbe;font-size:13px">DiscoWeb</div></div></div><div style="margin-top:12px;background:#111214;padding:14px;border-radius:10px;line-height:1.6"><p>Merhaba, ben DiscoWeb Baş Geliştiricisi.</p><p>Satın alma teslimatı sırasında bir hata oluştu. Ödeme düşülmeden önce rol verme işlemi başarısız oldu.</p><div style="font-family:Courier New,monospace;background:rgba(255,255,255,0.02);padding:12px;border-radius:8px;margin-top:12px">Durum: <strong>FAILED_TO_DELIVER</strong><br>Hata Kodu: <strong>ROLE_ASSIGN_FAILED</strong><br>HTTP: ${assignRes.status}</div><p style="margin-top:12px">Aşağıdaki butonu kullanarak iade talebini başlatabilirsin.</p><div style="margin-top:10px">${buttonHtml}</div><p style="margin-top:12px;color:#9aa0a6">Yaşanan aksaklık için üzgünüz.</p></div></div></body></html>`;
          await supabase.from('system_mails').insert({ guild_id: selectedGuildId, user_id: userId, title: '🛠️ Sistem Raporu: İşlem Kesintisi Bildirimi', body: html, category: 'system', status: 'published', author_name: 'DiscoWeb Baş Geliştiricisi', created_at: new Date().toISOString() });
        } catch (e) {
          console.warn('Failed to insert delivery-failure mail', e);
        }

        return NextResponse.json({ error: 'role_assign_failed', message: 'Rol teslimatı başarısız oldu. Para düşülmedi.' }, { status: 400 });
      }

      assignedRoles.push({ roleId: it.role_id });
    }
  } catch (err) {
    console.error('Role pre-check error:', err);
    await supabase.from('store_orders').update({ status: 'failed', failure_reason: 'role_precheck_error' }).eq('id', order?.id);
    return NextResponse.json({ error: 'role_precheck_error' }, { status: 500 });
  }

  // Attempt to atomically deduct from wallet only if enough balance
  const { data: updatedWallet, error: walletUpdateError } = await supabase
    .from('member_wallets')
    .update({ balance: wallet.balance - total, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('guild_id', selectedGuildId)
    .filter('balance', 'gte', total)
    .select('balance')
    .single();

  if (walletUpdateError || !updatedWallet) {
    console.error('Wallet deduction failed:', walletUpdateError);
    // Rollback order if wallet deduction fails (e.g., concurrent spend or insufficient funds)
    // attempt to remove roles we assigned during pre-check
    try {
      const botToken = process.env.DISCORD_BOT_TOKEN;
      if (botToken) {
        for (const r of assignedRoles) {
          await fetch(`https://discord.com/api/guilds/${selectedGuildId}/members/${userId}/roles/${r.roleId}`, { method: 'DELETE', headers: { Authorization: `Bot ${botToken}` } }).catch(() => null);
        }
      }
    } catch (e) {
      console.warn('Failed to rollback roles after wallet failure', e);
    }

    await supabase.from('store_orders').delete().eq('id', order?.id);
    return NextResponse.json({ error: 'insufficient_balance', required: total, available: wallet.balance }, { status: 400 });
  }

  // Mark order as paid
  await supabase.from('store_orders').update({ status: 'paid', applied_at: new Date().toISOString() }).eq('id', order.id);

  // Fetch updated order for mail
  const { data: updatedOrder } = await supabase
    .from('store_orders')
    .select('id, applied_at, created_at')
    .eq('id', order.id)
    .single();

  if (!updatedOrder) {
    console.error('Failed to fetch updated order for mail');
    return NextResponse.json({ success: true });
  }

  // Add wallet ledger entry
  await supabase.from('wallet_ledger').insert({
    user_id: userId,
    guild_id: selectedGuildId,
    amount: -total,
    type: 'purchase',
    balance_after: updatedWallet.balance,
    metadata: {
      order_id: order.id,
      description: `Store purchase - Order #${order.id}`,
    },
  });

  // Mark discount as used if applied
  if (discountId) {
    await supabase.from('discount_usages').insert({
      discount_id: discountId,
      user_id: userId,
      order_id: order.id,
    });
  }

  // Send professional receipt to notifications
  let mailInserted = false;
  let mailInsertError: string | null = null;
  try {
    const getDiscordUser = async (uid: string) => {
      try {
        const botToken = process.env.DISCORD_BOT_TOKEN;
        if (!botToken) return null;
        const res = await fetch(`https://discord.com/api/users/${uid}`, { headers: { Authorization: `Bot ${botToken}` } });
        if (!res.ok) return null;
        const u = await res.json();
        return { username: u.username, avatar: u.avatar ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png` : null };
      } catch (e) {
        return null;
      }
    };

    const userInfo = await getDiscordUser(userId);
    const purchaseDate = new Date(updatedOrder.applied_at ?? updatedOrder.created_at ?? Date.now()).toLocaleString('tr-TR', { dateStyle: 'long', timeStyle: 'short' } as Intl.DateTimeFormatOptions);

    const lines: string[] = [];
    lines.push(`Sayın @${userInfo?.username ?? userId},`);
    lines.push('');
    lines.push(`${purchaseDate} tarihinde gerçekleştirdiğiniz satın alma işlemi başarıyla tamamlandı.`);
    lines.push('');
    lines.push(`Sipariş No: ${updatedOrder.id}`);
    lines.push('');
    lines.push('Ürünler:');
    for (const it of orderItems) {
      lines.push(`• ${it.title} x${it.qty} — ${Number(it.price).toFixed(2)} each, toplam ${Number(it.total).toFixed(2)} Papel`);
    }
    lines.push('');
    lines.push(`Ara Toplam: ${Number(subtotal).toFixed(2)} Papel`);
    lines.push(`İndirim: ${Number(discountAmount ?? 0).toFixed(2)} Papel`);
    lines.push(`Toplam Ödenen: ${Number(total).toFixed(2)} Papel`);
    lines.push('');
    // Ödeme yöntemi ve hesap bakiyesi artık bildirime eklenmiyor
    lines.push('Fişiniz tarafınıza iletilmiştir. İyi günlerde kullanın.');

    const receiptBody = lines.join('\n');

    const { error: mailErr } = await supabase.from('system_mails').insert({
      guild_id: selectedGuildId,
      user_id: userId,
      title: `Sipariş Onayı`,
      body: receiptBody,
      category: 'reward',
      status: 'published',
      created_at: new Date().toISOString(),
      author_name: userInfo?.username ?? null,
      author_avatar_url: userInfo?.avatar ?? null,
    });
    if (mailErr) {
      mailInsertError = String(mailErr.message ?? JSON.stringify(mailErr));
      console.error('Receipt mail error:', mailErr);
    } else {
      mailInserted = true;
      console.log(`Receipt mail saved for ${userId} (order ${updatedOrder.id})`);
    }
  } catch {
    console.error('Receipt notification failed');
  }

  return NextResponse.json({ success: true, orderId: order.id, newBalance: updatedWallet.balance, mailInserted, mailInsertError });
}
