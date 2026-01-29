import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { MAINTENANCE_KEYS, getMaintenanceFlags } from '@/lib/maintenance';
import MaintenanceWatcher from './maintenance-watcher';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const LABELS: Record<string, string> = {
  store: 'Mağaza',
  transactions: 'İşlemler',
  tracking: 'Mağaza Takip',
  promotions: 'Promosyon',
  discounts: 'İndirim Kodu',
  transfers: 'Papel Gönder',
};

export default async function MaintenancePage() {
  const data = await getMaintenanceFlags();
  const flags = data?.flags ?? null;

  const GUILD_ID = process.env.DISCORD_GUILD_ID ?? '1465698764453838882';
  const botToken = process.env.DISCORD_BOT_TOKEN;

  const getProfile = async (userId: string) => {
    if (!botToken) {
      return null;
    }

    const response = await fetch(`https://discord.com/api/guilds/${GUILD_ID}/members/${userId}`, {
      headers: { Authorization: `Bot ${botToken}` },
    });

    if (!response.ok) {
      return null;
    }

    const member = (await response.json()) as {
      nick?: string;
      user?: { id: string; username: string; avatar: string | null; global_name?: string | null };
    };

    const id = member.user?.id ?? userId;
    const avatarHash = member.user?.avatar;
    const avatarUrl = avatarHash
      ? `https://cdn.discordapp.com/avatars/${id}/${avatarHash}.png?size=96`
      : `https://cdn.discordapp.com/embed/avatars/${Number(id) % 5}.png`;

    return {
      id,
      name: member.nick ?? member.user?.global_name ?? member.user?.username ?? id,
      avatarUrl,
    };
  };

  const active = flags ? MAINTENANCE_KEYS.filter((key) => key !== 'site' && flags[key].is_active) : [];
  const flagsSignature = flags
    ? MAINTENANCE_KEYS.map((key) => {
        const flag = flags[key];
        return `${key}:${flag.is_active ? 1 : 0}:${flag.reason ?? ''}:${flag.updated_at ?? ''}`;
      }).join('|')
    : 'none';
  const updaterIds = flags
    ? MAINTENANCE_KEYS.map((key) => flags[key].updated_by).filter((value): value is string => Boolean(value))
    : [];
  const uniqueIds = [...new Set(updaterIds)];
  const profiles = await Promise.all(uniqueIds.map(async (id) => [id, await getProfile(id)]));
  const updaterProfiles = Object.fromEntries(
    profiles.filter(([, profile]) => profile).map(([id, profile]) => [id, profile]),
  ) as Record<string, { id: string; name: string; avatarUrl: string }>;
  const isSiteMaintenance = Boolean(flags?.site?.is_active);
  const siteTemplateMessage =
    'Üye paneli genel bakımda. Güvenlik ve performans için tüm dashboard servisleri geçici olarak durduruldu. Bakım tamamlandığında erişim otomatik olarak açılacaktır.';
  const siteUpdaterId = flags?.site?.updated_by;
  const siteUpdater = siteUpdaterId ? updaterProfiles[siteUpdaterId] : undefined;

  if (!isSiteMaintenance && active.length === 0) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-[#0b0d12] text-white">
      <MaintenanceWatcher signature={flagsSignature} />
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
        <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-8 shadow-[0_30px_80px_rgba(10,12,18,0.55)]">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-200">Bakım Modu</p>

          <div className="mt-4 rounded-2xl border border-amber-500/20 bg-[#0b0d12]/60 px-4 py-3 text-sm text-amber-100/80">
            <p>
              {isSiteMaintenance
                ? siteTemplateMessage
                : 'Bilgilendirme: Seçili modül bakımda ve ilgili özellikler geçici olarak kapalı.'}
            </p>
            {siteUpdater && (
              <div className="mt-2 flex items-center gap-2 text-xs text-amber-100/70">
                <Image
                  src={siteUpdater.avatarUrl}
                  alt="avatar"
                  width={18}
                  height={18}
                  unoptimized
                  className="h-4.5 w-4.5 rounded-full border border-amber-200/40"
                />
                <span>Bakım sorumlusu: {siteUpdater.name}</span>
              </div>
            )}
          </div>

          {active.length > 0 && (
            <div className="mt-6 space-y-3">
              {active.map((key) => (
                <div
                  key={key}
                  className="rounded-2xl border border-amber-500/20 bg-[#0b0d12]/60 px-4 py-3 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-amber-100">{LABELS[key] ?? key}</p>
                  </div>
                  {flags?.[key].reason && (
                    <p className="mt-1 text-xs text-amber-100/70">{flags[key].reason}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-full border border-amber-300/40 px-4 py-2 text-xs text-amber-100 transition hover:border-amber-200"
            >
              Ana sayfaya dön
            </Link>
            <Link
              href="/dashboard"
              className="rounded-full border border-amber-300/40 px-4 py-2 text-xs text-amber-100 transition hover:border-amber-200"
            >
              Üye paneli
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
