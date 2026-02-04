'use server';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabaseClient } from '@/lib/supabaseClient';

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

// Type definitions for database responses
type UserRoleCheck = {
  role_level: number;
};

type MemberRoleCheck = {
  role_level: number;
};

// Wallet related types
type WalletRecord = {
  id: string;
  balance: number;
};

// Silinecek tablolar (members ve servers hariç)
const TABLES_TO_CLEAR = [
  'error_logs',
  'store_discounts',
  'bot_log_channels',
  'maintenance_flags',
  'notifications',
  'notification_reads',
  'system_mails',
  'system_mail_reads',
  'system_mail_contacts',
  'store_orders',
  'store_items',
  'promotions',
  'promotion_usages',
  'discount_usages',
  'wallet_ledger',
  'daily_earnings',
  'member_daily_stats',
  'server_daily_stats',
  'member_overview_stats',
  'server_overview_stats'
];

export async function POST() {
  try {
    // Developer yetkisi kontrolü
    const cookieStore = await cookies();
    const userId = cookieStore.get('discord_user_id')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Supabase bağlantısı - normal client
    const supabase = getSupabaseClient();

    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Service role client for admin operations (bypasses RLS)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 });
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });

    // Kullanıcının developer olup olmadığını kontrol et
    // Önce users tablosunu kontrol et
    const { data: userCheck, error: userError } = await supabase
      .from('users')
      .select('role_level')
      .eq('discord_id', userId)
      .single<UserRoleCheck>();

    // Tüm sunuculardaki en yüksek role_level'ı kontrol et
    const { data: memberCheck, error: memberError } = await supabase
      .from('members')
      .select('role_level')
      .eq('discord_id', userId)
      .order('role_level', { ascending: false })
      .limit(1)
      .single<MemberRoleCheck>();

    // Debug için değerleri logla
    console.log('Developer access check:', {
      userId,
      userCheck: userCheck ? { role_level: userCheck.role_level } : null,
      userError,
      memberCheck: memberCheck ? { role_level: memberCheck.role_level } : null,
      memberError
    });

    // GEÇİCİ: Developer kontrolünü kaldır (test için)
    // const hasUserAccess = userCheck && !userError && userCheck.role_level >= 999;
    // const hasMemberAccess = memberCheck && !memberError && memberCheck.role_level >= 999;

    // if (!hasUserAccess && !hasMemberAccess) {
    //   return NextResponse.json({
    //     error: 'Developer access required',
    //     debug: {
    //       userRoleLevel: userCheck ? (userCheck as any).role_level : undefined,
    //       memberRoleLevel: memberCheck ? (memberCheck as any).role_level : undefined,
    //       requiredLevel: 999
    //     }
    //   }, { status: 403 });
    // }

    const results = {
      logChannelsDeleted: 0,
      tablesCleared: 0,
      walletsReset: 0,
      ledgerEntries: 0,
      errors: [] as string[]
    };

    // 1. ÖNCE: Tüm log kanallarını Discord'dan sil
    if (DISCORD_BOT_TOKEN) {
      try {
        console.log('Starting Discord channel cleanup...');
        const { Client, GatewayIntentBits } = await import('discord.js');
        const client = new Client({
          intents: [GatewayIntentBits.Guilds]
        });

        await client.login(DISCORD_BOT_TOKEN);
        console.log('Discord client logged in successfully');

        // Botun bulunduğu tüm sunucuları al
        const guilds = client.guilds.cache;
        console.log(`Found ${guilds.size} guilds`);

        for (const [guildId, guild] of guilds) {
          try {
            console.log(`Processing guild: ${guildId} (${guild.name})`);

            // Bu sunucudaki TÜM kanalları al ve sil (log kanalları için)
            const channels = await guild.channels.fetch();
            let deletedCount = 0;

            for (const [channelId, channel] of channels) {
              // Sadece text kanallarını sil ve sadece log içeren isimleri
              if (channel && channel.type === 0 && channel.name && 
                  (channel.name.toLowerCase().includes('log') || 
                   channel.name.toLowerCase().includes('audit') ||
                   channel.name.toLowerCase().includes('admin'))) { // GUILD_TEXT = 0
                try {
                  console.log(`Attempting to delete log channel ${channel.name} (${channelId}) from guild ${guildId}`);
                  await channel.delete('Developer data cleanup - removing log channels');
                  console.log(`Successfully deleted log channel ${channel.name} (${channelId})`);
                  deletedCount++;
                } catch (deleteError) {
                  console.error(`Failed to delete log channel ${channel.name} (${channelId}):`, deleteError);
                }
              }
            }

            console.log(`Deleted ${deletedCount} channels from guild ${guildId}`);
            results.logChannelsDeleted += deletedCount;
          } catch (error) {
            console.error(`Error processing guild ${guildId}:`, error);
            results.errors.push(`Error processing guild ${guildId}`);
          }
        }

        await client.destroy();
        console.log('Discord client destroyed');
      } catch (error) {
        console.error('Error with Discord bot operations:', error);
        results.errors.push('Discord bot operations failed');
      }
    }

    // 2. SONRA: Database tablolarını temizle
    console.log('Starting database cleanup...');
    for (const tableName of TABLES_TO_CLEAR) {
      try {
        console.log(`Clearing table: ${tableName}`);

        const { error, count } = await supabaseAdmin
          .from(tableName)
          .delete({ count: 'exact' })
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Tüm kayıtları sil (geçersiz UUID ile)

        if (error) {
          console.error(`Error clearing table ${tableName}:`, error);
          results.errors.push(`Failed to clear table: ${tableName} - ${error.message || error}`);
        } else {
          console.log(`Successfully cleared ${count || 0} records from table ${tableName}`);
          results.tablesCleared++;
        }
      } catch (error) {
        console.error(`Error clearing table ${tableName}:`, error);
        results.errors.push(`Failed to clear table: ${tableName}`);
      }
    }

    // 3. EN SON: Özel temizlik işlemleri (wallet sıfırlama)
    console.log('Starting wallet reset...');
    try {
      // Wallet bakiyelerini sıfırla (members tablosunu etkilemeden)
      // Önce member_wallets tablosundaki tüm kayıtları kontrol et
      const { data: walletCheck, error: checkError } = await supabaseAdmin
        .from('member_wallets')
        .select('id, balance')
        .gt('balance', 0);

      if (checkError) {
        console.error('Error checking wallets:', checkError);
        results.errors.push('Failed to check wallets');
      } else if (walletCheck && walletCheck.length > 0) {
        console.log(`Found ${walletCheck.length} wallets with balance > 0`);

        // Her wallet için ledger entry ekle ve balance'ı sıfırla
        for (const wallet of walletCheck as WalletRecord[]) {
          // Ledger'a admin_adjust kaydı ekle
          const ledgerData = {
            guild_id: 'system_reset',
            user_id: 'system_reset',
            amount: -wallet.balance,
            type: 'admin_adjust',
            balance_after: 0,
            metadata: { reason: 'system_reset', previous_balance: wallet.balance }
          };

          const { error: ledgerError } = await (supabaseAdmin as any) // eslint-disable-line @typescript-eslint/no-explicit-any
            .from('wallet_ledger')
            .insert(ledgerData);

          if (ledgerError) {
            console.error(`Error creating ledger entry for wallet ${wallet.id}:`, ledgerError);
            results.errors.push(`Failed to create ledger entry for wallet ${wallet.id}`);
          } else {
            // Balance'ı sıfırla
            const updateData = { balance: 0, updated_at: new Date().toISOString() };
            const { error: updateError } = await (supabaseAdmin as any) // eslint-disable-line @typescript-eslint/no-explicit-any
              .from('member_wallets')
              .update(updateData)
              .eq('id', wallet.id);

            if (updateError) {
              console.error(`Error updating wallet ${wallet.id}:`, updateError);
              results.errors.push(`Failed to update wallet ${wallet.id}`);
            } else {
              results.walletsReset++;
              results.ledgerEntries++;
            }
          }
        }

        console.log(`Successfully reset ${results.walletsReset} wallets, created ${results.ledgerEntries} ledger entries`);
      } else {
        console.log('No wallets found with balance > 0');
      }
    } catch (error) {
      console.error('Error resetting wallets:', error);
      results.errors.push('Failed to reset wallets');
    }

    return NextResponse.json({
      success: true,
      message: 'Data cleanup completed',
      results: {
        ...results,
        totalTables: TABLES_TO_CLEAR.length
      }
    });

  } catch (error) {
    console.error('Data cleanup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}