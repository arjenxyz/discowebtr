import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { logWebEvent } from '@/lib/serverLogger';

const GUILD_ID = process.env.DISCORD_GUILD_ID ?? '1465698764453838882';
const DEFAULT_SLUG = 'default';

const getSelectedGuildId = async (): Promise<string> => {
  const cookieStore = await cookies();
  const selectedGuildId = cookieStore.get('selected_guild_id')?.value;
  return selectedGuildId || GUILD_ID; // Fallback to default
};

const getSupabase = () => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
};

const isAdminUser = async () => {
  try {
    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
      console.log('store-orders isAdminUser: No bot token');
      return false;
    }

    const cookieStore = await cookies();
    const userId = cookieStore.get('discord_user_id')?.value;
    const selectedGuildId = cookieStore.get('selected_guild_id')?.value;
    if (!userId || !selectedGuildId) {
      console.log('store-orders isAdminUser: Missing user ID or guild ID', { userId, selectedGuildId });
      return false;
    }

    // Get admin role from server configuration
    const supabase = getSupabase();
    if (!supabase) {
      console.log('store-orders isAdminUser: No supabase client');
      return false;
    }

    const { data: server } = await supabase
      .from('servers')
      .select('admin_role_id')
      .eq('discord_id', selectedGuildId)
      .maybeSingle();

    console.log('store-orders isAdminUser: Server data:', server);

    if (!server?.admin_role_id) {
      console.log('store-orders isAdminUser: No admin role ID found');
      return false;
    }

    console.log('store-orders isAdminUser: Admin role ID:', server.admin_role_id);

    // Check Discord API for user roles
    const memberResponse = await fetch(`https://discord.com/api/guilds/${selectedGuildId}/members/${userId}`, {
      headers: { Authorization: `Bot ${botToken}` },
    });

    console.log('store-orders isAdminUser: Member response status:', memberResponse.status);

    if (!memberResponse.ok) {
      console.log('store-orders isAdminUser: Member response not ok');
      return false;
    }

    const member = (await memberResponse.json()) as { roles: string[] };
    console.log('store-orders isAdminUser: Member roles:', member.roles);
    const hasRoleResult = member.roles.includes(server.admin_role_id);
    console.log('store-orders isAdminUser: Has admin role:', hasRoleResult);

    return hasRoleResult;
  } catch (error) {
    console.error('store-orders isAdminUser: Admin check failed:', error);
    return false;
  }
};

const getDiscordUser = async (userId: string) => {
  try {
    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
      return null;
    }

    const response = await fetch(`https://discord.com/api/users/${userId}`, {
      headers: { Authorization: `Bot ${botToken}` },
    });

    if (!response.ok) {
      return null;
    }

    const user = await response.json();
    return {
      id: user.id,
      username: user.username,
      avatar: user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : null,
    };
  } catch (error) {
    console.error('Failed to fetch Discord user:', error);
    return null;
  }
};

const checkUserHasRole = async (userId: string, roleId: string) => {
  try {
    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
      return false;
    }

    const selectedGuildId = await getSelectedGuildId();
    const memberResponse = await fetch(`https://discord.com/api/guilds/${selectedGuildId}/members/${userId}`, {
      headers: { Authorization: `Bot ${botToken}` },
    });

    if (!memberResponse.ok) {
      return false;
    }

    const member = (await memberResponse.json()) as { roles: string[] };
    return member.roles.includes(roleId);
  } catch (error) {
    console.error('Failed to check user role:', error);
    return false;
  }
};

const getAdminId = async () => {
  const cookieStore = await cookies();
  return cookieStore.get('discord_user_id')?.value ?? null;
};

const resolveServerId = async (supabase: SupabaseClient) => {
  const selectedGuildId = await getSelectedGuildId();

  const { data: byDiscord } = await supabase
    .from('servers')
    .select('id')
    .eq('discord_id', selectedGuildId)
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

const getBalance = async (supabase: SupabaseClient, userId: string, serverId: string) => {
  const { data } = (await supabase
    .from('member_wallets')
    .select('balance')
    .eq('guild_id', serverId)
    .eq('user_id', userId)
    .maybeSingle()) as unknown as { data: { balance?: number } | null };

  return Number(data?.balance ?? 0);
};

const setBalance = async (supabase: SupabaseClient, userId: string, balance: number, serverId: string) => {
  const { data, error } = await supabase.from('member_wallets').upsert(
    {
      guild_id: serverId,
      user_id: userId,
      balance,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'guild_id,user_id' },
  );
  console.log('setBalance result:', { data, error });
  return { data, error };
};

export async function GET(request: Request) {
  console.log('🔍 GET /api/admin/store-orders called');
  if (!(await isAdminUser())) {
    console.log('❌ User is not admin');
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    console.log('❌ Supabase not available');
    return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });
  }

  const serverId = await resolveServerId(supabase);
  console.log('🔍 Resolved serverId:', serverId);
  if (!serverId) {
    console.log('❌ Server ID not found');
    return NextResponse.json({ error: 'server_not_found' }, { status: 404 });
  }

  const url = new URL(request.url);
  const mode = url.searchParams.get('mode');

  const selectFields = 'id,user_id,amount,status,created_at,item_title,role_id,duration_days,applied_at,failure_reason';

  const mapOrders = async (orders: Array<Record<string, unknown>> | null) => {
    if (!orders || orders.length === 0) return [];

    const ordersWithUsers = await Promise.all(
      orders.map(async (order) => {
        try {
          console.log('🔍 Processing order:', order.id);
          const user = await getDiscordUser(order.user_id as string);
          console.log('🔍 User fetched:', user?.username);
          const hasRole = await checkUserHasRole(order.user_id as string, order.role_id as string);
          console.log('🔍 Role checked:', hasRole);
          const itemTitle =
            (order as { item_title?: string | null }).item_title ?? null;
          
          // Get error details from error_logs if failure_reason exists
          let errorDetails = null;
          if (order.failure_reason) {
            const { data: errorLog } = await supabase
              .from('error_logs')
              .select('title,description,severity,context,created_at')
              .eq('error_code', order.failure_reason)
              .eq('order_id', order.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            
            if (errorLog) {
              errorDetails = {
                title: errorLog.title,
                description: errorLog.description,
                severity: errorLog.severity,
                context: errorLog.context,
                logged_at: errorLog.created_at
              };
            }
          }
          
          return {
            ...order,
            item_title: (order as { item_title?: string | null }).item_title ?? itemTitle,
            user: user || { id: order.user_id, username: 'Unknown User', avatar: null },
            has_role: hasRole,
            error_details: errorDetails
          };
        } catch (err) {
          console.error('❌ Error processing order:', order.id, err);
          return {
            ...order,
            item_title: (order as { item_title?: string | null }).item_title ?? null,
            user: { id: order.user_id, username: 'Error User', avatar: null },
            has_role: false,
            error_details: null
          };
        }
      })
    );

    return ordersWithUsers;
  };

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

    return NextResponse.json(await mapOrders(data as Array<Record<string, unknown>>));
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

    return NextResponse.json(await mapOrders(data as Array<Record<string, unknown>>));
  }

  if (mode === 'failed') {
    const { data, error } = await supabase
      .from('store_orders')
      .select(selectFields)
      .eq('server_id', serverId)
      .eq('status', 'failed')
      .or('failure_reason.not.is.null') // Failure kayıtları
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
    }

    return NextResponse.json(await mapOrders(data as Array<Record<string, unknown>>));
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

  console.log('🔍 Pending query result:', { error: pendingResult.error, count: pendingResult.data?.length });
  console.log('🔍 Stuck query result:', { error: stuckResult.error, count: stuckResult.data?.length });

  if (pendingResult.error || stuckResult.error) {
    console.error('🔍 Query errors:', { pending: pendingResult.error, stuck: stuckResult.error });
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }

  return NextResponse.json({
    pending: await mapOrders(pendingResult.data as Array<Record<string, unknown>>),
    stuck: await mapOrders(stuckResult.data as Array<Record<string, unknown>>),
  });
}

export async function POST(request: Request) {
  console.log('🔄 Store orders POST request received');
  if (!(await isAdminUser())) {
    console.log('❌ User is not admin');
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    console.log('❌ Supabase not available');
    return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });
  }

  const serverId = await resolveServerId(supabase);
  if (!serverId) {
    console.log('❌ Server ID not found');
    return NextResponse.json({ error: 'server_not_found' }, { status: 404 });
  }

  const adminId = await getAdminId();
  const selectedGuildId = await getSelectedGuildId();
  const adminUser = adminId ? await getDiscordUser(adminId) : null;
  const payload = (await request.json()) as {
    orderId?: string;
    action?: 'approve' | 'reject' | 'refund';
    reason?: string;
  };

  if (!payload.orderId || !payload.action) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  const { data: order } = (await supabase
    .from('store_orders')
    .select('id,user_id,amount,status,created_at')
    .eq('id', payload.orderId)
    .eq('server_id', serverId)
    .maybeSingle()) as unknown as { data: { id: string; user_id: string; amount: number; status: string; created_at: string } | null };

  if (!order) {
    return NextResponse.json({ error: 'order_not_found' }, { status: 404 });
  }

  if (payload.action === 'approve') {
    if (order.status !== 'pending') {
      return NextResponse.json({ error: 'invalid_status' }, { status: 400 });
    }
    await supabase
      .from('store_orders')
      .update({ status: 'paid', applied_at: null, failure_reason: null })
      .eq('id', order.id);

    await logWebEvent(request, {
      event: 'admin_store_order_approve',
      status: 'success',
      userId: adminId ?? undefined,
      guildId: selectedGuildId,
      metadata: {
        orderId: order.id,
        targetUserId: order.user_id,
        amount: order.amount,
        actorName: adminUser?.username ?? null,
        actorAvatarUrl: adminUser?.avatar ?? null,
      },
    });

    return NextResponse.json({ status: 'ok' });
  }

  if (payload.action === 'reject') {
    console.log(`🔄 Processing reject action for order ${order.id}`);
    if (order.status !== 'pending') {
      console.log(`❌ Invalid status for reject: ${order.status}`);
      return NextResponse.json({ error: 'invalid_status' }, { status: 400 });
    }

    const failureReason = payload.reason?.trim() || 'Admin tarafından reddedildi';
    await supabase
      .from('store_orders')
      .update({ status: 'failed', failure_reason: failureReason })
      .eq('id', order.id);

  const currentBalance = await getBalance(supabase, order.user_id, serverId);
  const nextBalance = Number((currentBalance + Number(order.amount)).toFixed(2));
  console.log(`💰 Balance update: ${currentBalance} -> ${nextBalance} for user ${order.user_id}`);
  const { data: balanceData, error: balanceError } = await setBalance(supabase, order.user_id, nextBalance, serverId);
  console.log('Balance update result:', { balanceData, balanceError });
  if (balanceError) {
    console.error('Failed to update balance:', balanceError);
    return NextResponse.json({ error: 'balance_update_failed' }, { status: 500 });
  }
  await (supabase.from('wallet_ledger') as unknown as {
    insert: (values: Record<string, unknown>) => Promise<unknown>;
  }).insert({
    guild_id: serverId,
    user_id: order.user_id,
    amount: Number(order.amount),
    type: 'refund',
    balance_after: nextBalance,
    metadata: { orderId: order.id, reason: failureReason },
  });

  await logWebEvent(request, {
    event: 'admin_store_order_manual_refund',
    status: 'success',
    userId: adminId ?? undefined,
    guildId: selectedGuildId,
    metadata: {
      orderId: order.id,
      targetUserId: order.user_id,
      amount: order.amount,
      reason: failureReason,
      actorName: adminUser?.username ?? null,
      actorAvatarUrl: adminUser?.avatar ?? null,
    },
  });

  // Send web notification to user
  if (adminUser) {
    console.log(`📧 Sending notification to user ${order.user_id}`);
    try {
      const userInfo = await getDiscordUser(order.user_id);
      const purchaseDate = new Date(order.created_at).toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const { error: notificationError } = await supabase.from('notifications').insert({
        guild_id: serverId,
        target_user_id: order.user_id,
          title: 'Sipariş Reddedildi - Tutar İade Edildi',
          body: `Sayın @${userInfo?.username || 'Kullanıcı'},

${purchaseDate} tarihinde gerçekleştirmiş olduğunuz satın alım işlemi, ilgili birimlerimiz tarafından incelenmiştir. Yapılan değerlendirmeler sonucunda, işleminiz "${failureReason}" gerekçesiyle onaylanamamıştır.

Söz konusu işleme ait ${Number(order.amount).toFixed(2)} Papel tutarındaki iadeniz, hesabınıza tanımlanmıştır. Kararın hatalı olduğunu düşünüyorsanız veya destek almak isterseniz, lütfen bizimle iletişime geçmekten çekinmeyiniz.

Saygılarımızla,
Destek Yönetimi`,
        type: 'mail',
        author_name: adminUser.username,
        author_avatar_url: adminUser.avatar,
      });
      if (notificationError) {
        console.error('Failed to send web notification:', notificationError);
      } else {
        console.log('✅ Web notification sent successfully');
      }
    } catch (error) {
      console.error('Error sending web notification:', error);
    }
  } else {
    console.warn('No admin user found for notification');
  }

  return NextResponse.json({ status: 'ok', balance: nextBalance });
  }

  if (payload.action === 'refund') {
    if (order.status !== 'failed') {
      return NextResponse.json({ error: 'invalid_status' }, { status: 400 });
    }

    // Update order status to refunded
    await supabase
      .from('store_orders')
      .update({ status: 'refunded', failure_reason: null })
      .eq('id', order.id);

    // Restore balance
    const currentBalance = await getBalance(supabase, order.user_id, serverId);
    const nextBalance = Number((currentBalance + Number(order.amount)).toFixed(2));
    console.log(`💰 Refund balance update: ${currentBalance} -> ${nextBalance} for user ${order.user_id}`);
    const { data: balanceData, error: balanceError } = await setBalance(supabase, order.user_id, nextBalance, serverId);
    console.log('Refund balance update result:', { balanceData, balanceError });
    if (balanceError) {
      console.error('Failed to update balance for refund:', balanceError);
      return NextResponse.json({ error: 'balance_update_failed' }, { status: 500 });
    }

    // Add ledger entry
    await (supabase.from('wallet_ledger') as unknown as {
      insert: (values: Record<string, unknown>) => Promise<unknown>;
    }).insert({
      guild_id: serverId,
      user_id: order.user_id,
      amount: Number(order.amount),
      type: 'refund',
      balance_after: nextBalance,
      metadata: { orderId: order.id, reason: 'Failed order refund' },
    });

    // Send web notification to user
    if (adminUser) {
      console.log(`📧 Sending refund notification to user ${order.user_id}`);
      try {
        const userInfo = await getDiscordUser(order.user_id);
        const purchaseDate = new Date(order.created_at).toLocaleDateString('tr-TR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        const refundDate = new Date().toLocaleDateString('tr-TR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        const { error: notificationError } = await supabase.from('notifications').insert({
          guild_id: serverId,
          target_user_id: order.user_id,
          title: 'Sipariş Başarısız - Tutar İade Edildi',
          body: `Sayın @${userInfo?.username || 'Kullanıcı'},

${purchaseDate} tarihinde gerçekleştirmiş olduğunuz satın alım işlemi, ilgili birimlerimiz tarafından incelenmiştir. Yapılan değerlendirmeler sonucunda, işleminiz teknik bir sorun nedeniyle ${refundDate} tarihinde gerçekleştirilememiştir.

Söz konusu işleme ait ${Number(order.amount).toFixed(2)} Papel tutarındaki iadeniz, hesabınıza tanımlanmıştır. Kararın hatalı olduğunu düşünüyorsanız veya destek almak isterseniz, lütfen bizimle iletişime geçmekten çekinmeyiniz.

Saygılarımızla,
Destek Yönetimi`,
          type: 'mail',
          author_name: adminUser.username,
          author_avatar_url: adminUser.avatar,
        });
        if (notificationError) {
          console.error('Failed to send refund web notification:', notificationError);
        } else {
          console.log('✅ Refund web notification sent successfully');
        }
      } catch (error) {
        console.error('Error sending refund web notification:', error);
      }
    } else {
      console.warn('No admin user found for refund notification');
    }

    await logWebEvent(request, {
      event: 'admin_store_order_refund',
      status: 'success',
      userId: adminId ?? undefined,
      guildId: selectedGuildId,
      metadata: {
        orderId: order.id,
        targetUserId: order.user_id,
        amount: order.amount,
        actorName: adminUser?.username ?? null,
        actorAvatarUrl: adminUser?.avatar ?? null,
      },
    });

    return NextResponse.json({ status: 'ok', balance: nextBalance });
  }

  return NextResponse.json({ error: 'invalid_action' }, { status: 400 });
}