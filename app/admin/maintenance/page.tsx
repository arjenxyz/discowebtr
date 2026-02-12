'use client';

import { useEffect, useMemo, useState } from 'react';

type MaintenanceFlag = {
  id: string;
  key: string;
  is_active: boolean;
  reason: string | null;
  updated_by: string | null;
  updated_at: string;
};

type UpdaterProfile = {
  id: string;
  name: string;
  avatarUrl: string;
};

const LABELS: Record<string, string> = {
  site: 'Site Geneli',
  store: 'Mağaza',
  transactions: 'İşlemler',
  tracking: 'Mağaza Takip',
  promotions: 'Promosyon',
  discounts: 'İndirim Kodu',
  transfers: 'Papel Gönder',
  bot: 'Discord Bot',
};

const DESCRIPTION: Record<string, string> = {
  site: 'Tüm paneli bakım moduna alır.',
  store: 'Mağaza sayfaları ve satın alma akışları.',
  transactions: 'İşlem ve geçmiş ekranları.',
  tracking: 'Mağaza takip ve rol süreleri.',
  promotions: 'Promosyon kodu kullanımı.',
  discounts: 'İndirim kodu kullanımı.',
  transfers: 'Papel gönderme işlemleri.',
  bot: 'Discord botunun durumunu değiştirir.',
};

export default function AdminMaintenancePage() {
  const [flags, setFlags] = useState<MaintenanceFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [updaterProfiles, setUpdaterProfiles] = useState<Record<string, UpdaterProfile>>({});
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'short' }),
    [],
  );
  const activeCount = useMemo(() => flags.filter((flag) => flag.is_active).length, [flags]);
  const lastUpdated = useMemo(() => {
    if (!flags.length) {
      return null;
    }
    const newest = [...flags].sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    )[0];
    return newest?.updated_at ?? null;
  }, [flags]);

  const sortedFlags = useMemo(
    () => [...flags].sort((a, b) => a.key.localeCompare(b.key)),
    [flags],
  );

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/admin/maintenance');
        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as { error?: string; detail?: string };
          if (response.status === 403) {
            setError('Bu sayfaya erişim yetkiniz yok.');
          } else {
            setError(`Bakım ayarları yüklenemedi. ${payload.detail ?? ''}`.trim());
          }
          setLoading(false);
          return;
        }
        const data = (await response.json()) as {
          flags: MaintenanceFlag[];
          updaterProfiles?: Record<string, UpdaterProfile>;
        };
        setFlags(data.flags ?? []);
        setUpdaterProfiles(data.updaterProfiles ?? {});
      } catch {
        setError('Bakım ayarları yüklenemedi.');
      }
      setLoading(false);
    };

    load();
  }, []);

  const updateFlag = async (flag: MaintenanceFlag, next: boolean) => {
    setSavingKey(flag.key);
    setError(null);
    try {
      const response = await fetch('/api/admin/maintenance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: flag.key, is_active: next, reason: flag.reason ?? null }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { detail?: string };
        setError(`Güncelleme başarısız oldu. ${payload.detail ?? ''}`.trim());
        setSavingKey(null);
        return;
      }
      const data = (await response.json()) as {
        flags: MaintenanceFlag[];
        updaterProfiles?: Record<string, UpdaterProfile>;
      };
      setFlags(data.flags ?? []);
      setUpdaterProfiles(data.updaterProfiles ?? {});
    } catch {
      setError('Güncelleme başarısız oldu.');
    }
    setSavingKey(null);
  };

  const updateReason = async (flag: MaintenanceFlag, reason: string) => {
    setSavingKey(flag.key);
    setError(null);
    try {
      const response = await fetch('/api/admin/maintenance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: flag.key, is_active: flag.is_active, reason }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { detail?: string };
        setError(`Not güncellenemedi. ${payload.detail ?? ''}`.trim());
        setSavingKey(null);
        return;
      }
      const data = (await response.json()) as {
        flags: MaintenanceFlag[];
        updaterProfiles?: Record<string, UpdaterProfile>;
      };
      setFlags(data.flags ?? []);
      setUpdaterProfiles(data.updaterProfiles ?? {});
    } catch {
      setError('Not güncellenemedi.');
    }
    setSavingKey(null);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300">Admin</p>
        <h1 className="mt-2 text-2xl font-semibold">Bakım Yönetimi</h1>
        <p className="mt-1 text-sm text-white/60">
          Bu panel yalnızca admin + bakım yetki rolü olan kişiler içindir. Kritik modülleri bakım moduna alabilirsiniz.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
          Bakım ayarları yükleniyor...
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/40">Aktif bakım</p>
              <p className="mt-2 text-2xl font-semibold text-white">{activeCount}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/40">Toplam modül</p>
              <p className="mt-2 text-2xl font-semibold text-white">{flags.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/40">Son güncelleme</p>
              <p className="mt-2 text-sm text-white/80">
                {lastUpdated ? dateFormatter.format(new Date(lastUpdated)) : 'Bilinmiyor'}
              </p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {sortedFlags.map((flag) => (
              <div key={flag.key} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{LABELS[flag.key] ?? flag.key}</p>
                    <p className="mt-1 text-xs text-white/50">
                      {DESCRIPTION[flag.key] ?? 'Modül bakım kontrolü.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateFlag(flag, !flag.is_active)}
                    disabled={savingKey === flag.key}
                    className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                      flag.is_active
                        ? 'bg-rose-500/15 text-rose-200 hover:bg-rose-500/25'
                        : 'bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25'
                    }`}
                  >
                    {savingKey === flag.key ? 'Güncelleniyor...' : flag.is_active ? 'Bakımı Kapat' : 'Bakımı Aç'}
                  </button>
                </div>
                <div className="mt-4">
                  <label className="text-[11px] uppercase tracking-[0.2em] text-white/40">Not</label>
                  <textarea
                    className="mt-2 min-h-[70px] w-full rounded-xl border border-white/10 bg-[#0b0d12]/60 px-3 py-2 text-xs text-white/80 placeholder:text-white/40"
                    placeholder="Bakım nedeni veya planlanan süre..."
                    value={flag.reason ?? ''}
                    onChange={(event) => updateReason(flag, event.target.value)}
                  />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-white/40">
                  <span>Durum: {flag.is_active ? 'Aktif bakım' : 'Normal'}</span>
                  <span>Son güncelleme: {dateFormatter.format(new Date(flag.updated_at))}</span>
                  <span className="flex items-center gap-2">
                    {flag.updated_by && updaterProfiles[flag.updated_by] ? (
                      <>
                        <img
                          src={updaterProfiles[flag.updated_by].avatarUrl}
                          alt="avatar"
                          className="h-5 w-5 rounded-full border border-white/10"
                        />
                        <span>Güncelleyen: {updaterProfiles[flag.updated_by].name}</span>
                      </>
                    ) : (
                      <span>Güncelleyen: {flag.updated_by ?? 'Bilinmiyor'}</span>
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
