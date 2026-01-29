'use client';

import type { Order, OrderStats } from '../types';

type TransactionsSectionProps = {
  ordersLoading: boolean;
  orders: Order[];
  orderStats: OrderStats;
  onRefund: (orderId: string) => void;
  renderPapelAmount: (value: number) => React.ReactNode;
};

export default function TransactionsSection({
  ordersLoading,
  orders,
  orderStats,
  onRefund,
  renderPapelAmount,
}: TransactionsSectionProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">İşlemler</h2>
          <p className="text-xs text-white/50">Son hareketleriniz ve özet durum</p>
        </div>
        <span className="rounded-full border border-white/10 bg-[#0b0d12]/60 px-3 py-1 text-[11px] text-white/50">
          Toplam işlem: {orderStats.totalCount}
        </span>
      </div>
      {ordersLoading ? (
        <p className="mt-3 text-sm text-white/60">Yükleniyor...</p>
      ) : orders.length ? (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-[#0b0d12]/60 p-4">
              <p className="text-xs text-white/50">Toplam harcama</p>
              <p className="mt-1 text-lg font-semibold text-white">{renderPapelAmount(orderStats.paidTotal)}</p>
            </div>
            <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4">
              <p className="text-xs text-amber-100/70">Beklemede</p>
              <p className="mt-1 text-lg font-semibold text-amber-100">{orderStats.pendingCount}</p>
            </div>
            <div className="rounded-2xl border border-sky-400/20 bg-sky-500/10 p-4">
              <p className="text-xs text-sky-100/70">İade edilen</p>
              <p className="mt-1 text-lg font-semibold text-sky-100">{orderStats.refundedCount}</p>
            </div>
            <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4">
              <p className="text-xs text-rose-100/70">Başarısız işlem</p>
              <p className="mt-1 text-lg font-semibold text-rose-100">{orderStats.failedCount}</p>
            </div>
          </div>

          <div className="space-y-3">
            {orders.map((order) => {
              const statusLabel =
                order.status === 'paid'
                  ? 'Ödendi'
                  : order.status === 'pending'
                    ? 'Beklemede'
                    : order.status === 'refunded'
                      ? 'İade'
                      : 'Başarısız';
              const statusClass =
                order.status === 'paid'
                  ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
                  : order.status === 'pending'
                    ? 'border-amber-400/30 bg-amber-500/10 text-amber-200'
                    : order.status === 'refunded'
                      ? 'border-sky-400/30 bg-sky-500/10 text-sky-200'
                      : 'border-rose-400/30 bg-rose-500/10 text-rose-200';

              return (
                <div key={order.id} className="rounded-xl border border-white/10 bg-[#0b0d12]/60 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-white/40">İşlem tutarı</p>
                      <p className="mt-1 text-lg font-semibold text-white">{renderPapelAmount(order.amount)}</p>
                      <div className="mt-1 space-y-1 text-xs text-white/40">
                        <p>Referans: {order.id.slice(0, 8).toUpperCase()}</p>
                        <p>Ürün: {order.item_title ?? 'Özel işlem'}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/50">
                      <span className={`rounded-full border px-2 py-1 ${statusClass}`}>{statusLabel}</span>
                      <span className="rounded-full border border-white/10 px-2 py-1">
                        {new Date(order.created_at).toLocaleString('tr-TR')}
                      </span>
                      {order.expires_at && (
                        <span className="rounded-full border border-white/10 px-2 py-1">
                          Süre bitişi: {new Date(order.expires_at).toLocaleString('tr-TR')}
                        </span>
                      )}
                    </div>
                  </div>
                  {order.status === 'failed' && order.failure_reason && (
                    <p className="mt-2 text-xs text-rose-300">Başarısız: {order.failure_reason}</p>
                  )}
                  {order.status === 'pending' && order.can_refund && (
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => onRefund(order.id)}
                        className="rounded-full border border-white/10 px-3 py-1 text-[11px] text-white/60 transition hover:border-white/30 hover:text-white"
                      >
                        İade Et
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="mt-3 text-sm text-white/60">Henüz mağaza işleminiz bulunmuyor.</p>
      )}
    </section>
  );
}
