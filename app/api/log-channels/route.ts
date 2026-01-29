import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logWebEvent } from '@/lib/serverLogger';

const GUILD_ID = process.env.DISCORD_GUILD_ID ?? '1465698764453838882';
const ADMIN_ROLE_ID = process.env.DISCORD_ADMIN_ROLE_ID;

const CHANNEL_TYPES = [
  'main',
  'auth',
  'roles',
  'system',
  'suspicious',
  'store',
  'wallet',
  'notifications',
  'settings',
] as const;

const getSupabase = () => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
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

export async function GET() {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });
  }

  const { data } = await supabase
    .from('log_channel_configs')
    .select('channel_type, webhook_url, is_active')
    .eq('guild_id', GUILD_ID);

  const configs = CHANNEL_TYPES.map((channelType) => {
    const found = data?.find((row) => row.channel_type === channelType);
    return {
      channel_type: channelType,
      webhook_url: found?.webhook_url ?? '',
      is_active: found?.is_active ?? false,
    };
  });

  return NextResponse.json(configs);
}

export async function POST(request: Request) {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });
  }

  const adminId = await getAdminId();
  const { configs } = (await request.json()) as {
    configs: Array<{ channel_type: string; webhook_url: string; is_active: boolean }>;
  };

  const rows = configs
    .filter((config) => CHANNEL_TYPES.includes(config.channel_type as (typeof CHANNEL_TYPES)[number]))
    .map((config) => ({
      guild_id: GUILD_ID,
      channel_type: config.channel_type,
      webhook_url: config.webhook_url.trim(),
      is_active: config.is_active,
      updated_at: new Date().toISOString(),
    }));

  const { error } = await supabase.from('log_channel_configs').upsert(rows, {
    onConflict: 'guild_id,channel_type',
  });

  if (error) {
    return NextResponse.json(
      {
        error: 'save_failed',
        detail: {
          message: error.message,
          code: error.code,
        },
      },
      { status: 500 },
    );
  }

  await logWebEvent(request, {
    event: 'admin_log_channels_update',
    status: 'success',
    userId: adminId ?? undefined,
    guildId: GUILD_ID,
    metadata: {
      updated: rows.map((row) => ({
        channel_type: row.channel_type,
        is_active: row.is_active,
        webhook_url: row.webhook_url ? 'configured' : 'empty',
      })),
    },
  });

  return NextResponse.json({ status: 'ok' });
}
