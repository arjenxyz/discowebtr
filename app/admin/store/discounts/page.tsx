'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Discount = {
  id: string;
  code: string;
  percent: number;
  max_uses: number | null;
  used_count: number;
  status: 'active' | 'disabled' | 'expired';
  expires_at: string | null;
  created_at: string;
};

export default function AdminStoreDiscountsPage() {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const response = await fetch('/api/admin/discounts');
    if (response.ok) {
      const data = (await response.json()) as Discount[];
      setDiscounts(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleDelete = async (id: string) => {
    await fetch('/api/admin/discounts', {
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
          <h1 className="mt-2 text-2xl font-semibold">İndirim Listesi</h1>
          <p className="mt-1 text-sm text-white/60">Aktif indirim kodlarını yönetin.</p>
        </div>
        <Link
          href="/admin/store/discounts/new"
          className="rounded-full border border-white/10 px-4 py-2 text-xs text-white/60 transition hover:border-white/30 hover:text-white"
        >
          Yeni İndirim
        </Link>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-semibold">İndirimler</h2>
        {loading ? (
          <p className="mt-3 text-sm text-white/60">Yükleniyor...</p>
        ) : (
          <div className="mt-4 space-y-3">
            {discounts.map((discount) => (
              <div key={discount.id} className="rounded-xl border border-white/10 bg-[#0b0d12]/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-white/80">{discount.code}</p>
                  <span className="text-xs text-white/40">%{discount.percent}</span>
                </div>
                <p className="mt-2 text-xs text-white/50">
                  {discount.expires_at
                    ? `Bitiş: ${new Date(discount.expires_at).toLocaleString('tr-TR')}`
                    : 'Süresiz'}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <span className="rounded-full border border-white/10 px-2 py-1 text-[11px] text-white/50">
                    {discount.status}
                  </span>
                  <span className="rounded-full border border-white/10 px-2 py-1 text-[11px] text-white/50">
                    {discount.max_uses
                      ? `Limit: ${discount.used_count}/${discount.max_uses}`
                      : `Limit: sınırsız (kullanım: ${discount.used_count})`}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDelete(discount.id)}
                    className="rounded-full border border-white/10 px-3 py-1 text-[11px] text-white/50 transition hover:border-white/30 hover:text-white"
                  >
                    Sil
                  </button>
                </div>
              </div>
            ))}
            {discounts.length === 0 && <p className="text-sm text-white/50">Henüz indirim yok.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
