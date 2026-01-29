'use client';

import type { PurchaseFeedback, StoreItem } from '../types';

type StoreSectionProps = {
  storeLoading: boolean;
  items: StoreItem[];
  purchaseLoadingId: string | null;
  purchaseFeedback: PurchaseFeedback;
  onPurchase: (itemId: string) => void;
  renderPapelAmount: (value: number) => React.ReactNode;
};

export default function StoreSection({
  storeLoading,
  items,
  purchaseLoadingId,
  purchaseFeedback,
  onPurchase,
  renderPapelAmount,
}: StoreSectionProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Mağaza</h2>
      </div>
      {storeLoading ? (
        <p className="mt-3 text-sm text-white/60">Yükleniyor...</p>
      ) : (
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-white/70">Ürünler</h3>
          {items.length ? (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {items.map((item) => (
                <div key={item.id} className="rounded-xl border border-white/10 bg-[#0b0d12]/60 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-white/80">{item.title}</p>
                    <span className="text-xs text-white/80">{renderPapelAmount(item.price)}</span>
                  </div>
                  {item.description && <p className="mt-2 text-xs text-white/50">{item.description}</p>}
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-white/50">
                    <span className="rounded-full border border-white/10 px-2 py-1">
                      {item.duration_days === 0 ? 'Süresiz' : `${item.duration_days} gün`}
                    </span>
                    {item.role_id && (
                      <span className="rounded-full border border-white/10 px-2 py-1">Rol: {item.role_id}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onPurchase(item.id)}
                    disabled={purchaseLoadingId === item.id}
                    className={`mt-3 w-full rounded-xl px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      purchaseFeedback[item.id]?.status === 'success'
                        ? 'bg-emerald-500 hover:bg-emerald-400'
                        : purchaseFeedback[item.id]?.status === 'error'
                          ? 'bg-rose-500 hover:bg-rose-400'
                          : 'bg-indigo-500 hover:bg-indigo-400'
                    }`}
                  >
                    {purchaseLoadingId === item.id
                      ? 'İşleniyor...'
                      : purchaseFeedback[item.id]?.message ?? 'Satın Al'}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-white/60">Henüz ürün yok.</p>
          )}
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300">Bilgilendirme</p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>Papel nedir, nasıl kasılır, nasıl harcanır gibi sorular için bilgilendirme kanalını inceleyin.</li>
              <li>Aylık wall thread başlatıcı ve yazarı için bilgilendirmeyi okuyun.</li>
              <li>Doğum günü rolünü almadan önce kuralları inceleyin.</li>
              <li>Podcast, yarışma, turnuva gibi etkinliklerde ping almak isterseniz pingasm rolünü kullanın.</li>
              <li>XP rollerini bırakmak için ilgili talep kanalını kullanın.</li>
              <li>Market&apos;te &lt;&gt; içinde süre yazıyorsa rol o süre kadar profilinizde kalır.</li>
              <li>Yetkileri suistimal eden kullanıcıların rolleri süreleri bitmeden kaldırılabilir.</li>
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
