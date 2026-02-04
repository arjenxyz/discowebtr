import Link from 'next/link';
import Image from 'next/image';
import { Ubuntu } from "next/font/google";

const ubuntu = Ubuntu({ subsets: ["latin"], weight: ["400", "700"] });


export default function Home() {

  return (
    <div className="min-h-screen text-white overflow-x-hidden relative">
      {/* Content */}
      <div className="relative z-10">
      {/* Enhanced Header - transparent (brand + CTA fixed) */}
      <header className="fixed top-8 left-0 right-0 z-50 bg-transparent">
        
        <div className="flex h-16 w-full items-center justify-between px-6 md:px-8 lg:px-12">
          {/* Logo (text-only, more professional) */}
          <div className="h-16 flex items-center">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="inline-flex flex-col leading-none items-start">
                <span className={`inline-block text-2xl md:text-3xl font-semibold text-white transition-colors duration-300 ${ubuntu.className}`}>DiscoWeb</span>
                <span className={`inline-block w-full text-sm md:text-xl uppercase tracking-tight text-[#99AAB5] mt-1 animate-turkiye-blink font-semibold ${ubuntu.className}`}>T Ü R K İ Y E</span>
              </div>
            </Link>
          </div>

          {/* nav intentionally removed from fixed header (keeps header stable) */}

          {/* CTA Button - Tutarlı Discord renkleri (isolated transform) */}
          <div className="h-16 flex items-center">
            <div className="flex items-center gap-4">
              <Link
                href="/auth/bot-invite"
                className="group relative inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-[#5865F2] to-[#7289DA] px-6 py-3 text-sm font-semibold text-white transition-transform duration-300 will-change-transform transform-gpu hover:shadow-[0_0_30px_rgba(88,101,242,0.5)] hover:scale-105 overflow-hidden"
              >
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none"></div>
                
                {/* Discord icon */}
                <svg className="w-5 h-5 relative z-10" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 0 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 0 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                <span className="relative z-10">Discord ile Bağlan</span>
              </Link>
            </div>
          </div>

        </div>
      </header>

      
      {/* Hero Section (header için padding eklendi) */}
        {/* Işık efektleri - Discord Blurple tonu */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-[#5865F2]/20 rounded-full blur-3xl animate-glow-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#7289DA]/15 rounded-full blur-3xl"></div>

      <main className="relative min-h-screen pt-28">
            <div className="relative z-10 flex min-h-[80vh] items-center justify-center px-6 -mt-28 md:-mt-36">
          <div className="max-w-6xl w-full flex flex-col-reverse md:flex-row items-center gap-8">
            <div className="flex-1 text-center md:text-left md:pl-4 lg:pl-6">
              <h1 className={`text-3xl md:text-5xl lg:text-6xl font-extrabold text-white ${ubuntu.className}`}>Hoş geldiniz — DiscoWeb Türkiye</h1>
              <p className="mt-4 text-sm md:text-lg text-[#cbd5db] leading-relaxed break-words px-2">
                Sunucularınızı kolayca yönetin, promosyonlarınızı ve mağazanızı yönetin. Hemen başlamak için Mağazaya Dön seçeneğini kullanabilirsiniz.
              </p>
              <div className="mt-6 flex items-center md:justify-start justify-center gap-3">
                <a href="/store" className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#5865F2] to-[#7289DA] px-5 py-2 text-sm font-semibold text-white shadow-md hover:scale-[1.02] transition">Mağazaya Dön</a>
              </div>
            </div>

            <div className="flex-1 w-full max-w-md md:max-w-lg">
              <div className="relative w-full h-44 sm:h-56 md:h-80 lg:h-96 rounded-lg overflow-hidden shadow-lg mx-auto">
                <Image
                  src="/Discord-Banner_5.png"
                  alt="Discord Banner"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Biz kimiz? - placed under the hero and above the banner */}
        <section className="mx-auto max-w-3xl px-6 mt-8 sm:mt-12">
          <div className="w-full rounded-t-lg overflow-hidden shadow-md">
            <Image src="/Discord-Banner_7.png" alt="Discord Banner" width={1200} height={400} className="object-contain w-full h-auto block rounded-t-lg" />
          </div>

          <div className="w-full rounded-b-xl bg-gradient-to-b from-black/60 via-black/40 to-black/30 border border-white/6 -mt-0 shadow-lg group hover:shadow-2xl transition-transform duration-200">
            <div className="p-6 md:p-8 grid md:grid-cols-2 gap-6 items-start">
              <div className="text-left">
                <h3 className={`text-xl md:text-2xl font-semibold text-white mb-3 ${ubuntu.className}`}>Biz kimiz?</h3>
                <p className="text-[#cbd5db] text-sm md:text-base mb-5 break-words">DiscoWeb Türkiye, Discord sunucularınız için yönetim, mağaza ve promosyon araçları sunan, güvenli ve kullanıcı dostu bir platformdur. Amacımız sunucu sahiplerinin işlerini kolaylaştırmak ve topluluk deneyimini iyileştirmektir.</p>
                <div className="flex items-center gap-3">
                  <Link href="/about" className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#5865F2] to-[#7289DA] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:scale-[1.02] transition">Daha Fazla</Link>
                  <Link href="/store" className="text-sm text-[#99AAB5] hover:text-white">Mağazaya Gözat</Link>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-md bg-[#5865F2]/10 flex items-center justify-center text-[#5865F2]">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-white">Kolay Yönetim</p>
                    <p className="text-[#cbd5db] text-sm">Rolleri, izinleri ve promosyonları birkaç tıklama ile yönetin.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-md bg-[#7289DA]/10 flex items-center justify-center text-[#7289DA]">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                      <path d="M12 2l3 7h7l-5.5 4 2 7L12 17l-6.5 3 2-7L2 9h7l3-7z" stroke="currentColor" strokeWidth="0" fill="currentColor" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-white">Mağaza & Promosyon</p>
                    <p className="text-[#cbd5db] text-sm">Promosyonlarınızı ve dijital mağazanızı kolayca yönetin.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-md bg-[#2C2F33]/10 flex items-center justify-center text-[#99AAB5]">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                      <path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-white">Güvenli Entegrasyon</p>
                    <p className="text-[#cbd5db] text-sm">Botlarımız güvenli ve Discord politikalarına uygundur.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* Standalone banner text block (moved out of image overlay) */}
      <div className="mx-auto max-w-4xl px-6 mt-24 md:mt-[6cm] text-center z-10">
        <h2 className={`text-white font-extrabold leading-tight drop-shadow-[0_12px_30px_rgba(0,0,0,0.85)] text-2xl md:text-4xl lg:text-5xl uppercase sm:whitespace-nowrap mx-auto text-center px-4 ${ubuntu.className}`}>
          DAHA FAZLA AŞAĞIYA KAYDIRAMAZSIN.
        </h2>
        <p className={`mt-2 text-white font-semibold drop-shadow-[0_8px_24px_rgba(0,0,0,0.75)] text-lg md:text-xl lg:text-2xl ${ubuntu.className}`}>
          MAĞAZAYA DÖN İSTERSEN.
        </p>
      </div>

      {/* Discord Banner - Footer Üstü (image only) */}
      <div className="w-full relative z-10 mt-16 md:mt-[5cm]">
        <div className="relative w-full h-[500px] sm:h-[600px] md:h-[700px] lg:h-[800px]">
          <Image
            src="/Discord-Banner_8.png"
            alt="Discord Banner"
            fill
            className="object-cover"
            priority
          />
        </div>
      </div>

      {/* Footer - Discord Dark (#23272A) */}
      <footer className="border-t border-white/10 bg-[#23272A] backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-10">
            <div className="md:w-1/3">
              <h3 className={`text-2xl font-bold mb-3 text-white ${ubuntu.className}`}>DiscoWeb Türkiye</h3>
              <p className="text-[#99AAB5] text-sm mb-4 max-w-sm">Discord sunucularınız için yönetim, promosyon ve mağaza çözümleri. Hızlı kurulum, güvenli entegrasyon.</p>
              <div className="mt-2">
                <Link href="/auth/bot-invite" className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#5865F2] to-[#7289DA] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:scale-[1.02] transition">
                  Botu Davet Et
                </Link>
              </div>
            </div>

            <div className="md:w-1/3 flex justify-center">
              <div>
                <h4 className="text-lg font-semibold mb-3 text-white">Kaynaklar</h4>
                <ul className="text-[#99AAB5] space-y-2 text-sm">
                  <li><Link href="/store" className="hover:text-white">Mağaza</Link></li>
                  <li><Link href="/privacy" className="hover:text-white">Gizlilik Politikası</Link></li>
                  <li><Link href="/terms" className="hover:text-white">Kullanım Koşulları</Link></li>
                  <li><Link href="/contact" className="hover:text-white">İletişim</Link></li>
                </ul>

                <div className="mt-4 text-sm text-[#99AAB5]">
                  <p className="font-semibold text-white mb-1">İletişim</p>
                  <p><a href="mailto:info@discoweb.tr" className="hover:text-white">info@discoweb.tr</a></p>
                </div>
              </div>
            </div>

            <div className="md:w-1/3 flex flex-col items-start md:items-end text-left md:text-right">
              
              <div className="mt-6 flex justify-center md:justify-end">
                <div className="flex w-full max-w-[380px] bg-black/30 border border-white/6 rounded-lg overflow-hidden shadow-sm">
                  <div className="w-1 bg-gradient-to-b from-[#5865F2] to-transparent" />
                  <div className="p-4 text-sm text-[#cbd5db] leading-relaxed text-left">
                    <p className="font-semibold text-white mb-1 text-left">Önemli Bilgilendirme</p>
                    <p className="mb-1 text-sm text-[#d1d7db]">Bu internet sitesi Discord Inc. veya bağlı kuruluşları ile bağlı, onaylı ya da sponsorlu bir ilişki içinde değildir.</p>
                    <p className="text-sm">Discord ve ilgili ticari markalar Discord Inc.&apos;e aittir.</p>
                    <div className="mt-3 flex justify-end">
                      <Link href="/important" className="text-sm text-[#99AAB5] hover:text-white underline">Detaylı Bilgilendirme</Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 border-t border-white/6 pt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <p className="text-[#99AAB5] text-sm">© 2026 DiscoWeb Türkiye. Tüm hakları saklıdır.</p>
            <p className="text-[#99AAB5] text-sm"><Link href="/thank-you" className="underline hover:text-white">Teşekkürler</Link></p>
          </div>
        </div>
      </footer>
    </div>
  </div>
  );
}