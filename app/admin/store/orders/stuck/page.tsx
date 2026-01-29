'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type PendingOrder = {
  id: string;
  user_id: string;
  amount: number;
  status: 'pending' | 'paid' | 'refunded' | 'failed';
  created_at: string;
  item_title: string | null;
  role_id: string;
  duration_days: number;
  applied_at?: string | null;
};

export default function AdminStoreStuckOrdersPage() {
  const [stuckOrders, setStuckOrders] = useState<PendingOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const response = await fetch('/api/admin/store-orders');
    if (response.ok) {
      const data = (await response.json()) as
        | PendingOrder[]
        | { pending: PendingOrder[]; stuck: PendingOrder[] };
      if (Array.isArray(data)) {
        setStuckOrders([]);
      } else {
        setStuckOrders(data.stuck ?? []);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300">Mağaza</p>
          <h1 className="mt-2 text-2xl font-semibold">Sorunlu Siparişler</h1>
          <p className="mt-1 text-sm text-white/60">Onaylı ama rol atanmamış siparişler.</p>
        </div>
        <Link
          href="/admin/store/orders/pending"
          className="rounded-full border border-white/10 px-4 py-2 text-xs text-white/60 transition hover:border-white/30 hover:text-white"
        >
          Bekleyen İşlemler
        </Link>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-semibold">Onaylı ama Rol Atanmamış Siparişler</h2>
        <p className="mt-1 text-xs text-white/50">Bot çalışmadığında burada görünür.</p>
        {loading ? (
          <p className="mt-3 text-sm text-white/60">Yükleniyor...</p>
        ) : (
          <div className="mt-4 space-y-3">
            {stuckOrders.map((order) => (
              <div key={order.id} className="rounded-xl border border-white/10 bg-[#0b0d12]/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-white/80">{order.item_title ?? 'Özel işlem'}</p>
                    <p className="text-xs text-white/40">Üye: {order.user_id}</p>
                  </div>
                  <span className="text-xs text-white/60">{new Date(order.created_at).toLocaleString('tr-TR')}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-white/50">
                  <span className="rounded-full border border-white/10 px-2 py-1">{order.amount} papel</span>
                  <span className="rounded-full border border-white/10 px-2 py-1">Rol: {order.role_id}</span>
                  <span className="rounded-full border border-white/10 px-2 py-1">
                    {order.duration_days === 0 ? 'Süresiz' : `${order.duration_days} gün`}
                  </span>
                </div>
              </div>
            ))}
            {stuckOrders.length === 0 && <p className="text-sm text-white/50">Sorunlu işlem yok.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
