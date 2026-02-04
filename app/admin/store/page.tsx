import Link from 'next/link';

const QUICK_LINKS = [
  {
    href: '/admin/store/products/new',
    title: 'Yeni Ürün Oluştur',
    description: 'Ürün başlığı, rol ID ve fiyat bilgisini tanımlayın.',
  },
  {
    href: '/admin/store/promos/new',
    title: 'Promosyon Kodu Oluştur',
    description: 'Papel paketlerini ve kullanım limitlerini yönetin.',
  },
  {
    href: '/admin/store/discounts/new',
    title: 'İndirim Kodu Oluştur',
    description: 'Yüzde indirim ve kampanya süresi ayarlayın.',
  },
  {
    href: '/admin/store/orders/pending',
    title: 'Bekleyen İşlemler',
    description: 'Onay bekleyen mağaza işlemlerini kontrol edin.',
  },
  {
    href: '/admin/store/orders/failed',
    title: 'Başarısız İşlemler',
    description: 'Sistem hatalarından dolayı başarısız olan işlemleri görün.',
  },
  {
    href: '/admin/store/orders/stuck',
    title: 'Sorunlu İşlemler',
    description: 'Rol atanmamış onaylı işlemleri takip edin.',
  },
  {
    href: '/admin/store/products',
    title: 'Ürün Listesi',
    description: 'Mevcut ürünleri düzenleyin ve silin.',
  },
  {
    href: '/admin/store/promos',
    title: 'Promosyon Listesi',
    description: 'Aktif/pasif promosyon kodlarını yönetin.',
  },
  {
    href: '/admin/store/discounts',
    title: 'İndirim Listesi',
    description: 'Tüm indirim kodlarının durumunu görün.',
  },
];

export default function AdminStorePage() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300">Admin</p>
        <h1 className="mt-2 text-2xl font-semibold">Mağaza Yönetimi</h1>
        <p className="mt-1 text-sm text-white/60">Her özelliğe ayrı sayfadan erişin.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {QUICK_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="group flex flex-col justify-between rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:border-indigo-400/40 hover:bg-white/10"
          >
            <div>
              <h2 className="text-lg font-semibold text-white">{link.title}</h2>
              <p className="mt-2 text-sm text-white/60">{link.description}</p>
            </div>
            <span className="mt-6 text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300/80">
              Sayfaya Git
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
