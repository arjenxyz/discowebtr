'use client';

type SettingsSectionProps = {
  promoCode: string;
  promoError: string | null;
  promoSuccess: string | null;
  promoLoading: boolean;
  onPromoChange: (value: string) => void;
  onApplyPromo: () => void;
};

export default function SettingsSection({
  promoCode,
  promoError,
  promoSuccess,
  promoLoading,
  onPromoChange,
  onApplyPromo,
}: SettingsSectionProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h2 className="text-lg font-semibold">Ayarlar</h2>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="text-sm text-white/60">
            Bu bölümde hesap verileri gösterilmez. Kişisel bilgileriniz ve hesap hareketleriniz güvenli şekilde ayrı
            alanlarda tutulur.
          </p>
          <div className="mt-4 rounded-2xl border border-white/10 bg-[#0b0d12]/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300">Promosyon Kodu</p>
            <p className="mt-2 text-sm text-white/60">Aktif bir promosyon kodunuz varsa buradan ekleyebilirsiniz.</p>
            <div className="mt-3 space-y-3">
              <input
                value={promoCode}
                onChange={(event) => onPromoChange(event.target.value)}
                placeholder="PROMO2026"
                className="w-full rounded-xl border border-white/10 bg-[#0b0d12]/70 px-4 py-2 text-sm text-white/80 focus:border-indigo-400 focus:outline-none"
              />
              {promoError && <p className="text-xs text-rose-300">{promoError}</p>}
              {promoSuccess && <p className="text-xs text-emerald-300">{promoSuccess}</p>}
              <button
                type="button"
                onClick={onApplyPromo}
                disabled={promoLoading}
                className="w-full rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {promoLoading ? 'Kontrol ediliyor...' : 'Kodu Ekle'}
              </button>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#0b0d12]/60 p-4 text-sm text-white/60">
          Hesap detayları bu ekranda görüntülenmez.
        </div>
      </div>
    </section>
  );
}
