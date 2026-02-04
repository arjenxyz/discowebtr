'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

type PendingOrder = {
  id: string;
  user_id: string;
  user: {
    id: string;
    username: string;
    avatar: string | null;
  };
  amount: number;
  status: 'pending' | 'paid' | 'refunded' | 'failed';
  created_at: string;
  item_title: string | null;
  role_id: string;
  duration_days: number;
  applied_at?: string | null;
  has_role: boolean;
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
          <div className="mt-4 space-y-4">
            {stuckOrders.map((order) => (
              <div key={order.id} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6 transition-all duration-300 hover:border-white/20 hover:shadow-lg hover:shadow-white/5">
                {/* Background gradient effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-red-500/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                <div className="relative">
                  {/* Header with user info and timestamp */}
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-4">
                      {/* User Avatar */}
                      <div className="relative">
                        {order.user.avatar ? (
                          <img
                            src={order.user.avatar}
                            alt={order.user.username}
                            className="w-12 h-12 rounded-full ring-2 ring-white/10 transition-all duration-300 group-hover:ring-white/20"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 ring-2 ring-white/10 flex items-center justify-center">
                            <span className="text-white font-semibold text-lg">
                              {order.user.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        {/* Warning status indicator for stuck orders */}
                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-orange-500 rounded-full border-2 border-[#0b0d12]" />
                      </div>

                      {/* User Info */}
                      <div>
                        <h3 className="text-lg font-semibold text-white group-hover:text-white/90 transition-colors">
                          {order.user.username}
                        </h3>
                        <p className="text-sm text-white/60 font-mono">
                          {order.user.id}
                        </p>
                      </div>
                    </div>

                    {/* Timestamp */}
                    <div className="text-right">
                      <div className="text-sm text-white/60">
                        {new Date(order.created_at).toLocaleDateString('tr-TR')}
                      </div>
                      <div className="text-xs text-white/40">
                        {new Date(order.created_at).toLocaleTimeString('tr-TR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Order Details */}
                  <div className="mb-4">
                    <h4 className="text-base font-medium text-white/90 mb-3">
                      {order.item_title ?? 'Özel İşlem'}
                    </h4>

                    <div className="flex flex-wrap gap-2">
                      {/* Amount Badge */}
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                        <span className="text-amber-400 font-semibold">{order.amount}</span>
                        <Image src="/papel.gif" alt="papel" width={16} height={16} className="w-4 h-4" />
                      </div>

                      {/* Role Badge with Status */}
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20">
                        <span className="text-blue-400 text-sm">Rol:</span>
                        <span className="text-blue-300 font-mono text-sm">{order.role_id}</span>
                        {order.has_role && (
                          <div className="flex items-center gap-1 ml-1">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                            <span className="text-emerald-400 text-xs">Sahip</span>
                          </div>
                        )}
                      </div>

                      {/* Duration Badge */}
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20">
                        <span className="text-purple-400 text-sm">
                          {order.duration_days === 0 ? 'Süresiz' : `${order.duration_days} gün`}
                        </span>
                      </div>

                      {/* Status Badge for Stuck Orders */}
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20">
                        <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                        <span className="text-orange-400 text-sm">Rol Atanmamış</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Message */}
                  <div className="pt-4 border-t border-white/10">
                    <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                      <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <span className="text-orange-300 text-sm font-medium">
                        Bu sipariş onaylandı ancak rol atanmadı. Bot çalışmıyor olabilir.
                      </span>
                    </div>
                  </div>
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
