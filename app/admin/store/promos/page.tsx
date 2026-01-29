'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Promotion = {
  id: string;
  code: string;
  value: number;
  max_uses: number | null;
  used_count: number;
  status: 'active' | 'disabled' | 'expired';
  expires_at: string | null;
};

export default function AdminStorePromosPage() {
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const response = await fetch('/api/admin/promotions');
    if (response.ok) {
      const data = (await response.json()) as Promotion[];
      setPromos(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleDeletePromo = async (id: string) => {
    await fetch('/api/admin/promotions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    await load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300">Mağaza</p>
          <h1 className="mt-2 text-2xl font-semibold">Promosyon Listesi</h1>
          <p className="mt-1 text-sm text-white/60">Mevcut promosyon kodlarını yönetin.</p>
        </div>
        <Link
          href="/admin/store/promos/new"
          className="rounded-full border border-white/10 px-4 py-2 text-xs text-white/60 transition hover:border-white/30 hover:text-white"
        >
          Yeni Promosyon
        </Link>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-semibold">Promosyonlar</h2>
        {loading ? (
          <p className="mt-3 text-sm text-white/60">Yükleniyor...</p>
        ) : (
          <div className="mt-4 space-y-3">
            {promos.map((promo) => (
              <div key={promo.id} className="rounded-xl border border-white/10 bg-[#0b0d12]/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-white/80">{promo.code}</p>
                  <span className="text-xs text-white/40">{promo.value} papel</span>
                </div>
                <p className="mt-2 text-xs text-white/50">
                  {promo.expires_at
                    ? `Bitiş: ${new Date(promo.expires_at).toLocaleString('tr-TR')}`
                    : 'Süresiz'}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <span className="rounded-full border border-white/10 px-2 py-1 text-[11px] text-white/50">
                    {promo.status}
                  </span>
                  <span className="rounded-full border border-white/10 px-2 py-1 text-[11px] text-white/50">
                    {promo.max_uses
                      ? `Limit: ${promo.used_count}/${promo.max_uses}`
                      : `Limit: sınırsız (kullanım: ${promo.used_count})`}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeletePromo(promo.id)}
                    className="rounded-full border border-white/10 px-3 py-1 text-[11px] text-white/50 transition hover:border-white/30 hover:text-white"
                  >
                    Sil
                  </button>
                </div>
              </div>
            ))}
            {promos.length === 0 && <p className="text-sm text-white/50">Henüz promosyon yok.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
