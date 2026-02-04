import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

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

// Seçilen sunucu ID'sini al
const getSelectedGuildId = async (): Promise<string> => {
  // Server-side'da cookie'lere erişim için headers kullan
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const selectedGuildId = cookieStore.get('selected_guild_id')?.value;

  return selectedGuildId || GUILD_ID; // Varsayılan olarak config'deki guild ID
};

const formatNumber = new Intl.NumberFormat('tr-TR');
const formatShortDate = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

// Admin yetkisi kontrolü
const checkAdminAccess = async (selectedGuildId: string): Promise<boolean> => {
  try {
    console.log('Checking admin access for guild:', selectedGuildId);
    
    // Kullanıcı ID'sini cookie'den al
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const discordUserId = cookieStore.get('discord_user_id')?.value;
    
    console.log('Discord user ID:', discordUserId);
    
    if (!discordUserId) {
      console.log('No discord user ID found');
      return false;
    }

    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
      console.log('No bot token found');
      return false;
    }

    // Supabase'den admin_role_id'yi al
    const supabase = getSupabase();
    if (!supabase) {
      console.log('No supabase client');
      return false;
    }

    const { data: server } = await supabase
      .from('servers')
      .select('admin_role_id')
      .eq('discord_id', selectedGuildId)
      .maybeSingle();

    console.log('Server data:', server);
    
    if (!server?.admin_role_id) {
      console.log('No admin role ID found for server');
      return false;
    }

    console.log('Admin role ID:', server.admin_role_id);

    // Discord API ile kullanıcının rollerini kontrol et
    const memberResponse = await fetch(
      `https://discord.com/api/guilds/${selectedGuildId}/members/${discordUserId}`,
      {
        headers: { Authorization: `Bot ${botToken}` },
      },
    );

    console.log('Member response status:', memberResponse.status);
    
    if (!memberResponse.ok) {
      console.log('Member response not ok');
      return false;
    }

    const member = (await memberResponse.json()) as { roles: string[] };
    console.log('Member roles:', member.roles);
    const hasRole = member.roles.includes(server.admin_role_id);
    console.log('Has admin role:', hasRole);
    
    return hasRole;
  } catch (error) {
    console.error('Admin access check failed:', error);
    return false;
  }
};

const getOverviewData = async () => {
  console.log('Getting overview data...');
  const supabase = getSupabase();
  if (!supabase) {
    console.log('No supabase client');
    return null;
  }

  const selectedGuildId = await getSelectedGuildId();
  console.log('Selected guild ID:', selectedGuildId);

  const { data: server } = await supabase
    .from('servers')
    .select('id,name,admin_role_id,verify_role_id,is_setup')
    .eq('discord_id', selectedGuildId)
    .maybeSingle();

  if (!server) {
    return { server: null, selectedGuildId };
  }

  const now = new Date();
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
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
      .eq('guild_id', selectedGuildId)
      .eq('is_active', true),
    supabase
      .from('log_channel_configs')
      .select('channel_type,is_active')
      .eq('guild_id', selectedGuildId)
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
    selectedGuildId,
    webhookCount: webhookCount.count ?? 0,
    configuredChannels: channelConfigs.data ?? [],
    auditLogs24h: auditLogs24h.count ?? 0,
    metricsUpdatedAt: publicMetrics.data?.updated_at ?? null,
    recentLogs: recentLogs.data ?? [],
    logActivityCount: logActivityCount.count ?? 0,
  };
};

export default async function AdminDashboardPage() {
  console.log('AdminDashboardPage called');
  const selectedGuildId = await getSelectedGuildId();
  console.log('Selected guild ID in page:', selectedGuildId);
  
  // Admin yetkisi kontrolü
  const hasAdminAccess = await checkAdminAccess(selectedGuildId);
  console.log('Has admin access:', hasAdminAccess);
  
  if (!hasAdminAccess) {
    console.log('No admin access, showing error page');
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b0d12] text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Erişim Reddedildi</h1>
          <p className="text-white/70 mb-6">
            Bu sunucuda yönetici yetkiniz yok.
          </p>
          <a 
            href="/dashboard" 
            className="inline-block px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
          >
            Ana Sayfaya Dön
          </a>
        </div>
      </div>
    );
  }

  console.log('Getting overview data...');
  const overview = await getOverviewData();
  console.log('Overview data:', overview);

  if (!overview) {
    console.log('No overview data, showing error');
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
        Admin verileri yüklenemedi. Sunucu ayarlarını ve yetkileri kontrol edin.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent p-8 shadow-[0_30px_80px_rgba(10,12,18,0.55)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300">Admin</p>
            <h1 className="mt-3 text-3xl font-semibold">
              {overview.server ? `${overview.server.name} • Yönetim Merkezi` : 'Yönetim Merkezi'}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-white/60">
              {overview.server ? 
                `Sunucu ID: ${overview.selectedGuildId} • ${overview.server.is_setup ? '✅ Kurulmuş' : '❌ Kurulmamış'}` :
                'Sistem bileşenlerinin sağlığını ve olası sorunları buradan takip edin.'
              }
            </p>
          </div>
          <Link
            href="/auth/select-server"
            className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-500"
          >
            Sunucu Değiştir
          </Link>
        </div>
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
                (overview.configuredChannels ?? []).some((cfg) => cfg.channel_type === type),
              ),
              detail: 'Webhook yapılandırması',
            },
            {
              label: 'Webhook Sayısı',
              ok: (overview.webhookCount ?? 0) >= REQUIRED_CHANNELS.length,
              detail: `${overview.webhookCount ?? 0} aktif`,
            },
            {
              label: 'Audit Log Akışı',
              ok: (overview.logActivityCount ?? 0) > 0,
              detail: (overview.recentLogs ?? [])[0]
                ? `Son kayıt: ${formatShortDate.format(new Date((overview.recentLogs ?? [])[0].created_at))}`
                : 'Kayıt bulunamadı',
            },
            {
              label: 'Audit Log (24s)',
              ok: (overview.auditLogs24h ?? 0) > 0,
              detail: `${formatNumber.format(overview.auditLogs24h ?? 0)} kayıt`,
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