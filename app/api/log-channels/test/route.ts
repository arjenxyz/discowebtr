import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

type ChannelType = (typeof CHANNEL_TYPES)[number];

const getSupabase = () => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
};

const getEnvWebhook = (channelType: ChannelType) => {
  const envMap: Record<ChannelType, string | undefined> = {
    main: process.env.DISCORD_LOG_WEBHOOK_MAIN,
    auth: process.env.DISCORD_LOG_WEBHOOK_AUTH,
    roles: process.env.DISCORD_LOG_WEBHOOK_ROLES,
    system: process.env.DISCORD_LOG_WEBHOOK_SYSTEM,
    suspicious: process.env.DISCORD_LOG_WEBHOOK_SUSPICIOUS,
    store: process.env.DISCORD_LOG_WEBHOOK_STORE,
    wallet: process.env.DISCORD_LOG_WEBHOOK_WALLET,
    notifications: process.env.DISCORD_LOG_WEBHOOK_NOTIFICATIONS,
    settings: process.env.DISCORD_LOG_WEBHOOK_SETTINGS,
  };
  return envMap[channelType];
};

export async function POST(request: Request) {
  const { channelType } = (await request.json()) as { channelType?: ChannelType };

  if (!channelType || !CHANNEL_TYPES.includes(channelType)) {
    return NextResponse.json({ error: 'invalid_channel' }, { status: 400 });
  }

  const supabase = getSupabase();
  let webhookUrl = getEnvWebhook(channelType);

  if (supabase) {
    const { data } = await supabase
      .from('log_channel_configs')
      .select('webhook_url,is_active')
      .eq('channel_type', channelType)
      .eq('guild_id', process.env.DISCORD_GUILD_ID ?? '1465698764453838882')
      .eq('is_active', true)
      .maybeSingle();

    if (data?.webhook_url) {
      webhookUrl = data.webhook_url;
    }
  }

  if (!webhookUrl) {
    return NextResponse.json({ error: 'missing_webhook' }, { status: 400 });
  }

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'Disc Nexus Logs',
      content: `✅ Test mesajı (${channelType})`,
    }),
  });

  return NextResponse.json({ status: 'ok' });
}
