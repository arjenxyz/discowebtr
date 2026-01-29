'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type StoreItem = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  status: 'active' | 'inactive';
  role_id: string | null;
  duration_days: number;
  created_at: string;
};

export default function AdminStoreProductsPage() {
  const router = useRouter();
  const [items, setItems] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const response = await fetch('/api/admin/store-items');
    if (response.ok) {
      const data = (await response.json()) as StoreItem[];
      setItems(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleDeleteItem = async (id: string) => {
    await fetch('/api/admin/store-items', {
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
          <h1 className="mt-2 text-2xl font-semibold">Ürün Listesi</h1>
          <p className="mt-1 text-sm text-white/60">Mevcut ürünleri görüntüleyin ve düzenleyin.</p>
        </div>
        <Link
          href="/admin/store/products/new"
          className="rounded-full border border-white/10 px-4 py-2 text-xs text-white/60 transition hover:border-white/30 hover:text-white"
        >
          Yeni Ürün
        </Link>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-semibold">Ürünler</h2>
        {loading ? (
          <p className="mt-3 text-sm text-white/60">Yükleniyor...</p>
        ) : (
          <div className="mt-4 space-y-3">
            {items.map((item) => (
              <div key={item.id} className="rounded-xl border border-white/10 bg-[#0b0d12]/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-white/80">{item.title}</p>
                  <span className="text-xs text-white/40">{item.price} papel</span>
                </div>
                {item.description && <p className="mt-2 text-sm text-white/60">{item.description}</p>}
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <span className="rounded-full border border-white/10 px-2 py-1 text-[11px] text-white/50">
                    {item.status === 'active' ? 'Aktif' : 'Pasif'}
                  </span>
                  <span className="rounded-full border border-white/10 px-2 py-1 text-[11px] text-white/50">
                    {item.duration_days === 0 ? 'Süresiz' : `${item.duration_days} gün`}
                  </span>
                  <span className="rounded-full border border-white/10 px-2 py-1 text-[11px] text-white/50">
                    Rol: {item.role_id}
                  </span>
                  <button
                    type="button"
                    onClick={() => router.push(`/admin/store/products/new?edit=${item.id}`)}
                    className="rounded-full border border-white/10 px-3 py-1 text-[11px] text-white/50 transition hover:border-white/30 hover:text-white"
                  >
                    Düzenle
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteItem(item.id)}
                    className="rounded-full border border-white/10 px-3 py-1 text-[11px] text-white/50 transition hover:border-white/30 hover:text-white"
                  >
                    Sil
                  </button>
                </div>
              </div>
            ))}
            {items.length === 0 && <p className="text-sm text-white/50">Henüz ürün yok.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
