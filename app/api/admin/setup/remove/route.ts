import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
  return selectedGuildId || '1465698764453838882'; // Fallback
};

const isAdminUser = async () => {
  try {
    const botToken = process.env.DISCORD_TOKEN;
    if (!botToken) {
      console.warn('❌ Admin check failed: DISCORD_TOKEN is missing');
      return false;
    }

    const cookieStore = await cookies();
    const userId = cookieStore.get('discord_user_id')?.value;
    const selectedGuildId = cookieStore.get('selected_guild_id')?.value;
    if (!userId || !selectedGuildId) {
      console.warn('❌ Admin check failed: missing userId or selectedGuildId', {
        hasUserId: !!userId,
        hasSelectedGuildId: !!selectedGuildId
      });
      return false;
    }

    // Get admin role from server configuration
    const supabase = getSupabase();
    if (!supabase) {
      return false;
    }

    const { data: server } = await supabase
      .from('servers')
      .select('admin_role_id')
      .eq('discord_id', selectedGuildId)
      .single();

    if (!server?.admin_role_id) {
      console.warn('❌ Admin check failed: admin_role_id not found for guild', selectedGuildId);
      return false;
    }

    // Check if user has admin role
    const memberResponse = await fetch(`https://discord.com/api/guilds/${selectedGuildId}/members/${userId}`, {
      headers: { Authorization: `Bot ${botToken}` },
    });

    if (!memberResponse.ok) {
      const errorText = await memberResponse.text();
      console.warn('❌ Admin check failed: Discord member fetch failed', {
        status: memberResponse.status,
        statusText: memberResponse.statusText,
        body: errorText
      });
      return false;
    }

    const member = await memberResponse.json();
    return member.roles.includes(server.admin_role_id);
  } catch (error) {
    console.error('Admin check failed:', error);
    return false;
  }
};

export async function GET() {
  console.log('🔍 Setup remove preview request received');

  if (!(await isAdminUser())) {
    console.log('❌ User is not admin');
    return NextResponse.json({ error: 'Bu işlem için yönetici yetkiniz bulunmuyor.' }, { status: 403 });
  }

  const supabase = getSupabase();
  console.log('🔍 Supabase client created:', !!supabase);
  if (!supabase) {
    console.log('❌ Supabase not available');
    return NextResponse.json({ error: 'Veritabanı bağlantısı kurulamadı.' }, { status: 500 });
  }

  const guildId = await getSelectedGuildId();

  // Get server record to find server_id (UUID) for tables that reference it
  const { data: server } = await supabase
    .from('servers')
    .select('id')
    .eq('discord_id', guildId)
    .single();

  console.log('🔍 Guild ID from cookie:', guildId);
  console.log('🔍 Server lookup result:', server);

  if (!server) {
    console.log('❌ Server not found for guild:', guildId);
    return NextResponse.json({ error: 'Sunucu bulunamadı.' }, { status: 404 });
  }

  const serverId = server.id;

  // Get preview of what will be deleted
  try {
    console.log('🔍 Getting removal preview for guild:', guildId, 'server:', serverId);

    // Get Discord channels and webhooks
    const { data: botLogChannels } = await supabase
      .from('bot_log_channels')
      .select('channel_id, category_id, channel_type, webhook_url, is_active')
      .eq('guild_id', guildId);

    const { data: logChannelConfigs } = await supabase
      .from('log_channel_configs')
      .select('channel_type, webhook_url')
      .eq('guild_id', guildId)
      .eq('is_active', true);

    console.log('🔍 Bot log channels found:', botLogChannels?.length || 0);
    console.log('🔍 Log channel configs found:', logChannelConfigs?.length || 0);
    if (botLogChannels?.length) {
      console.log('🔍 Bot log channel details:', botLogChannels.map(c => ({
        type: c.channel_type,
        channelId: c.channel_id,
        categoryId: c.category_id,
        webhook: c.webhook_url ? 'yes' : 'no',
        isActive: c.is_active
      })));
    }

    // Get database table counts
    const tableCounts = await Promise.all([
      supabase.from('store_orders').select('id', { count: 'exact', head: true }).eq('server_id', serverId),
      supabase.from('store_items').select('id', { count: 'exact', head: true }).eq('server_id', serverId),
      supabase.from('promotions').select('id', { count: 'exact', head: true }).eq('server_id', serverId),
      supabase.from('wallet_ledger').select('id', { count: 'exact', head: true }).eq('guild_id', guildId),
      supabase.from('member_wallets').select('id', { count: 'exact', head: true }).eq('guild_id', guildId),
      supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('guild_id', guildId),
      supabase.from('maintenance_flags').select('id', { count: 'exact', head: true }).eq('server_id', serverId),
    ]);

    console.log('🔍 Raw table counts results:', tableCounts);
    console.log('🔍 Table counts with details:', tableCounts.map((result, index) => ({
      table: ['store_orders', 'store_items', 'promotions', 'wallet_ledger', 'member_wallets', 'notifications', 'maintenance_flags'][index],
      count: result.count,
      error: result.error,
      status: result.status
    })));

    const mergedWebhooks = [
      ...(botLogChannels?.filter(c => c.webhook_url).map(c => ({
        type: c.channel_type,
        url: c.webhook_url
      })) || []),
      ...(logChannelConfigs?.filter(c => c.webhook_url).map(c => ({
        type: c.channel_type,
        url: c.webhook_url
      })) || [])
    ];

    const webhookMap = new Map<string, { type: string; url: string }>();
    for (const hook of mergedWebhooks) {
      if (hook.url) {
        webhookMap.set(hook.url, hook);
      }
    }

    const preview = {
      discord: {
        categories: [
          { name: '💠Web Logs • Üyeler', id: botLogChannels?.find(c => c.channel_type?.startsWith('user_'))?.category_id ?? null },
          { name: '💠Web Logs • Admin', id: botLogChannels?.find(c => c.channel_type?.startsWith('admin_'))?.category_id ?? null },
        ].filter((entry) => entry.id),
        channels: botLogChannels?.filter(c => c.channel_id).map(c => ({
          type: c.channel_type,
          name: `${c.channel_type} kanalı`,
          id: c.channel_id
        })) || [],
        webhooks: Array.from(webhookMap.values())
      },
      database: {
        store_orders: tableCounts[0].count || 0,
        store_items: tableCounts[1].count || 0,
        promotions: tableCounts[2].count || 0,
        wallet_ledger: tableCounts[3].count || 0,
        member_wallets: tableCounts[4].count || 0,
        notifications: tableCounts[5].count || 0,
        maintenance_flags: tableCounts[6].count || 0,
        total: (tableCounts.reduce((sum, result) => sum + (result.count || 0), 0)) + 1 // +1 for server record
      }
    };

    return NextResponse.json({
      preview,
      message: 'Silinecek öğelerin önizlemesi başarıyla alındı.'
    });

  } catch (error) {
    console.error('❌ Preview error:', error);
    return NextResponse.json(
      { error: 'Önizleme alınırken hata oluştu.' },
      { status: 500 }
    );
  }
}

export async function POST() {
  console.log('🗑️ Setup remove request received');

  if (!(await isAdminUser())) {
    console.log('❌ User is not admin');
    return NextResponse.json({ error: 'Bu işlem için yönetici yetkiniz bulunmuyor.' }, { status: 403 });
  }

  const supabase = getSupabase();
  console.log('🗑️ Supabase client created:', !!supabase);
  if (!supabase) {
    console.log('❌ Supabase not available');
    return NextResponse.json({ error: 'Veritabanı bağlantısı kurulamadı.' }, { status: 500 });
  }

  const guildId = await getSelectedGuildId();

  // Get server record to find server_id (UUID) for tables that reference it
  const { data: server } = await supabase
    .from('servers')
    .select('id')
    .eq('discord_id', guildId)
    .single();

  console.log('🗑️ Guild ID from cookie:', guildId);
  console.log('🗑️ Server lookup result:', server);

  if (!server) {
    console.log('❌ Server not found for guild:', guildId);
    return NextResponse.json({ error: 'Sunucu bulunamadı.' }, { status: 404 });
  }

  const serverId = server.id;

  try {
    console.log('🗑️ Removing setup for guild:', guildId, 'server:', serverId);
    console.log('🗑️ Expected categories: 💠Web Logs • Üyeler, 💠Web Logs • Admin');

    // First, get all Discord channel IDs and webhook URLs to delete
    const { data: botLogChannels } = await supabase
      .from('bot_log_channels')
      .select('channel_id, category_id, channel_type, webhook_url, is_active')
      .eq('guild_id', guildId);

    const { data: logChannelConfigs } = await supabase
      .from('log_channel_configs')
      .select('channel_type, webhook_url')
      .eq('guild_id', guildId)
      .eq('is_active', true);

    console.log('🗑️ Bot log channels for deletion:', botLogChannels?.length || 0);
    console.log('🗑️ Log channel configs for deletion:', logChannelConfigs?.length || 0);
    if (botLogChannels?.length) {
      console.log('🗑️ Bot log channel details for deletion:', botLogChannels.map(c => ({
        channelId: c.channel_id,
        categoryId: c.category_id,
        webhook: c.webhook_url ? 'yes' : 'no',
        isActive: c.is_active
      })));
    }

    const botToken = process.env.DISCORD_TOKEN;
    const discordCleanupResults: { channelsDeleted: number; webhooksDeleted: number; errors: string[] } = { channelsDeleted: 0, webhooksDeleted: 0, errors: [] };

    if (botToken) {
      console.log('🗑️ Cleaning up Discord channels and webhooks...');

      // Delete Discord channels (from bot_log_channels)
      for (const config of botLogChannels || []) {
        if (config.channel_id) {
          try {
            const deleteResponse = await fetch(
              `https://discord.com/api/v10/channels/${config.channel_id}`,
              {
                method: 'DELETE',
                headers: { Authorization: `Bot ${botToken}` },
              }
            );

            if (deleteResponse.ok) {
              console.log(`✅ Deleted Discord channel: ${config.channel_id}`);
              discordCleanupResults.channelsDeleted++;
            } else if (deleteResponse.status === 404) {
              console.log(`⚠️ Channel already deleted: ${config.channel_id}`);
            } else {
              const errorText = await deleteResponse.text();
              console.error(`❌ Failed to delete channel ${config.channel_id}:`, errorText);
              discordCleanupResults.errors.push(`Channel ${config.channel_id}: ${errorText}`);
            }
          } catch (error) {
            console.error(`❌ Error deleting channel ${config.channel_id}:`, error);
            discordCleanupResults.errors.push(`Channel ${config.channel_id}: ${String(error)}`);
          }
        }
      }

      // Delete categories after channels (unique set)
      const categoryIds = Array.from(new Set((botLogChannels || [])
        .map(c => c.category_id)
        .filter(Boolean)));

      for (const categoryId of categoryIds) {
        try {
          const deleteResponse = await fetch(
            `https://discord.com/api/v10/channels/${categoryId}`,
            {
              method: 'DELETE',
              headers: { Authorization: `Bot ${botToken}` },
            }
          );

          if (deleteResponse.ok) {
            console.log(`✅ Deleted Discord category: ${categoryId}`);
            discordCleanupResults.channelsDeleted++;
          } else if (deleteResponse.status === 404) {
            console.log(`⚠️ Category already deleted: ${categoryId}`);
          } else {
            const errorText = await deleteResponse.text();
            console.error(`❌ Failed to delete category ${categoryId}:`, errorText);
            discordCleanupResults.errors.push(`Category ${categoryId}: ${errorText}`);
          }
        } catch (error) {
          console.error(`❌ Error deleting category ${categoryId}:`, error);
          discordCleanupResults.errors.push(`Category ${categoryId}: ${String(error)}`);
        }
      }

      // Delete webhooks (from both tables)
      const webhookUrls = [
        ...(botLogChannels || []).map(c => c.webhook_url).filter(Boolean),
        ...(logChannelConfigs || []).map(c => c.webhook_url).filter(Boolean)
      ];

      for (const webhookUrl of webhookUrls) {
        try {
          const webhookMatch = webhookUrl.match(/https:\/\/discord\.com\/api\/webhooks\/(\d+)\/(.+)/);
          if (webhookMatch) {
            const [, webhookId, webhookToken] = webhookMatch;
            const deleteResponse = await fetch(
              `https://discord.com/api/v10/webhooks/${webhookId}/${webhookToken}`,
              { method: 'DELETE' }
            );

            if (deleteResponse.ok) {
              console.log(`✅ Deleted webhook: ${webhookId}`);
              discordCleanupResults.webhooksDeleted++;
            } else if (deleteResponse.status === 404) {
              console.log(`⚠️ Webhook already deleted: ${webhookId}`);
            } else {
              const errorText = await deleteResponse.text();
              console.error(`❌ Failed to delete webhook ${webhookId}:`, errorText);
              discordCleanupResults.errors.push(`Webhook ${webhookId}: ${errorText}`);
            }
          }
        } catch (error) {
          console.error(`❌ Error deleting webhook for ${webhookUrl}:`, error);
          discordCleanupResults.errors.push(`Webhook ${webhookUrl}: ${String(error)}`);
        }
      }

      console.log(`🗑️ Discord cleanup complete: ${discordCleanupResults.channelsDeleted} channels, ${discordCleanupResults.webhooksDeleted} webhooks deleted`);
    }

    // Collect notification ids for reads cleanup
    const { data: notificationsForDelete } = await supabase
      .from('notifications')
      .select('id')
      .eq('guild_id', guildId);

    const notificationIds = (notificationsForDelete || []).map(n => n.id);
    if (notificationIds.length > 0) {
      console.log('🗑️ Notification IDs for reads cleanup:', notificationIds.length);
    }

    // Delete in order to avoid foreign key constraints
    const tableNames = [
      'store_orders',
      'store_items',
      'promotions',
      'wallet_ledger',
      'member_wallets',
      'member_profiles',
      'notifications',
      'notification_reads',
      'log_channel_configs',
      'bot_log_channels',
      'maintenance_flags',
      'servers'
    ];

    const deleteOperations = [
      // Delete store orders first (references store items)
      supabase.from('store_orders').delete().eq('server_id', serverId),
      // Delete store items
      supabase.from('store_items').delete().eq('server_id', serverId),
      // Delete promotions
      supabase.from('promotions').delete().eq('server_id', serverId),
      // Delete wallet ledger
      supabase.from('wallet_ledger').delete().eq('guild_id', guildId),
      // Delete member wallets
      supabase.from('member_wallets').delete().eq('guild_id', guildId),
      // Delete member profiles
      supabase.from('member_profiles').delete().eq('guild_id', guildId),
      // Delete notifications
      supabase.from('notifications').delete().eq('guild_id', guildId),
      // Delete notification reads
      notificationIds.length > 0
        ? supabase.from('notification_reads').delete().in('notification_id', notificationIds)
        : Promise.resolve({ data: null, error: null }),
      // Delete log channel configs
      supabase.from('log_channel_configs').delete().eq('guild_id', guildId).eq('is_active', true),
      // Delete bot log channels
      supabase.from('bot_log_channels').delete().eq('guild_id', guildId).eq('is_active', true),
      // Delete maintenance flags
      supabase.from('maintenance_flags').delete().eq('server_id', serverId),
      // Finally delete server
      supabase.from('servers').delete().eq('discord_id', guildId),
    ];

    // Execute all delete operations
    const results = await Promise.allSettled(deleteOperations);

    // Check for errors
    const errors = results
      .flatMap((result, index) => {
        const table = tableNames[index] || `table_${index}`;
        if (result.status === 'rejected') {
          return [`${table}: ${String(result.reason)}`];
        }

        const error = result.value?.error;
        if (error) {
          return [`${table}: ${error.message || JSON.stringify(error)}`];
        }

        return [];
      });

    console.log('🗑️ Delete operations results:', results.map((result, index) => ({
      table: tableNames[index] || `table_${index}`,
      status: result.status,
      error: result.status === 'rejected' ? String(result.reason) : (result.value?.error || null)
    })));

    if (errors.length > 0) {
      console.error('❌ Some delete operations failed:', errors);
      return NextResponse.json(
        { error: 'Bazı veriler silinirken hata oluştu. Lütfen tekrar deneyin.' },
        { status: 500 }
      );
    }

    console.log('✅ Setup removed successfully for guild:', guildId);

    return NextResponse.json({
      success: true,
      message: 'Kurulum başarıyla kaldırıldı. Tüm veriler, kanallar ve webhook\'lar temizlendi.',
      discordCleanup: discordCleanupResults,
    });
  } catch (error) {
    console.error('❌ Setup remove error:', error);
    return NextResponse.json(
      { error: 'Kurulum kaldırılırken beklenmeyen bir hata oluştu. Lütfen destek ile iletişime geçin.' },
      { status: 500 }
    );
  }
}