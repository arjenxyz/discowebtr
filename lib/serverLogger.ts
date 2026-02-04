import { createClient } from '@supabase/supabase-js';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

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

type UserLogChannelKey =
  | 'user_main'
  | 'user_auth'
  | 'user_roles'
  | 'user_exchange'
  | 'user_store';

type AdminLogChannelKey =
  | 'admin_main'
  | 'admin_wallet'
  | 'admin_store'
  | 'admin_notifications'
  | 'admin_settings';

type LogChannelKey = UserLogChannelKey | AdminLogChannelKey;

type LegacyLogChannelKey =
  | 'main'
  | 'auth'
  | 'roles'
  | 'suspicious'
  | 'store'
  | 'wallet'
  | 'notifications'
  | 'settings'
  | 'admin'
  | 'system';

type EmbedField = { name: string; value: string; inline?: boolean };

type DiscordEmbed = {
  author?: { name: string; icon_url?: string };
  title?: string;
  url?: string;
  description?: string;
  color?: number;
  fields?: EmbedField[];
  footer?: { text: string; icon_url?: string };
  timestamp?: string;
};

type LogChannelConfigRow = {
  channel_type: LogChannelKey | LegacyLogChannelKey | string;
  webhook_url: string;
  is_active: boolean;
};

// ─────────────────────────────────────────────────────────────────────────────
// SUPABASE
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// REQUEST HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const getRequestIp = (request: Request) => {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim();
  }
  return request.headers.get('x-real-ip') ?? null;
};

// ─────────────────────────────────────────────────────────────────────────────
// WEBHOOK TARGETS — DB ONLY
// ─────────────────────────────────────────────────────────────────────────────

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
      const normalized = normalizeChannelKey(row.channel_type);
      if (normalized) {
        acc[normalized] = { name: normalized, url: row.webhook_url };
      }
      return acc;
    },
    {},
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CHANNEL RESOLVER
// ─────────────────────────────────────────────────────────────────────────────

const isSuspiciousEvent = (payload: LogPayload): boolean => {
  const status = payload.status?.toLowerCase() ?? '';
  const event  = payload.event.toLowerCase();
  return (
    status.includes('failed')       ||
    status.includes('missing')      ||
    status.includes('unauthorized') ||
    status.includes('error')        ||
    event.includes('failed')        ||
    event.includes('unauthorized')
  );
};

const resolveEventChannel = (payload: LogPayload): LogChannelKey => {
  const event = payload.event.toLowerCase();
  const isAdminEvent = event.startsWith('admin_');

  if (isSuspiciousEvent(payload)) return isAdminEvent ? 'admin_main' : 'user_main';

  if (isAdminEvent) {
    if (event.startsWith('admin_wallet'))       return 'admin_wallet';
    if (event.startsWith('admin_notification')) return 'admin_notifications';
    if (event.startsWith('admin_settings') || event.startsWith('admin_log_channels')) return 'admin_settings';
    if (
      event.startsWith('admin_store')    ||
      event.startsWith('admin_promo')    ||
      event.startsWith('admin_order')    ||
      event.startsWith('admin_discount')
    ) return 'admin_store';
    return 'admin_main';
  }

  if (event.startsWith('store_')) return 'user_store';
  if (event.includes('exchange')) return 'user_exchange';
  if (event.includes('role_check') || event.includes('role_assign') || event.includes('role_assigned')) return 'user_roles';
  if (event.includes('auth') || event.includes('login') || event.includes('verify') || event.includes('callback')) return 'user_auth';

  return 'user_main';
};

// ─────────────────────────────────────────────────────────────────────────────
// EMBED — COLOR PALETTE
// ─────────────────────────────────────────────────────────────────────────────

const COLORS: Record<LogChannelKey, number> = {
  user_main:          0x5dade2, // Light blue
  user_auth:          0x1abc9c, // Teal
  user_roles:         0x9b59b6, // Purple
  user_exchange:      0x3498db, // Blue
  user_store:         0x2ecc71, // Green
  admin_main:         0xe67e22, // Orange
  admin_wallet:       0xf39c12, // Gold
  admin_store:        0x27ae60, // Dark green
  admin_notifications: 0x2980b9, // Dark blue
  admin_settings:     0x95a5a6, // Grey
};

const resolveColor = (payload: LogPayload): number => {
  const channel = resolveEventChannel(payload);
  if (isSuspiciousEvent(payload)) {
    return channel.startsWith('admin_') ? COLORS.admin_main : COLORS.user_main;
  }
  return COLORS[channel] ?? COLORS.user_main;
};

// ─────────────────────────────────────────────────────────────────────────────
// EMBED — UTILITY HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const getMetadataString = (metadata: Record<string, unknown>, key: string): string | null => {
  const value = metadata[key];
  return value === undefined || value === null || value === '' ? null : String(value);
};

const formatUser = (userId?: string) => (userId ? `<@${userId}>` : '—');
const formatRole = (roleId?: string) => (roleId ? `<@&${roleId}>` : '—');

const formatNumber = (value: unknown): string =>
  typeof value === 'number' && Number.isFinite(value)
    ? value.toFixed(2).replace(/\.00$/, '')
    : String(value ?? '0');

/** Discord native absolute time: "1 Şubat 2026, 14:32" */
const discordAbsoluteTime = (date: Date = new Date()) =>
  `<t:${Math.floor(date.getTime() / 1000)}:f>`;

const normalizeChannelKey = (value: string): LogChannelKey | null => {
  switch (value) {
    case 'user_main':
    case 'user_auth':
    case 'user_roles':
    case 'user_exchange':
    case 'user_store':
    case 'admin_main':
    case 'admin_wallet':
    case 'admin_store':
    case 'admin_notifications':
    case 'admin_settings':
      return value;
    case 'main':
      return 'user_main';
    case 'auth':
      return 'user_auth';
    case 'roles':
      return 'user_roles';
    case 'store':
      return 'user_store';
    case 'wallet':
      return 'admin_wallet';
    case 'notifications':
      return 'admin_notifications';
    case 'settings':
      return 'admin_settings';
    case 'admin':
      return 'admin_main';
    case 'system':
    case 'suspicious':
      return 'admin_main';
    default:
      return null;
  }
};

const humanizeEvent = (event: string) =>
  event.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());





// ─────────────────────────────────────────────────────────────────────────────
// EMBED — AUTHOR
// ─────────────────────────────────────────────────────────────────────────────


const CHANNEL_LABELS: Record<LogChannelKey, string> = {
  user_main:          'Üye • Genel',
  user_auth:          'Üye • Kimlik',
  user_roles:         'Üye • Roller',
  user_exchange:      'Üye • Değişim',
  user_store:         'Üye • Mağaza',
  admin_main:         'Admin • Genel',
  admin_wallet:       'Admin • Cüzdan',
  admin_store:        'Admin • Mağaza',
  admin_notifications:'Admin • Bildirim',
  admin_settings:     'Admin • Ayarlar',
};

const buildAuthor = (channelType: LogChannelKey) => ({
  name: CHANNEL_LABELS[channelType],
});

// ─────────────────────────────────────────────────────────────────────────────
// EMBED — TITLE
// ─────────────────────────────────────────────────────────────────────────────



// ─────────────────────────────────────────────────────────────────────────────
// EMBED — DESCRIPTION (özet cümle)
// ─────────────────────────────────────────────────────────────────────────────

const resolveActorDisplay = (payload: LogPayload): string => {
  const meta = payload.metadata ?? {};
  const name =
    getMetadataString(meta, 'actorName') ||
    getMetadataString(meta, 'adminName') ||
    getMetadataString(meta, 'userName')  ||
    getMetadataString(meta, 'username');
  return name || (payload.userId ? formatUser(payload.userId) : 'Bilinmiyor');
};

const resolveActorAvatarUrl = (payload: LogPayload): string | null => {
  const meta = payload.metadata ?? {};
  return (
    getMetadataString(meta, 'actorAvatarUrl') ||
    getMetadataString(meta, 'avatarUrl') ||
    null
  );
};

const resolveTargetDisplay = (payload: LogPayload): string | null => {
  const meta = payload.metadata ?? {};
  const name =
    getMetadataString(meta, 'targetUserName') ||
    getMetadataString(meta, 'targetUsername');
  const id = getMetadataString(meta, 'targetUserId');
  return name || (id ? formatUser(id) : null);
};


const buildDescription = (payload: LogPayload): string => {
  const user   = resolveActorDisplay(payload);
  const meta   = payload.metadata ?? {};
  const role   = payload.roleId ? formatRole(payload.roleId) : null;
  const amount = meta.amount ?? meta.price ?? meta.value;
  const now    = new Date();
  const event  = payload.event.toLowerCase();

  if (payload.event === 'store_purchase' && role && amount !== undefined && amount !== null) {
    return `**${user}**, ${discordAbsoluteTime(now)} tarihinde **${formatNumber(amount)} <a:papel:1467470043850735739>** karşılığında **${role}** rolünü edindi.`;
  }

  if (payload.event === 'admin_wallet_adjust') {
    const target = resolveTargetDisplay(payload);
    const scope  = getMetadataString(meta, 'scope') || 'user';
    const mode   = getMetadataString(meta, 'mode') ?? '—';
    const updated = getMetadataString(meta, 'updatedCount');
    const note   = getMetadataString(meta, 'message');

    return [
      `**Cüzdan işlemi** · ${discordAbsoluteTime(now)}`,
      `Yetkili: **${user}**${payload.userId ? ` (${formatUser(payload.userId)} · ${payload.userId})` : ''}`,
      `İşlem: **${mode}**`,
      `Tutar: **${formatNumber(amount ?? 0)} <a:papel:1467470043850735739>**`,
      scope === 'all'
        ? `Kapsam: **Tüm üyeler**${updated ? ` (${updated} kişi)` : ''}`
        : `Kapsam: **Tek üye**${target ? ` — ${target}` : ''}`,
      note ? `Not: ${note}` : null,
    ]
      .filter(Boolean)
      .join('\n');
  }

  if (event.startsWith('admin_')) {
    const target = resolveTargetDisplay(payload);
    const action = humanizeEvent(payload.event);
    const details: string[] = [];
    const code = getMetadataString(meta, 'code');
    const percent = getMetadataString(meta, 'percent');
    const maxUses = getMetadataString(meta, 'maxUses');
    const expiresAt = getMetadataString(meta, 'expiresAt');

    if (target) details.push(`Hedef ${target}`);
    if (role) details.push(`Rol ${role}`);
    if (amount !== undefined && amount !== null) {
      details.push(`Tutar ${formatNumber(amount)} <a:papel:1467470043850735739>`);
    }
    if (percent) details.push(`İndirim ${formatNumber(percent)}%`);
    if (code) details.push(`Kod ${code}`);
    if (maxUses) details.push(`Limit ${maxUses}`);
    if (expiresAt) {
      const parsed = Date.parse(expiresAt);
      details.push(
        Number.isNaN(parsed)
          ? `Bitiş ${expiresAt}`
          : `Bitiş ${discordAbsoluteTime(new Date(parsed))}`,
      );
    }
    const title = getMetadataString(meta, 'title');
    const orderId = getMetadataString(meta, 'orderId');
    const itemId = getMetadataString(meta, 'itemId');
    const mode = getMetadataString(meta, 'mode');
    const scope = getMetadataString(meta, 'scope');
    const updated = getMetadataString(meta, 'updatedCount');
    const note = getMetadataString(meta, 'message');

    if (title) details.push(`Ürün "${title}"`);
    if (orderId) details.push(`Sipariş ${orderId}`);
    if (itemId) details.push(`Ürün ID ${itemId}`);
    if (mode) details.push(`İşlem ${mode}`);
    if (scope) {
      details.push(
        scope === 'all'
          ? `Kapsam tüm üyeler${updated ? ` (${updated})` : ''}`
          : 'Kapsam tek üye',
      );
    }

    const detailText = details.length ? ` — ${details.join(', ')}` : '';
    return [
      `**Admin işlem kaydı** · ${discordAbsoluteTime(now)}`,
      `Yetkili: **${user}**${payload.userId ? ` (${formatUser(payload.userId)} · ${payload.userId})` : ''}`,
      `İşlem: **${action}**${detailText}`,
      note ? `Not: ${note}` : null,
    ]
      .filter(Boolean)
      .join('\n');
  }

  const details: string[] = [];
  const target = resolveTargetDisplay(payload);
  const title  = getMetadataString(meta, 'title');
  const orderId = getMetadataString(meta, 'orderId');
  const itemId  = getMetadataString(meta, 'itemId');
  const mode    = getMetadataString(meta, 'mode');
  const scope   = getMetadataString(meta, 'scope');
  const updated = getMetadataString(meta, 'updatedCount');

  if (target) details.push(`Hedef ${target}`);
  if (role) details.push(`Rol ${role}`);
  if (amount !== undefined && amount !== null) {
    details.push(`Tutar ${formatNumber(amount)} <a:papel:1467470043850735739>`);
  }
  if (title) details.push(`Ürün "${title}"`);
  if (orderId) details.push(`Sipariş ${orderId}`);
  if (itemId) details.push(`Ürün ID ${itemId}`);
  if (mode) details.push(`İşlem ${mode}`);
  if (scope) {
    details.push(
      scope === 'all'
        ? `Kapsam tüm üyeler${updated ? ` (${updated})` : ''}`
        : 'Kapsam tek üye',
    );
  }

  const detailText = details.length ? ` — ${details.join(', ')}` : '';
  return `**${user}**, ${discordAbsoluteTime(now)} · ${humanizeEvent(payload.event)}${detailText}.`;
};

// ─────────────────────────────────────────────────────────────────────────────
// EMBED — FIELDS
// ─────────────────────────────────────────────────────────────────────────────





// ─────────────────────────────────────────────────────────────────────────────
// EMBED — FOOTER
// ─────────────────────────────────────────────────────────────────────────────


// ─────────────────────────────────────────────────────────────────────────────
// EMBED — MASTER BUILDER
// ─────────────────────────────────────────────────────────────────────────────

const buildEmbedPayload = (payload: LogPayload): DiscordEmbed => {
  const channelType = resolveEventChannel(payload);
  const actorAvatarUrl = resolveActorAvatarUrl(payload);
  const actorDisplay   = resolveActorDisplay(payload);
  const author = payload.event === 'admin_wallet_adjust'
    ? { name: `Yetkili: ${actorDisplay}`, icon_url: actorAvatarUrl ?? undefined }
    : buildAuthor(channelType);

  return {
    author,
    description: buildDescription(payload),
    color:       resolveColor(payload),
    timestamp:   new Date().toISOString(),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// DISCORD WEBHOOK SENDER
// ─────────────────────────────────────────────────────────────────────────────

const sendDiscordWebhook = async (target: WebhookTarget, payload: LogPayload) => {
  const embed = buildEmbedPayload(payload);

  await fetch(target.url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      username:          '📖 Veri Merkezi',
      allowed_mentions:  { parse: [] },
      embeds:            [embed],
    }),
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT — logWebEvent
// ─────────────────────────────────────────────────────────────────────────────

export const logWebEvent = async (request: Request, payload: LogPayload) => {
  try {
    console.log('🔥 logWebEvent called:', payload.event, 'guildId:', payload.guildId);

    const supabase  = getServerSupabase();

    // ── 1. Audit log → Supabase ──
    if (supabase) {
      await supabase.from('web_audit_logs').insert({
        event:      payload.event,
        status:     payload.status,
        user_id:    payload.userId   ?? null,
        guild_id:   payload.guildId   ?? null,
        role_id:    payload.roleId    ?? null,
        ip_address: getRequestIp(request),
        user_agent: request.headers.get('user-agent'),
        metadata:   payload.metadata  ?? {},
      });
    }

    // ── 2. Discord embed yaz ──
    const botApiUrl   = process.env.BOT_API_URL || 'http://localhost:3000';
    const channelType = resolveEventChannel(payload);
    const embed       = buildEmbedPayload(payload);

    console.log('🤖 Sending to bot API:', botApiUrl, 'channelType:', channelType);

    // ── 3. Webhook fallback (DB → vazgeç) ──
    const sendWebhookFallback = async () => {
      if (!supabase || !payload.guildId) return;

      const dbTargets = await getDbWebhookTargets(supabase, payload.guildId);
      const target    = dbTargets[channelType] ?? dbTargets.user_main ?? dbTargets.admin_main;

      if (!target) {
        console.warn('📡 No webhook target found for channelType:', channelType, 'guildId:', payload.guildId);
        return;
      }

      await sendDiscordWebhook(target, payload);
      console.log('📡 Webhook fallback sent for channelType:', channelType, 'guildId:', payload.guildId);
    };

    // ── 4. Bot API'sine gönder (varsa), yoksa fallback ──
    if (payload.guildId) {
      console.log('📡 Fetching bot API for guild:', payload.guildId, 'channelType:', channelType);

      try {
        const controller = new AbortController();
        const timeoutId  = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(`${botApiUrl}/api/log`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ guildId: payload.guildId, channelType, embed }),
          signal:  controller.signal,
        });

        clearTimeout(timeoutId);

        console.log('📡 Bot API response status:', response.status, 'ok:', response.ok);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('📡 Bot API error response:', errorText);
          await sendWebhookFallback();
        } else {
          const successText = await response.text();
          console.log('📡 Bot API success response:', successText);
        }
      } catch (fetchError) {
        const error = fetchError instanceof Error ? fetchError : new Error('Unknown error');
        console.error('📡 Fetch to bot API failed:', error.message, 'botApiUrl:', botApiUrl);

        if (error.name === 'AbortError') {
          console.error('📡 Bot API request timed out');
        }

        await sendWebhookFallback();
      }
    }

  } catch {
    // Loglar uygulama akışını bozmasın diye yutulur.
  }
};