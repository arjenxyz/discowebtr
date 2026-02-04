'use client';

import Link from 'next/link';
import DiscordAgreementButton from '@/components/DiscordAgreementButton';

const CLIENT_ID = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
const REDIRECT_URI = process.env.NEXT_PUBLIC_REDIRECT_URI;
const loginUrl = CLIENT_ID && REDIRECT_URI
  ? `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(
      REDIRECT_URI,
    )}&response_type=code&scope=identify%20email%20guilds%20guilds.join`
  : '/';

export default function DiscordAuthErrorPage() {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#0b0d12] text-white">
      <div className="absolute inset-0 -z-10">
        <div className="absolute -top-32 -left-24 h-[420px] w-[420px] rounded-full bg-rose-500/15 blur-[160px]" />
        <div className="absolute bottom-0 right-[-120px] h-[420px] w-[420px] rounded-full bg-indigo-500/15 blur-[180px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.06),_transparent_55%)]" />
      </div>

      <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center justify-center px-6 py-20 text-center">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-10 shadow-[0_24px_60px_rgba(15,23,42,0.45)]">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/15 text-rose-300">
            <span className="text-2xl">!</span>
          </div>
          <h1 className="text-3xl font-semibold">Discord bağlantısı başarısız oldu</h1>
          <p className="mt-4 text-sm text-white/60">
            Oturum açma isteği tamamlanamadı. Lütfen tekrar deneyin veya yönlendirme adresini
            kontrol edin. Sorun devam ederse destek ekibimizle iletişime geçebilirsiniz.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/"
              className="rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white/80 transition hover:border-white/30 hover:text-white"
            >
              Ana sayfaya dön
            </Link>
            <DiscordAgreementButton
              href={loginUrl}
              className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#0b0d12] transition hover:bg-white/90"
              targetBlank={false}
            >
              Tekrar dene
            </DiscordAgreementButton>
          </div>
        </div>
      </main>
    </div>
  );
}
