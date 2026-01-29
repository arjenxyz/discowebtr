import { createClient } from '@supabase/supabase-js';

type LogPayload = {
  event: string;
  status?: string;
  userId?: string;
  guildId?: string;
  roleId?: string;
  metadata?: Record<string, unknown>;
};

type WebhookTarget = {
  name: string;
  url: string;
};

type LogChannelKey =
  | 'main'
  | 'auth'
  | 'roles'
  | 'system'
  | 'suspicious'
  | 'store'
  | 'wallet'
  | 'notifications'
  | 'settings';

const getServerSupabase = () => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
};

const getRequestIp = (request: Request) => {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim();
  }
  return request.headers.get('x-real-ip') ?? null;
};

const getEnvWebhookTargets = (): Partial<Record<LogChannelKey, WebhookTarget>> => {
  const mainUrl = process.env.DISCORD_LOG_WEBHOOK_MAIN;
  const authUrl = process.env.DISCORD_LOG_WEBHOOK_AUTH;
  const rolesUrl = process.env.DISCORD_LOG_WEBHOOK_ROLES;
  const systemUrl = process.env.DISCORD_LOG_WEBHOOK_SYSTEM;
  const suspiciousUrl = process.env.DISCORD_LOG_WEBHOOK_SUSPICIOUS;
  const storeUrl = process.env.DISCORD_LOG_WEBHOOK_STORE;
  const walletUrl = process.env.DISCORD_LOG_WEBHOOK_WALLET;
  const notificationsUrl = process.env.DISCORD_LOG_WEBHOOK_NOTIFICATIONS;
  const settingsUrl = process.env.DISCORD_LOG_WEBHOOK_SETTINGS;

  return {
    main: mainUrl ? { name: 'main', url: mainUrl } : undefined,
    auth: authUrl ? { name: 'auth', url: authUrl } : undefined,
    roles: rolesUrl ? { name: 'roles', url: rolesUrl } : undefined,
    system: systemUrl ? { name: 'system', url: systemUrl } : undefined,
    suspicious: suspiciousUrl ? { name: 'suspicious', url: suspiciousUrl } : undefined,
    store: storeUrl ? { name: 'store', url: storeUrl } : undefined,
    wallet: walletUrl ? { name: 'wallet', url: walletUrl } : undefined,
    notifications: notificationsUrl ? { name: 'notifications', url: notificationsUrl } : undefined,
    settings: settingsUrl ? { name: 'settings', url: settingsUrl } : undefined,
  };
};

const resolveEventChannel = (payload: LogPayload): LogChannelKey => {
  const event = payload.event.toLowerCase();
  if (event.startsWith('admin_store') || event.startsWith('admin_promo') || event.startsWith('admin_order')) {
    return 'store';
  }
  if (event.startsWith('admin_wallet')) {
    return 'wallet';
  }
  if (event.startsWith('admin_notification')) {
    return 'notifications';
  }
  if (event.startsWith('admin_settings') || event.startsWith('admin_log_channels')) {
    return 'settings';
  }
  if (event.includes('exchange') || event.includes('role_check')) {
    return 'auth';
  }
  if (event.includes('role_assign') || event.includes('role_assigned')) {
    return 'roles';
  }
  return 'system';
};

type LogChannelConfigRow = {
  channel_type: LogChannelKey;
  webhook_url: string;
  is_active: boolean;
};

const getDbWebhookTargets = async (
  supabase: unknown,
  guildId?: string,
): Promise<Partial<Record<LogChannelKey, WebhookTarget>>> => {
  if (!supabase || !guildId) {
    return {};
  }

  const client = supabase as ReturnType<typeof createClient>;

  const { data } = await client
    .from('log_channel_configs')
    .select('channel_type, webhook_url, is_active')
    .eq('guild_id', guildId)
    .eq('is_active', true);

  if (!data) {
    return {};
  }

  return (data as LogChannelConfigRow[]).reduce<Partial<Record<LogChannelKey, WebhookTarget>>>(
    (acc, row) => {
      acc[row.channel_type] = { name: row.channel_type, url: row.webhook_url };
      return acc;
    },
    {},
  );
};

const isSuspiciousEvent = (payload: LogPayload) => {
  const status = payload.status?.toLowerCase() ?? '';
  const event = payload.event.toLowerCase();
  return (
    status.includes('failed') ||
    status.includes('missing') ||
    status.includes('unauthorized') ||
    status.includes('error') ||
    event.includes('failed') ||
    event.includes('unauthorized')
  );
};

const formatUser = (userId?: string) => (userId ? `<@${userId}>` : '—');
const formatRole = (roleId?: string) => (roleId ? `<@&${roleId}>` : '—');
const formatNumber = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? value.toFixed(2).replace(/\.00$/, '') : '—';
const formatDate = (value: unknown) => {
  if (!value) {
    return '—';
  }
  if (typeof value === 'string' || value instanceof Date) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
  }
  return String(value);
};
const formatText = (value: unknown) => (value === undefined || value === null || value === '' ? '—' : String(value));

type EmbedField = { name: string; value: string; inline?: boolean };

const buildEmbedContent = (payload: LogPayload, request: Request) => {
  const metadata = payload.metadata ?? {};
  const ip = getRequestIp(request);
  const baseFields: EmbedField[] = [];

  if (payload.status) {
    baseFields.push({ name: 'Durum', value: payload.status, inline: true });
  }
  if (payload.userId) {
    baseFields.push({ name: 'Yetkili', value: formatUser(payload.userId), inline: true });
  }
  if (payload.guildId) {
    baseFields.push({ name: 'Guild', value: payload.guildId, inline: true });
  }
  if (payload.roleId) {
    baseFields.push({ name: 'Rol', value: formatRole(payload.roleId), inline: true });
  }
  if (isSuspiciousEvent(payload) && ip) {
    baseFields.push({ name: 'IP', value: ip, inline: true });
  }

  const event = payload.event;
  switch (event) {
    case 'admin_store_item_create':
      return {
        title: '🛒 Mağaza ürünü oluşturuldu',
        description: metadata.title ? `**${formatText(metadata.title)}**` : undefined,
        fields: [
          ...baseFields,
          { name: 'Fiyat', value: formatNumber(metadata.price), inline: true },
          { name: 'Süre (gün)', value: formatText(metadata.durationDays), inline: true },
          { name: 'Durum', value: formatText(metadata.status), inline: true },
        ],
      };
    case 'admin_store_item_update':
      return {
        title: '🛠️ Mağaza ürünü güncellendi',
        description: metadata.title ? `**${formatText(metadata.title)}**` : undefined,
        fields: [
          ...baseFields,
          { name: 'Ürün ID', value: formatText(metadata.id), inline: true },
          { name: 'Fiyat', value: formatNumber(metadata.price), inline: true },
          { name: 'Süre (gün)', value: formatText(metadata.durationDays), inline: true },
          { name: 'Durum', value: formatText(metadata.status), inline: true },
        ],
      };
    case 'admin_store_item_delete':
      return {
        title: '🗑️ Mağaza ürünü silindi',
        fields: [...baseFields, { name: 'Ürün ID', value: formatText(metadata.id), inline: true }],
      };
    case 'admin_promo_create':
      return {
        title: '🎁 Promosyon oluşturuldu',
        description: metadata.code ? `**${formatText(metadata.code)}**` : undefined,
        fields: [
          ...baseFields,
          { name: 'Değer', value: formatNumber(metadata.value), inline: true },
          { name: 'Maks. kullanım', value: formatText(metadata.maxUses ?? 'sınırsız'), inline: true },
          { name: 'Durum', value: formatText(metadata.status), inline: true },
          { name: 'Bitiş', value: formatDate(metadata.expiresAt), inline: true },
        ],
      };
    case 'admin_promo_delete':
      return {
        title: '🧹 Promosyon silindi',
        fields: [...baseFields, { name: 'Promosyon ID', value: formatText(metadata.id), inline: true }],
      };
    case 'admin_store_order_approve':
      return {
        title: '✅ Sipariş onaylandı',
        fields: [
          ...baseFields,
          { name: 'Sipariş ID', value: formatText(metadata.orderId), inline: true },
          { name: 'Üye', value: formatUser(formatText(metadata.targetUserId)), inline: true },
          { name: 'Tutar', value: formatNumber(metadata.amount), inline: true },
        ],
      };
    case 'admin_store_order_reject':
      return {
        title: '❌ Sipariş reddedildi',
        fields: [
          ...baseFields,
          { name: 'Sipariş ID', value: formatText(metadata.orderId), inline: true },
          { name: 'Üye', value: formatUser(formatText(metadata.targetUserId)), inline: true },
          { name: 'Tutar', value: formatNumber(metadata.amount), inline: true },
          { name: 'Sebep', value: formatText(metadata.reason), inline: false },
        ],
      };
    case 'admin_wallet_adjust':
      return {
        title: '💳 Cüzdan düzenlendi',
        fields: [
          ...baseFields,
          { name: 'Kapsam', value: formatText(metadata.scope), inline: true },
          { name: 'İşlem', value: formatText(metadata.mode), inline: true },
          { name: 'Tutar', value: formatNumber(metadata.amount), inline: true },
          metadata.targetUserId
            ? { name: 'Üye', value: formatUser(formatText(metadata.targetUserId)), inline: true }
            : null,
          metadata.updatedCount
            ? { name: 'Güncellenen', value: formatText(metadata.updatedCount), inline: true }
            : null,
          metadata.message ? { name: 'Mesaj', value: formatText(metadata.message), inline: false } : null,
        ].filter(Boolean) as EmbedField[],
      };
    case 'admin_notification_create':
      return {
        title: '📣 Bildirim oluşturuldu',
        description: metadata.title ? `**${formatText(metadata.title)}**` : undefined,
        fields: [
          ...baseFields,
          { name: 'Tür', value: formatText(metadata.type), inline: true },
          { name: 'Durum', value: formatText(metadata.status), inline: true },
          metadata.targetUserId
            ? { name: 'Hedef Üye', value: formatUser(formatText(metadata.targetUserId)), inline: true }
            : null,
          metadata.detailsUrl ? { name: 'Detay', value: formatText(metadata.detailsUrl), inline: false } : null,
        ].filter(Boolean) as EmbedField[],
      };
    case 'admin_notification_delete':
      return {
        title: '🗑️ Bildirim silindi',
        fields: [...baseFields, { name: 'Bildirim ID', value: formatText(metadata.id), inline: true }],
      };
    case 'admin_settings_update':
      return {
        title: '⚙️ Ayarlar güncellendi',
        fields: [
          ...baseFields,
          { name: 'Onay eşiği', value: formatText(metadata.approval_threshold), inline: true },
        ],
      };
    case 'admin_log_channels_update': {
      const updated = Array.isArray(metadata.updated) ? (metadata.updated as Array<Record<string, unknown>>) : [];
      const activeCount = updated.filter((item) => item.is_active === true).length;
      return {
        title: '🧩 Log kanalları güncellendi',
        fields: [
          ...baseFields,
          { name: 'Güncellenen kanal', value: `${updated.length}`, inline: true },
          { name: 'Aktif kanal', value: `${activeCount}`, inline: true },
        ],
      };
    }
    default: {
      const fields = [...baseFields];
      if (metadata && Object.keys(metadata).length > 0) {
        const metadataString = JSON.stringify(metadata, null, 2);
        fields.push({
          name: 'Metadata',
          value: metadataString.length > 1000 ? `${metadataString.slice(0, 1000)}…` : metadataString,
          inline: false,
        });
      }
      return {
        title: payload.event.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
        fields,
      };
    }
  }
};

const sendDiscordWebhook = async (target: WebhookTarget, payload: LogPayload, request: Request) => {
  const timestamp = new Date().toISOString();
  const { title, description, fields } = buildEmbedContent(payload, request);

  await fetch(target.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'Disc Nexus Logs',
      allowed_mentions: { parse: [] },
      embeds: [
        {
          title,
          color: isSuspiciousEvent(payload) ? 15158332 : 5793266,
          description,
          fields,
          footer: { text: `Event: ${payload.event}` },
          timestamp,
        },
      ],
    }),
  });
};

export const logWebEvent = async (request: Request, payload: LogPayload) => {
  try {
    const supabase = getServerSupabase();
    if (supabase) {
      await supabase.from('web_audit_logs').insert({
        event: payload.event,
        status: payload.status,
        user_id: payload.userId ?? null,
        guild_id: payload.guildId ?? null,
        role_id: payload.roleId ?? null,
        ip_address: getRequestIp(request),
        user_agent: request.headers.get('user-agent'),
        metadata: payload.metadata ?? {},
      });
    }

    const guildId = process.env.DISCORD_GUILD_ID;
    const envTargets = getEnvWebhookTargets();
    const dbTargets = await getDbWebhookTargets(supabase, guildId);
    const targets: Partial<Record<LogChannelKey, WebhookTarget>> = {
      ...envTargets,
      ...dbTargets,
    };
    const deliveries: Promise<void>[] = [];
    const channelType = resolveEventChannel(payload);
    const isSuspicious = isSuspiciousEvent(payload);

    const preferredChannel: LogChannelKey | null = isSuspicious
      ? 'suspicious'
      : targets[channelType]
        ? channelType
        : targets.main
          ? 'main'
          : null;

    if (preferredChannel && targets[preferredChannel]) {
      deliveries.push(sendDiscordWebhook(targets[preferredChannel]!, payload, request));
    }

    if (deliveries.length > 0) {
      await Promise.allSettled(deliveries);
    }
  } catch {
    // Logları uygulama akışını bozmasın diye yutuyoruz.
  }
};
