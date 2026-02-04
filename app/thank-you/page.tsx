import Link from 'next/link';
import { Ubuntu } from 'next/font/google';

const ubuntu = Ubuntu({ subsets: ['latin'], weight: ['400', '700'] });

export default function ThankYou() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0b0f14] text-white">
      <div className="max-w-3xl mx-auto p-8">
        <h1 className={`text-4xl md:text-5xl font-bold mb-4 ${ubuntu.className}`}>Teşekkürler</h1>
        <p className="text-lg text-[#cbd5db] mb-6">DiscoWeb Türkiye'yi ziyaret ettiğiniz için teşekkür ederiz. Mesajınızı aldık ve en kısa sürede sizinle iletişime geçeceğiz.</p>
        <div className="flex gap-3">
          <Link href="/" className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#5865F2] to-[#7289DA] px-4 py-2 text-sm font-semibold text-white">Ana Sayfa</Link>
          <Link href="/contact" className="text-sm text-[#99AAB5] hover:text-white">İletişim</Link>
        </div>
      </div>
    </main>
  );
}
