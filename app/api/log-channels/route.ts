import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logWebEvent } from '@/lib/serverLogger';

const GUILD_ID = process.env.DISCORD_GUILD_ID ?? '1465698764453838882';

const getSelectedGuildId = async (): Promise<string> => {
  const cookieStore = await cookies();
  const selectedGuildId = cookieStore.get('selected_guild_id')?.value;
  return selectedGuildId || GUILD_ID; // Fallback to default
};

const CHANNEL_TYPES = [
  'user_main',
  'user_auth',
  'user_roles',
  'user_exchange',
  'user_store',
  'admin_main',
  'admin_wallet',
  'admin_store',
  'admin_notifications',
  'admin_settings',
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
  try {
    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
      return false;
    }

    const cookieStore = await cookies();
    const userId = cookieStore.get('discord_user_id')?.value;
    const selectedGuildId = cookieStore.get('selected_guild_id')?.value;
    if (!userId || !selectedGuildId) {
      return false;
    }

    // Get admin role ID from server config
    const supabase = getSupabase();
    if (!supabase) {
      return false;
    }

    const { data: server } = await supabase
      .from('servers')
      .select('admin_role_id')
      .eq('discord_id', selectedGuildId)
      .maybeSingle();

    if (!server?.admin_role_id) {
      return false;
    }

    // Check Discord API for user roles
    const memberResponse = await fetch(`https://discord.com/api/guilds/${selectedGuildId}/members/${userId}`, {
      headers: { Authorization: `Bot ${botToken}` },
    });

    if (!memberResponse.ok) {
      return false;
    }

    const member = (await memberResponse.json()) as { roles: string[] };
    return member.roles.includes(server.admin_role_id);
  } catch (error) {
    console.error('Admin check failed:', error);
    return false;
  }
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

  const selectedGuildId = await getSelectedGuildId();

  const { data } = await supabase
    .from('log_channel_configs')
    .select('channel_type, webhook_url, is_active')
    .eq('guild_id', selectedGuildId);

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

  const selectedGuildId = await getSelectedGuildId();
  const adminId = await getAdminId();
  const { configs } = (await request.json()) as {
    configs: Array<{ channel_type: string; webhook_url: string; is_active: boolean }>;
  };

  const rows = configs
    .filter((config) => CHANNEL_TYPES.includes(config.channel_type as (typeof CHANNEL_TYPES)[number]))
    .map((config) => ({
      guild_id: selectedGuildId,
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
    guildId: selectedGuildId,
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
