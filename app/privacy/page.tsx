"use client";

import { useEffect } from 'react';

export default function PrivacyPage() {
  const LAST_UPDATED = '2 Şubat 2026';
  const AUTHOR = {
    name: 'DiscoWeb Ekibi',
    role: 'Veri Koruma ve Güvenlik',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=DiscoWeb',
    timeAgo: 'Son güncelleme'
  };

  useEffect(() => {
    document.title = 'Gizlilik Politikası - DiscoWeb';
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Top Navigation Bar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="px-6 py-3">
          <div className="flex justify-between items-center">
            {/* Left: Logo */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-black rounded-lg"></div>
              <span className="font-bold text-lg text-gray-900">DiscoWeb</span>
            </div>

            {/* Right: Actions */}
            <div className="flex justify-end">
              <button
                onClick={() => window.history.back()}
                className="px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-900"
              >
                Geri Dön
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout - Two Columns like Discord */}
      <div className="flex mt-14">
        {/* Left Sidebar - Navigation */}
        <aside className="hidden md:block w-80 min-h-screen bg-gray-50 border-r border-gray-200 fixed top-14 left-0 z-40">
          <nav className="p-6">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
              Gizlilik Politikası
            </h2>
            <ul className="space-y-2">
              <li>
                <a href="#intro" className="block text-sm text-gray-600 hover:text-gray-900 py-1">
                  Giriş
                </a>
              </li>
              <li>
                <a href="#about" className="block text-sm text-gray-600 hover:text-gray-900 py-1">
                  DiscoWeb Hakkında
                </a>
              </li>
              <li>
                <a href="#what" className="block text-sm text-gray-600 hover:text-gray-900 py-1">
                  Topladığımız Bilgiler
                </a>
              </li>
              <li>
                <a href="#how-we-use" className="block text-sm text-gray-600 hover:text-gray-900 py-1">
                  Bilgilerimizi Nasıl Kullanıyoruz
                </a>
              </li>
              <li>
                <a href="#sharing" className="block text-sm text-gray-600 hover:text-gray-900 py-1">
                  Bilgilerin Paylaşımı
                </a>
              </li>
              <li>
                <a href="#retention" className="block text-sm text-gray-600 hover:text-gray-900 py-1">
                  Veri Saklama
                </a>
              </li>
              <li>
                <a href="#protection" className="block text-sm text-gray-600 hover:text-gray-900 py-1">
                  Bilgilerin Korunması
                </a>
              </li>
              <li>
                <a href="#control" className="block text-sm text-gray-600 hover:text-gray-900 py-1">
                  Gizliliğinizi Kontrol Etme
                </a>
              </li>
              <li>
                <a href="#contact" className="block text-sm text-gray-600 hover:text-gray-900 py-1">
                  İletişim
                </a>
              </li>
            </ul>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 md:ml-80">
          {/* Article Content */}
          <article className="max-w-4xl px-6 md:px-12 py-6 md:py-12">
            {/* Article Header */}
            <header className="mb-16">
              <h1 className="text-4xl font-bold text-gray-900 mb-6">
                Gizlilik Politikası
              </h1>

              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                DiscoWeb olarak, Discord sunucu yönetim platformumuzda kullanıcı gizliliğini ve veri güvenliğini en üst düzeyde tutmayı taahhüt ederiz.
                Bu politika, hangi verileri topladığımızı, nasıl kullandığımızı ve koruduğumuzu açıklamaktadır.
              </p>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <img
                    src={AUTHOR.avatar}
                    alt={AUTHOR.name}
                    width={24}
                    height={24}
                    className="rounded-full"
                  />
                  <span className="font-medium text-gray-900">{AUTHOR.name}</span>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                  <span className="text-gray-500">•</span>
                  <span>{AUTHOR.role}</span>
                  <span className="text-gray-500">•</span>
                  <span>Son güncelleme: {LAST_UPDATED}</span>
                </div>
              </div>
            </header>

            {/* Article Sections */}
            <div className="space-y-16">
              {/* Introduction */}
              <section id="intro" className="scroll-mt-24">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Giriş
                </h2>
                <p className="text-base text-gray-700 leading-relaxed mb-4">
                  Bu Gizlilik Politikası, kişisel bilgilerinizi hizmetlerimiz aracılığıyla nasıl topladığımızı, kullandığımızı, sakladığımızı, koruduğumuzu ve paylaştığımızı açıklamaktadır.
                  Avrupa Ekonomik Alanı&apos;nda (&quot;EEA&quot;) ikamet ediyorsanız DiscoWeb, hizmetler aracılığıyla toplanan kişisel bilgilerinizin &quot;veri denetleyicisidir&quot;.
                  Diğer herkes için DiscoWeb veri denetleyicisidir. Bu politikanın tamamını okumanız önemlidir ancak şu özetle başlayabilirsiniz:
                </p>
                <ul className="list-disc list-inside text-base text-gray-700 leading-relaxed space-y-2 mb-6">
                  <li>Gizliliğinize çok önem veriyoruz</li>
                  <li>Kişisel bilgilerinizi satmayız</li>
                  <li>Gerekli bilgilerin kapsamını sınırlı tutuyoruz</li>
                  <li>Bilgilerinizi korumak için çaba harcıyoruz</li>
                </ul>
              </section>

              {/* About DiscoWeb */}
              <section id="about" className="scroll-mt-24">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  DiscoWeb Hakkında
                </h2>
                <p className="text-base text-gray-700 leading-relaxed mb-4">
                  DiscoWeb, Discord sunucu yönetimini kolaylaştıran bir web platformudur. Kullanıcıların Discord sunucularını daha etkili yönetmelerine,
                  gelir elde etmelerine ve topluluklarını büyütmelerine yardımcı olur.
                </p>
                <p className="text-base text-gray-700 leading-relaxed">
                  Platformumuz Discord API&#39;sini kullanarak sunucu yönetimi, rol yönetimi, webhook yönetimi ve diğer yönetim özelliklerini sağlar.
                </p>
              </section>

              {/* What Information We Collect */}
              <section id="what" className="scroll-mt-24">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Topladığımız Bilgiler
                </h2>
                <p className="text-base text-gray-700 leading-relaxed mb-4">
                  DiscoWeb&#39;i kullanırken aşağıdaki bilgileri toplayabiliriz:
                </p>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Hesap Bilgileri</h3>
                <ul className="list-disc list-inside text-base text-gray-700 leading-relaxed space-y-1 mb-4">
                  <li>Discord kullanıcı kimliğiniz</li>
                  <li>Kullanıcı adınız ve profil resminiz</li>
                  <li>E-posta adresiniz (Discord üzerinden)</li>
                </ul>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Sunucu Bilgileri</h3>
                <ul className="list-disc list-inside text-base text-gray-700 leading-relaxed space-y-1 mb-4">
                  <li>Yönettiğiniz Discord sunucularının bilgileri</li>
                  <li>Rol ve izin bilgileri</li>
                  <li>Kanal ve webhook bilgileri</li>
                </ul>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Kullanım Bilgileri</h3>
                <ul className="list-disc list-inside text-base text-gray-700 leading-relaxed space-y-1">
                  <li>Platform kullanım istatistikleri</li>
                  <li>Hata raporları ve performans verileri</li>
                  <li>IP adresi ve coğrafi konum bilgileri</li>
                </ul>
              </section>

              {/* How We Use Information */}
              <section id="how-we-use" className="scroll-mt-24">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Bilgilerimizi Nasıl Kullanıyoruz
                </h2>
                <p className="text-base text-gray-700 leading-relaxed mb-4">
                  Topladığımız bilgileri aşağıdaki amaçlar için kullanırız:
                </p>
                <ul className="list-disc list-inside text-base text-gray-700 leading-relaxed space-y-2">
                  <li>Hizmetlerimizi sunmak ve geliştirmek</li>
                  <li>Kullanıcı hesaplarını yönetmek ve güvenliği sağlamak</li>
                  <li>Discord sunucu yönetim özelliklerini sağlamak</li>
                  <li>Müşteri desteği sunmak</li>
                  <li>Yasal yükümlülükleri yerine getirmek</li>
                  <li>Dolandırıcılık ve kötüye kullanımı önlemek</li>
                </ul>
              </section>

              {/* Information Sharing */}
              <section id="sharing" className="scroll-mt-24">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Bilgilerin Paylaşımı
                </h2>
                <p className="text-base text-gray-700 leading-relaxed mb-4">
                  Kişisel bilgilerinizi aşağıdaki durumlarda paylaşabiliriz:
                </p>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Hizmet Sağlayıcıları</h3>
                <p className="text-base text-gray-700 leading-relaxed mb-4">
                  Güvenilir üçüncü taraf hizmet sağlayıcıları ile (barındırma, veritabanı, analitik vb.) sınırlı ve gerekli bilgiler paylaşılır.
                </p>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Yasal Zorunluluklar</h3>
                <p className="text-base text-gray-700 leading-relaxed mb-4">
                  Yasal zorunluluklar veya mahkeme emirleri durumunda bilgilerinizi paylaşabiliriz.
                </p>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Güvenlik</h3>
                <p className="text-base text-gray-700 leading-relaxed">
                  Hesap güvenliğini korumak veya diğer kullanıcıları korumak için gerekli durumlarda bilgilerinizi paylaşabiliriz.
                </p>
              </section>

              {/* Data Retention */}
              <section id="retention" className="scroll-mt-24">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Veri Saklama
                </h2>
                <p className="text-base text-gray-700 leading-relaxed mb-4">
                  Kişisel bilgilerinizi aşağıdaki süreler boyunca saklarız:
                </p>
                <ul className="list-disc list-inside text-base text-gray-700 leading-relaxed space-y-2">
                  <li>Hesap aktif olduğu sürece</li>
                  <li>Yasal yükümlülükler gerektirdiği sürece</li>
                  <li>Güvenlik ve dolandırıcılık önleme amaçları için gerekli olduğu sürece</li>
                </ul>
                <p className="text-base text-gray-700 leading-relaxed">
                  Hesabınızı sildiğinizde, bilgileriniz makul bir süre içinde silinir.
                </p>
              </section>

              {/* Data Protection */}
              <section id="protection" className="scroll-mt-24">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Bilgilerin Korunması
                </h2>
                <p className="text-base text-gray-700 leading-relaxed mb-4">
                  Kişisel bilgilerinizi korumak için aşağıdaki önlemleri alırız:
                </p>
                <ul className="list-disc list-inside text-base text-gray-700 leading-relaxed space-y-2">
                  <li>Şifreleme teknolojileri kullanırız</li>
                  <li>Güvenli sunucu altyapısı kullanırız</li>
                  <li>Erişim kontrolleri uygularız</li>
                  <li>Düzenli güvenlik denetimleri yaparız</li>
                  <li>Çalışanlarımıza gizlilik eğitimi veririz</li>
                </ul>
              </section>

              {/* Your Privacy Controls */}
              <section id="control" className="scroll-mt-24">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Gizliliğinizi Kontrol Etme
                </h2>
                <p className="text-base text-gray-700 leading-relaxed mb-4">
                  Gizliliğinizi kontrol etmek için aşağıdaki haklara sahipsiniz:
                </p>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Hesap Yönetimi</h3>
                <ul className="list-disc list-inside text-base text-gray-700 leading-relaxed space-y-1 mb-4">
                  <li>Hesabınızı istediğiniz zaman silebilirsiniz</li>
                  <li>Bilgilerinizi güncelleyebilirsiniz</li>
                  <li>Veri kullanım tercihlerinizi değiştirebilirsiniz</li>
                </ul>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Veri Hakları</h3>
                <ul className="list-disc list-inside text-base text-gray-700 leading-relaxed space-y-1">
                  <li>Topladığımız verilere erişim talep edebilirsiniz</li>
                  <li>Verilerinizi düzeltme veya silme talep edebilirsiniz</li>
                  <li>Veri taşınabilirliği talep edebilirsiniz</li>
                </ul>
              </section>

              {/* Contact Us */}
              <section id="contact" className="scroll-mt-24">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  İletişim
                </h2>
                <p className="text-base text-gray-700 leading-relaxed mb-4">
                  Bu gizlilik politikası hakkında sorularınız varsa, aşağıdaki kanallardan bize ulaşabilirsiniz:
                </p>
                <ul className="list-disc list-inside text-base text-gray-700 leading-relaxed space-y-2">
                  <li>E-posta: privacy@discoweb.com</li>
                  <li>Discord sunucumuz: discord.gg/discoweb</li>
                  <li>Web sitemiz: discoweb.com/support</li>
                </ul>
                <p className="text-base text-gray-700 leading-relaxed mt-4">
                  Bu politika zaman zaman güncellenebilir. Önemli değişiklikler durumunda kullanıcılarımızı bilgilendiririz.
                </p>
              </section>
            </div>

            {/* Article Footer */}
            <footer className="mt-16 pt-8 border-t border-gray-300">
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Son güncelleme: {LAST_UPDATED}
                </p>
              </div>
            </footer>
          </article>
        </main>
      </div>
    </div>
  );
}