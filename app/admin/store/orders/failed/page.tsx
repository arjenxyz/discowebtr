'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

type FailedOrder = {
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
  failure_reason: string | null;
  failure_code: string | null;
  retry_count: number;
  error_details?: {
    title: string;
    description: string;
    severity: string;
    context: Record<string, unknown>;
    logged_at: string;
  } | null;
};

export default function AdminStoreFailedOrdersPage() {
  const [failedOrders, setFailedOrders] = useState<FailedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingSaving, setPendingSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refundingAll, setRefundingAll] = useState(false);

  const load = async () => {
    const response = await fetch('/api/admin/store-orders?mode=failed');
    if (response.ok) {
      const data = await response.json() as FailedOrder[];
      setFailedOrders(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleRefundAction = async (orderId: string) => {
    setPendingSaving(orderId);
    setError(null);

    const response = await fetch('/api/admin/store-orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, action: 'refund' }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (data.error === 'invalid_status') {
        setError('İşlem artık başarısız durumda değil.');
      } else {
        setError('İade işlemi gerçekleştirilemedi.');
      }
      setPendingSaving(null);
      return;
    }

    await load();
    setPendingSaving(null);
  };

  const handleRefundAll = async () => {
    if (failedOrders.length === 0) return;

    setRefundingAll(true);
    setError(null);

    let successCount = 0;
    let errorCount = 0;

    for (const order of failedOrders) {
      try {
        const response = await fetch('/api/admin/store-orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: order.id, action: 'refund' }),
        });

        if (response.ok) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch {
        errorCount++;
      }
    }

    if (errorCount > 0) {
      setError(`${successCount} işlem iade edildi, ${errorCount} işlemde hata oluştu.`);
    } else {
      setError(`${successCount} işlem başarıyla iade edildi.`);
    }

    await load();
    setRefundingAll(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300">Mağaza</p>
          <h1 className="mt-2 text-2xl font-semibold">Başarısız Siparişler</h1>
          <p className="mt-1 text-sm text-white/60">İade edilmesi gereken başarısız siparişler.</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/store/orders/pending"
            className="rounded-full border border-white/10 px-4 py-2 text-xs text-white/60 transition hover:border-white/30 hover:text-white"
          >
            Bekleyen
          </Link>
          <Link
            href="/admin/store/orders/stuck"
            className="rounded-full border border-white/10 px-4 py-2 text-xs text-white/60 transition hover:border-white/30 hover:text-white"
          >
            Sorunlu
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      {failedOrders.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Toplu İşlemler</h2>
            <button
              type="button"
              onClick={handleRefundAll}
              disabled={refundingAll}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-semibold text-sm transition-all duration-200 hover:from-amber-400 hover:to-amber-500 hover:shadow-lg hover:shadow-amber-500/25 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {refundingAll ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>İade Ediliyor...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Tümünü İade Et ({failedOrders.length})</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-semibold">Başarısız Siparişler</h2>
        {loading ? (
          <p className="mt-3 text-sm text-white/60">Yükleniyor...</p>
        ) : (
          <div className="mt-4 space-y-4">
            {failedOrders.map((order) => (
              <div key={order.id} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6 transition-all duration-300 hover:border-white/20 hover:shadow-lg hover:shadow-white/5">
                {/* Background gradient effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 via-transparent to-red-500/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                <div className="relative">
                  {/* Header with user info and timestamp */}
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-4">
                      {/* User Avatar */}
                      <div className="relative">
                        {order.user.avatar ? (
                          <Image
                            src={order.user.avatar}
                            alt={order.user.username}
                            width={48}
                            height={48}
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
                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-rose-500 rounded-full border-2 border-[#0b0d12]" />
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

                    {/* Error Information */}
                    <div className="mb-3 space-y-2">
                      {/* Error Details (New System) */}
                      {order.error_details && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                          <div className="flex items-center gap-2 mb-2">
                            <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            <span className="text-sm font-medium text-red-400">{order.error_details.title}</span>
                            <span className={`px-2 py-0.5 text-xs rounded-full ${
                              order.error_details.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-300' :
                              order.error_details.severity === 'HIGH' ? 'bg-orange-500/20 text-orange-300' :
                              order.error_details.severity === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-300' :
                              'bg-blue-500/20 text-blue-300'
                            }`}>
                              {order.error_details.severity}
                            </span>
                          </div>
                          <p className="text-sm text-white/70 mb-2">{order.error_details.description}</p>
                          <div className="flex items-center gap-4 text-xs text-white/50">
                            <span>Error Code: {order.failure_code}</span>
                            <span>Retry Count: {order.retry_count}</span>
                            <span>Logged: {new Date(order.error_details.logged_at).toLocaleString('tr-TR')}</span>
                          </div>
                        </div>
                      )}

                      {/* Legacy Failure Reason */}
                      {order.failure_reason && !order.error_details && (
                        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20">
                          <div className="flex items-center gap-2 mb-1">
                            <svg className="w-4 h-4 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            <span className="text-sm font-medium text-rose-400">Başarısızlık Sebebi</span>
                          </div>
                          <p className="text-sm text-white/70">{order.failure_reason}</p>
                        </div>
                      )}

                      {/* Basic Error Info */}
                      {order.failure_code && !order.error_details && (
                        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-sm font-medium text-amber-400">Hata Kodu: {order.failure_code}</span>
                            <span className="text-xs text-white/50">Retry: {order.retry_count}</span>
                          </div>
                        </div>
                      )}
                    </div>

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
                      onClick={() => handleRefundAction(order.id)}
                      disabled={pendingSaving === order.id}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold text-sm transition-all duration-200 hover:from-blue-400 hover:to-blue-500 hover:shadow-lg hover:shadow-blue-500/25 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-none"
                    >
                      {pendingSaving === order.id ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>İade Ediliyor...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                          </svg>
                          <span>İade Et</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {failedOrders.length === 0 && <p className="text-sm text-white/50">Başarısız sipariş yok.</p>}
          </div>
        )}
      </div>
    </div>
  );
}