'use client';

import Link from 'next/link';
import { Ubuntu } from 'next/font/google';

const ubuntu = Ubuntu({ subsets: ['latin'], weight: ['400', '700'] });

export default function ImportantPage() {
  const lastUpdated = '04 Şubat 2026';

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white py-16 px-6">
      <div className="mx-auto max-w-4xl">
        <h1 className={`text-2xl md:text-3xl font-bold mb-3 ${ubuntu.className}`}>Önemli Bilgilendirme</h1>
        <p className="text-sm text-[#99AAB5] mb-6">Son güncelleme: {lastUpdated}</p>

        <div className="prose prose-invert text-sm md:text-base leading-relaxed space-y-4">
          <p>
            Bu internet sitesi, <a href="https://discord.com/company" target="_blank" rel="noopener noreferrer" className="text-[#99AAB5] underline">Discord Inc.</a> veya ona bağlı tüzel kişiler ile herhangi bir bağlılık,
            onay veya sponsorluk ilişkisi içerisinde değildir. "<a href="https://discord.com" target="_blank" rel="noopener noreferrer" className="text-[#99AAB5] underline">Discord</a>" ve ilişkili ticari markalar
            <a href="https://discord.com/company" target="_blank" rel="noopener noreferrer" className="text-[#99AAB5] underline"> Discord Inc.</a>&apos;e aittir.
          </p>

          <p>
            Sitede sunulan araçlar, içerikler ve yönlendirmeler bağımsız olarak sağlanmakta olup,
            bu hizmetlerin kullanımı sonucu ortaya çıkabilecek her türlü sorumluluk ilgili kullanıcıya
            aittir. Hizmetlerin kullanımı öncesinde gerekli özenin gösterilmesi ve güvenlik önlemlerinin
            alınması kullanıcı sorumluluğundadır.
          </p>

          <p>
            Kişisel veya hassas bilgilerin paylaşımında dikkatli olunuz. Hesap bilgileri, parolalar,
            güvenlik anahtarları veya benzeri erişim verileri üçüncü taraflarla paylaşılmamalıdır.
          </p>

          <p>
            Resmi destek, doğrulama veya güvenlik bilgisi gerektiğinde lütfen <a href="https://support.discord.com" target="_blank" rel="noopener noreferrer" className="text-[#99AAB5] underline">Discord'un resmi destek</a>
            kanallarını ve belgelerini kullanınız. Bu sayfada yer alan bilgiler bilgilendirme amaçlıdır
            ve bağlayıcı hukuki tavsiye yerine geçmez; hukuki konular için yetkili bir hukuk müşavirine
            başvurunuz.
          </p>

          <p className="mt-6">İletişim: <a href="mailto:info@discoweb.tr" className="text-[#99AAB5] underline">info@discoweb.tr</a></p>

          <p className="mt-4">Geri dön: <Link href="/" className="text-[#99AAB5] underline">Anasayfaya dön</Link></p>
        </div>
      </div>
    </div>
  );
}
