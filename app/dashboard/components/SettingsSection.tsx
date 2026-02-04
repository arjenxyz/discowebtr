'use client';

type SettingsSectionProps = {
  onOpenPromotionsModal: () => void;
  onOpenDiscountsModal: () => void;
};

export default function SettingsSection({ onOpenPromotionsModal, onOpenDiscountsModal }: SettingsSectionProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6">
      <h2 className="text-lg font-semibold">Ayarlar</h2>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="text-sm text-white/60">
            Buradan promosyon veya indirim kodu ekleyebilirsiniz. Kod ekleme işlemi ilgili modali açarak yapılır.
          </p>
          <div className="mt-4 rounded-2xl border border-white/10 bg-[#0b0d12]/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300">Kod Yönetimi</p>
            <p className="mt-2 text-sm text-white/60">Promosyon veya indirim kodunu eklemek için aşağıdaki seçenekleri kullanın.</p>
            <div className="mt-3">
              <p className="text-sm text-white/60">Promosyon ve indirim kodlarını eklemek için lütfen sağ üstteki hesap menüsündeki <span className="font-semibold text-white">Promosyon</span> veya <span className="font-semibold text-white">İndirim kodu</span> seçeneklerine tıklayın.</p>
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
