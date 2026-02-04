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

export default function AdminStorePendingOrdersPage() {
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingSaving, setPendingSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ orderId: string; user: { username: string } } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const load = async () => {
    const response = await fetch('/api/admin/store-orders');
    if (response.ok) {
      const data = (await response.json()) as
        | PendingOrder[]
        | { pending: PendingOrder[]; stuck: PendingOrder[] };
      if (Array.isArray(data)) {
        setPendingOrders(data);
      } else {
        setPendingOrders(data.pending ?? []);
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

  const handlePendingAction = async (orderId: string, action: 'approve' | 'reject', reason?: string) => {
    setPendingSaving(orderId);
    setError(null);

    const response = await fetch('/api/admin/store-orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, action, reason: reason?.trim() || undefined }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (data.error === 'invalid_status') {
        setError('İşlem artık beklemede değil.');
      } else {
        setError('Bekleyen işlem güncellenemedi.');
      }
      setPendingSaving(null);
      return;
    }

    await load();
    setPendingSaving(null);
  };

  const handleReject = async () => {
    if (!rejectModal || !rejectReason.trim()) return;

    await handlePendingAction(rejectModal.orderId, 'reject', rejectReason);
    setRejectModal(null);
    setRejectReason('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300">Mağaza</p>
          <h1 className="mt-2 text-2xl font-semibold">Bekleyen Siparişler</h1>
          <p className="mt-1 text-sm text-white/60">Onay bekleyen mağaza siparişleri.</p>
        </div>
        <Link
          href="/admin/store/orders/stuck"
          className="rounded-full border border-white/10 px-4 py-2 text-xs text-white/60 transition hover:border-white/30 hover:text-white"
        >
          Sorunlu İşlemler
        </Link>
      </div>

      {error && (
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-semibold">Bekleyen Siparişler</h2>
        {loading ? (
          <p className="mt-3 text-sm text-white/60">Yükleniyor...</p>
        ) : (
          <div className="mt-4 space-y-4">
            {pendingOrders.map((order) => (
              <div key={order.id} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6 transition-all duration-300 hover:border-white/20 hover:shadow-lg hover:shadow-white/5">
                {/* Background gradient effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

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
                        {/* Online status indicator */}
                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full border-2 border-[#0b0d12]" />
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
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => handlePendingAction(order.id, 'approve')}
                      disabled={pendingSaving === order.id}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold text-sm transition-all duration-200 hover:from-emerald-400 hover:to-emerald-500 hover:shadow-lg hover:shadow-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-none"
                    >
                      {pendingSaving === order.id ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Onaylanıyor...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Onayla</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setRejectModal({ orderId: order.id, user: order.user })}
                      disabled={pendingSaving === order.id}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 text-white font-semibold text-sm transition-all duration-200 hover:from-rose-400 hover:to-rose-500 hover:shadow-lg hover:shadow-rose-500/25 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-none"
                    >
                      {pendingSaving === order.id ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>İade Ediliyor...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          <span>İade Et</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {pendingOrders.length === 0 && <p className="text-sm text-white/50">Bekleyen işlem yok.</p>}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b0d12] border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-4">Sipariş İade İşlemi</h3>
            <p className="text-white/60 mb-4">
              <strong>{rejectModal.user.username}</strong> kullanıcısının siparişini iade etmek istediğinize emin misiniz? Tutar kullanıcının hesabına geri yüklenecektir.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-white/80 mb-2">
                İade Sebebi <span className="text-rose-400">*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="İade sebebini açıklayın..."
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:border-white/30 focus:outline-none resize-none"
                rows={3}
                required
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setRejectModal(null);
                  setRejectReason('');
                }}
                className="flex-1 px-4 py-2 rounded-lg border border-white/10 text-white/60 hover:border-white/30 hover:text-white transition-colors"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={!rejectReason.trim() || pendingSaving === rejectModal.orderId}
                className="flex-1 px-4 py-2 rounded-lg bg-blue-500 text-white font-semibold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {pendingSaving === rejectModal.orderId ? 'İade Ediliyor...' : 'İade Et'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
