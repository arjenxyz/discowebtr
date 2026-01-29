import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const DEFAULT_SLUG = 'default';
const GUILD_ID = process.env.DISCORD_GUILD_ID ?? '1465698764453838882';
const MAINTENANCE_ROLE_ID =
  process.env.MAINTENANCE_ROLE_ID ?? process.env.DISCORD_MAINTENANCE_ROLE_ID;
const REQUIRED_CHANNELS = [
  'main',
  'auth',
  'roles',
  'system',
  'suspicious',
  'store',
  'wallet',
  'notifications',
  'settings',
];

const getSupabase = () => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
};

const formatNumber = new Intl.NumberFormat('tr-TR');
const formatShortDate = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

const getOverviewData = async () => {
  const supabase = getSupabase();
  if (!supabase) {
    return null;
  }

  const { data: server } = await supabase
    .from('servers')
    .select('id,name')
    .eq('slug', DEFAULT_SLUG)
    .maybeSingle();

  if (!server) {
    return null;
  }

  const now = new Date();
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0)).toISOString();

  const activitySince = new Date(now.getTime() - 10 * 60 * 1000).toISOString();

  const [
    webhookCount,
    channelConfigs,
    auditLogs24h,
    recentLogs,
    logActivityCount,
    publicMetrics,
  ] = await Promise.all([
    supabase
      .from('log_channel_configs')
      .select('id', { count: 'exact', head: true })
      .eq('guild_id', GUILD_ID)
      .eq('is_active', true),
    supabase
      .from('log_channel_configs')
      .select('channel_type,is_active')
      .eq('guild_id', GUILD_ID)
      .eq('is_active', true),
    supabase
      .from('web_audit_logs')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', since24h),
    supabase
      .from('web_audit_logs')
      .select('id,event,status,user_id,created_at')
      .order('created_at', { ascending: false })
      .limit(1),
    supabase
      .from('web_audit_logs')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', activitySince),
    supabase
      .from('public_metrics')
      .select('updated_at')
      .eq('server_id', server.id)
      .maybeSingle(),
  ]);

  return {
    server,
    webhookCount: webhookCount.count ?? 0,
    configuredChannels: channelConfigs.data ?? [],
    auditLogs24h: auditLogs24h.count ?? 0,
    metricsUpdatedAt: publicMetrics.data?.updated_at ?? null,
    recentLogs: recentLogs.data ?? [],
    logActivityCount: logActivityCount.count ?? 0,
  };
};

export default async function AdminDashboardPage() {
  const overview = await getOverviewData();

  if (!overview) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
        Admin verileri yüklenemedi. Sunucu ayarlarını ve yetkileri kontrol edin.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent p-8 shadow-[0_30px_80px_rgba(10,12,18,0.55)]">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300">Admin</p>
        <h1 className="mt-3 text-3xl font-semibold">{overview.server.name} • Yönetim Merkezi</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/60">
          Sistem bileşenlerinin sağlığını ve olası sorunları buradan takip edin.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/admin/log-channels"
            className="rounded-xl bg-indigo-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400"
          >
            Log Kanalları
          </Link>
          <Link
            href="/admin/guide"
            className="rounded-xl border border-white/15 px-5 py-2 text-sm font-semibold text-white/80 transition hover:border-white/30 hover:text-white"
          >
            Kılavuzlar
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Sistem Durumu</h2>
            <p className="mt-1 text-sm text-white/60">
              Panel yalnızca sistem sağlık kontrollerini gösterir.
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {[
            {
              label: 'Service Role Key',
              ok: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
              detail: 'Sunucu erişimi',
            },
            {
              label: 'Discord Bot Token',
              ok: Boolean(process.env.DISCORD_BOT_TOKEN),
              detail: 'Bot bağlantısı',
            },
            {
              label: 'Admin Rol ID',
              ok: Boolean(process.env.DISCORD_ADMIN_ROLE_ID),
              detail: 'Yetki doğrulama',
            },
            {
              label: 'Bakım Rol ID',
              ok: Boolean(MAINTENANCE_ROLE_ID),
              detail: 'Bakım yetkisi',
            },
            {
              label: 'Log Kanal Seti',
              ok: REQUIRED_CHANNELS.every((type) =>
                overview.configuredChannels.some((cfg) => cfg.channel_type === type),
              ),
              detail: 'Webhook yapılandırması',
            },
            {
              label: 'Webhook Sayısı',
              ok: overview.webhookCount >= REQUIRED_CHANNELS.length,
              detail: `${overview.webhookCount} aktif`,
            },
            {
              label: 'Audit Log Akışı',
              ok: overview.logActivityCount > 0,
              detail: overview.recentLogs[0]
                ? `Son kayıt: ${formatShortDate.format(new Date(overview.recentLogs[0].created_at))}`
                : 'Kayıt bulunamadı',
            },
            {
              label: 'Audit Log (24s)',
              ok: overview.auditLogs24h > 0,
              detail: `${formatNumber.format(overview.auditLogs24h)} kayıt`,
            },
            {
              label: 'Public Metrics',
              ok: Boolean(overview.metricsUpdatedAt),
              detail: overview.metricsUpdatedAt
                ? `Güncellendi: ${formatShortDate.format(new Date(overview.metricsUpdatedAt))}`
                : 'Güncelleme yok',
            },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-[#0b0d12]/60 px-4 py-3 text-sm"
            >
              <div>
                <p className="text-white/80">{item.label}</p>
                <p className="text-xs text-white/40">{item.detail}</p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] ${
                  item.ok ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'
                }`}
              >
                {item.ok ? 'Sağlam' : 'Sorun'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
