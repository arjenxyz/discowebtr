import Link from 'next/link';

export const metadata = {
  title: 'Gizlilik Politikası',
  description: 'DiscoWeb gizlilik politikası — hangi verileri topladığımız, neden topladığımız ve nasıl koruduğumuz hakkında bilgi.',
};

const LAST_UPDATED = '2 Şubat 2026';

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#0b0d12] text-white py-16 px-6 md:px-10">
      <article className="mx-auto max-w-3xl prose prose-invert sm:prose-lg lg:prose-xl">
        <header className="mb-6">
          <h1 className="text-3xl font-bold">Gizlilik Politikası</h1>
          <p className="mt-1 text-sm text-white/60">Son güncelleme: {LAST_UPDATED}</p>
          <p className="mt-4">Bu politika, DiscoWeb (bundan sonra &quot;Biz&quot; veya &quot;Hizmet&quot;) tarafından toplanan kişisel ve teknik verilerin ne şekilde işlendiğini açıklar. Hizmetimizi kullanmaya devam ederek bu politikayı kabul etmiş olursunuz.</p>
        </header>

        <nav aria-label="İçindekiler" className="mb-6">
          <ul className="flex flex-wrap gap-3 text-sm text-white/70">
            <li><a href="#what" className="hover:underline">Neler Toplanıyor</a></li>
            <li><a href="#why" className="hover:underline">Neden Topluyoruz</a></li>
            <li><a href="#sharing" className="hover:underline">Paylaşım</a></li>
            <li><a href="#retention" className="hover:underline">Saklama Süreleri</a></li>
            <li><a href="#rights" className="hover:underline">Kullanıcı Hakları</a></li>
            <li><a href="#contact" className="hover:underline">İletişim</a></li>
          </ul>
        </nav>

        <section id="what">
          <h2>Neler Toplanıyor</h2>
          <p>Hizmetimiz aşağıdaki veri kategorilerini toplayabilir:</p>
          <ul>
            <li><strong>Discord kimlik bilgileri:</strong> kullanıcı kimliği, kullanıcı adı, avatar, (ve gerekirse) e-posta.</li>
            <li><strong>Sunucu bilgileri:</strong> yönetici olduğunuz sunucuların listesi, sunucu kimlikleri ve roller.</li>
            <li><strong>Hesap ve işlem verileri:</strong> bakiye, satın alma ve işlem geçmişleri.</li>
            <li><strong>Teknik veriler:</strong> sunucu logları, hata raporları, IP adresi ve kullanılabilirlik bilgileri.</li>
          </ul>
        </section>

        <section id="why">
          <h2>Neden Topluyoruz</h2>
          <p>Bu veriler hizmetin doğru çalışması, hesap doğrulaması, yetki kontrolü, ödeme ve destek süreçleri için gereklidir. Ayrıca güvenlik ve suistimal tespiti gibi operasyonel amaçlar için teknik kayıtlar tutulur.</p>
        </section>

        <section id="sharing">
          <h2>Veri Paylaşımı</h2>
          <p>Veriler varsayılan olarak üçüncü taraflarla paylaşılmaz. Ancak hizmetin işlevselliği için Discord tarafından sağlanan bilgiler kullanılır. Yasalar gerektirdiğinde resmi mercilere bilgi verilebilir.</p>
        </section>

        <section id="retention">
          <h2>Saklama Süreleri</h2>
          <p>Veriler, kanuni yükümlülükler, hizmet gereksinimleri veya kullanıcı talepleri doğrultusunda saklanır. Hesap silme talepleri için <Link href="/contact" className="text-blue-600 hover:underline">İletişim</Link> sayfasından başvurabilirsiniz.</p>
        </section>

        <section id="rights">
          <h2>Kullanıcı Hakları</h2>
          <p>Kullanıcılar; verilerine erişim, verilerde düzeltme, silme talebi, işleme kısıtlama ve itiraz etme haklarına sahiptir. Hak taleplerinizi <Link href="/contact" className="text-blue-600 hover:underline">İletişim</Link> sayfası üzerinden iletebilirsiniz.</p>
        </section>

        <section id="cookies">
          <h2>Çerezler ve İzleme</h2>
          <p>Web sitesi çerezler, oturum bilgileri ve analitik amaçlı izleme teknolojileri kullanabilir. Bu teknolojiler site kullanımını analiz etmek ve hizmeti geliştirmek için kullanılır.</p>
        </section>

        <section id="security">
          <h2>Güvenlik</h2>
          <p>Veri güvenliği için endüstri standartlarında önlemler uygulanmaktadır. Yine de internet üzerinden veri iletiminde risk olduğunu hatırlatırız; şüpheli bir durum tespit ederseniz bize bildirin.</p>
        </section>

        <section id="contact">
          <h2>İletişim</h2>
          <p>Gizlilik ile ilgili sorularınız veya talepleriniz için lütfen <Link href="/contact" className="text-blue-600 hover:underline">İletişim</Link> sayfasından bize ulaşın. Talepler titizlikle incelenecektir.</p>
        </section>

        <footer className="mt-8 text-sm text-white/60">
          <p>Bu politika gerektiğinde güncellenecektir. Önemli değişikliklerde kullanıcılar bildirim alacaktır.</p>
        </footer>
      </article>
    </main>
  );
}
