const QUICK_CARDS = [
  {
    title: 'Hızlı Başlangıç',
    description: 'Admin paneline giriş, rol onayı ve ilk yapılandırma adımları.',
  },
  {
    title: 'Mağaza Yönetimi',
    description: 'Ürün, promosyon ve indirim kodlarının tam akışı.',
  },
  {
    title: 'Log ve Güvenlik',
    description: 'Webhook kanalları ve güvenlik en iyi uygulamaları.',
  },
];

const DOCS_SECTIONS = [
  {
    id: 'baslangic',
    title: 'Hızlı Başlangıç',
    description: 'Yetkili panelini ilk kez kullananlar için temel adımlar.',
    steps: [
      'Discord üzerinden giriş yapın ve yetkili rolünüzü doğrulayın.',
      'Log Kanal Ayarları sayfasında gerekli webhook URL’lerini ekleyin.',
      'Mağaza menüsünden ürünlerinizi oluşturup aktif hale getirin.',
      'Bildirimler menüsünden duyuruları test amaçlı gönderin.',
    ],
  },
  {
    id: 'yetkilendirme',
    title: 'Yetkilendirme ve Rol Onayı',
    description: 'Admin erişimi, rol kontrolü ve otomatik onay akışı.',
    bullets: [
      'Admin erişimi `DISCORD_ADMIN_ROLE_ID` ile belirlenir.',
      'Eksik rol durumunda kullanıcı kurallar sayfasına yönlendirilir.',
      'Onay sonrası rol otomatik atanır ve panel erişimi açılır.',
    ],
  },
  {
    id: 'loglar',
    title: 'Log Kanal Yapılandırması',
    description: 'Webhook kanalları ile olayların kategori bazlı izlenmesi.',
    bullets: [
      'Ana kanal tüm olayların özetini alır.',
      '`auth`, `roles`, `system`, `suspicious`, `store`, `wallet`, `notifications`, `settings` kanalları detaylı log üretir.',
      'Aynı webhook URL birden fazla kanala atanamaz.',
      'Webhook Testi ile bağlantıyı doğrulayın.',
    ],
  },
  {
    id: 'magaza',
    title: 'Mağaza Yönetimi',
    description: 'Ürün, promosyon ve indirim kodu yönetimi.',
    bullets: [
      'Yeni ürün oluştururken rol adıyla arama yapabilir, ID otomatik doldurulur.',
      'Promosyonlar papel paketi sunar, kullanım limitleri tanımlanabilir.',
      'İndirim kodları yüzde bazlıdır ve süre/limit ayarlanabilir.',
      'Pasif ürünler listede görünür ama satın alınamaz.',
    ],
  },
  {
    id: 'siparis',
    title: 'Sipariş Yönetimi',
    description: 'Bekleyen ve sorunlu siparişlerin kontrolü.',
    bullets: [
      'Bekleyen siparişler manuel onay/ret akışına sahiptir.',
      'Sorunlu siparişler rol atanmamış onaylı işlemleri gösterir.',
      'Bot offline kaldığında sorunlu sipariş listesi artabilir.',
    ],
  },
  {
    id: 'bildirim',
    title: 'Bildirimler',
    description: 'Duyuru gönderimi ve geçmiş kayıtları.',
    bullets: [
      'Bildirim Gönder sayfasından hedef kitle seçilir.',
      'Bildirim Geçmişi sayfasında silme ve durum takibi yapılır.',
      'Bildirimler log kanalına da düşer.',
    ],
  },
  {
    id: 'cuzdan',
    title: 'Cüzdan ve Transfer',
    description: 'Üye transferleri ve limit/vergilendirme.',
    bullets: [
      'Günlük transfer limiti ve vergi oranı ayarlardan yönetilir.',
      'Transferler otomatik loglanır ve üyeye bildirilir.',
    ],
  },
  {
    id: 'magaza-takip',
    title: 'Mağaza Takip (Üye Paneli)',
    description: 'Rol sürelerini ve kalan zamanı takip etme.',
    bullets: [
      'Aynı rolün tekrar satın alınmasıyla süreler üst üste eklenir.',
      'Geri sayım tek rol için toplam süre üzerinden çalışır.',
      'Süresiz roller zamanlayıcıya dahil edilmez.',
    ],
  },
  {
    id: 'guvenlik',
    title: 'Güvenlik Notları',
    description: 'Yetkili panelinde önerilen güvenlik uygulamaları.',
    bullets: [
      '`SUPABASE_SERVICE_ROLE_KEY` yalnızca sunucuda saklanmalıdır.',
      'Bot rolü, atanacak rolden daha üstte olmalıdır.',
      'Webhook URL’lerini yalnızca admin ekibi paylaşır.',
    ],
  },
];

const FAQS = [
  {
    q: 'Admin erişimi nasıl verilir?',
    a: '`DISCORD_ADMIN_ROLE_ID` ile belirlenen role sahip kullanıcılar admin paneli görür.',
  },
  {
    q: 'Rol adıyla seçerken rol bulunamıyor, ne yapmalıyım?',
    a: 'Rol adında en az 2 karakter yazın ve botun guild rollerini okuma izni olduğundan emin olun.',
  },
  {
    q: 'Loglar gelmiyor, ne kontrol etmeliyim?',
    a: 'Webhook URL, `SUPABASE_SERVICE_ROLE_KEY` ve kanalın aktif olup olmadığını doğrulayın.',
  },
  {
    q: 'Siparişler neden sorunluya düşer?',
    a: 'Bot offline kalmış olabilir veya rol hiyerarşisi doğru değildir.',
  },
];

export default function AdminGuidePage() {
  return (
    <div className="space-y-10">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300">Admin</p>
        <h1 className="mt-2 text-2xl font-semibold">Kullanım Kılavuzu</h1>
        <p className="mt-2 text-sm text-white/60">Yetkili paneli için kapsamlı yönetim dokümantasyonu.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {QUICK_CARDS.map((card) => (
          <div key={card.title} className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-lg font-semibold">{card.title}</h2>
            <p className="mt-3 text-sm text-white/60">{card.description}</p>
          </div>
        ))}
      </div>

      <div className="space-y-6">
        {DOCS_SECTIONS.map((section) => (
          <section key={section.id} className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{section.title}</h2>
                <p className="mt-1 text-sm text-white/60">{section.description}</p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-white/50">
                {section.id}
              </span>
            </div>
            {section.steps && (
              <ol className="mt-4 space-y-2 text-sm text-white/70">
                {section.steps.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            )}
            {section.bullets && (
              <ul className="mt-4 space-y-2 text-sm text-white/70">
                {section.bullets.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-indigo-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-semibold">Sık Sorulan Sorular</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {FAQS.map((item) => (
            <div key={item.q} className="rounded-xl border border-white/10 bg-[#0b0d12]/60 p-4">
              <p className="text-sm font-semibold">{item.q}</p>
              <p className="mt-2 text-sm text-white/60">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}