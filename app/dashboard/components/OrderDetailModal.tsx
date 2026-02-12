import React from 'react';
import { LuX } from 'react-icons/lu';

type OrderItem = {
  title: string;
  qty: number;
  price: number;
  total: number;
};

type Order = {
  id: string | number;
  amount: number;
  status: string;
  items?: OrderItem[];
  failure_reason?: string | null;
  created_at: string | Date;
  expires_at?: string | Date | null;
  details_url?: string;
};

export default function OrderDetailModal({ order, onClose } : { order: Order; onClose: () => void }) {
  if (!order) return null;
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 max-w-lg w-full bg-[#0b0d12] border border-white/10 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold">Sipariş Detayı</h3>
            <p className="text-xs text-white/40 mt-1">Referans: {order.id}</p>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white"><LuX className="w-5 h-5"/></button>
        </div>

        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-white/40">Tutar</p>
              <p className="font-semibold text-white">{Number(order.amount).toFixed(2)} Papel</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-white/40">Durum</p>
              <p className="font-semibold">{order.status}</p>
            </div>
          </div>

          {order.items && order.items.length > 0 && (
            <div className="p-3 bg-black/20 rounded-lg border border-white/5">
              <p className="text-sm font-bold">Ürünler</p>
              <ul className="mt-2 space-y-2 text-sm text-white/80">
                {order.items.map((it: OrderItem, idx: number) => (
                  <li key={idx} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{it.title}</p>
                      <p className="text-xs text-white/50">{it.qty} × {Number(it.price).toFixed(2)} Papel</p>
                    </div>
                    <div className="font-semibold">{Number(it.total).toFixed(2)} Papel</div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {order.failure_reason && (
            <div className="p-3 bg-rose-500/10 rounded-lg border border-rose-500/20 text-rose-300 text-sm">
              Hata: {order.failure_reason}
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-white/40">
            <div>Oluşturulma: {new Date(order.created_at).toLocaleString('tr-TR')}</div>
            {order.expires_at && <div>Bitiş: {new Date(order.expires_at).toLocaleString('tr-TR')}</div>}
          </div>

          <div className="mt-4 flex justify-end">
            <a href={order.details_url ?? '#'} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-[11px] text-white/60 hover:border-white/30 hover:text-white" target="_blank" rel="noreferrer">Detay Sayfasına Git</a>
          </div>
        </div>
      </div>
    </div>
  );
}