'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { LuLoader } from 'react-icons/lu';

const RULES = [
  'Sunucu kurallarına ve topluluk standartlarına saygı gösterin.',
  'Panel ve bot işlemlerinde kötüye kullanım yapmayın.',
  'Kişisel ve gizli verileri (token, kod, panel erişimi) paylaşmayın.',
  'Topluluk üyelerine karşı taciz veya nefret içerikli davranışlarda bulunmayın.',
  'Web paneli ve bot üzerinden yapılan işlemler kayıt altındadır.',
];

const INFO_POINTS = [
  'Kuralları onayladıktan sonra rolünüz otomatik olarak aktif edilir.',
  'Rol atanması birkaç dakika sürebilir; gecikmelerde sayfayı yenileyin.',
  'Aktivasyon tamamlanınca üye paneline yönlendirilirsiniz.',
  'Transfer limitleri ve vergiler sunucu ayarlarına göre uygulanır.',
];

function RulesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  const pendingGuildId = searchParams.get('pendingGuildId');

  const handleAccept = async () => {
    setLoading(true);
    setError(null);

    try {
      // Seçilen sunucuyu cookie'ye kaydet
      if (pendingGuildId) {
        document.cookie = `selected_guild_id=${pendingGuildId}; path=/; max-age=86400; samesite=lax`;
      }

      const response = await fetch('/api/discord/assign-role', { method: 'POST' });
      if (response.status === 401) {
        setError('Oturum süresi doldu. Lütfen tekrar giriş yapın.');
        setLoading(false);
        return;
      }

      if (!response.ok) {
        setError('Rol atanamadı. Lütfen tekrar deneyin.');
        setLoading(false);
        return;
      }

      const verifyResponse = await fetch('/api/admin/verify');
      if (verifyResponse.ok) {
        const data = (await verifyResponse.json()) as { isAdmin: boolean };
        // Rol verildi, şimdi sunucu seçtirmeye git
        router.replace('/auth/select-server');
        return;
      }

      router.replace('/auth/select-server');
    } catch {
      setError('Bir hata oluştu. Lütfen tekrar deneyin.');
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#0b0d12] text-white">
      <div className="absolute inset-0 -z-10">
        <div className="absolute -top-32 -left-24 h-[420px] w-[420px] rounded-full bg-indigo-500/15 blur-[160px]" />
        <div className="absolute bottom-0 right-[-120px] h-[420px] w-[420px] rounded-full bg-sky-500/15 blur-[180px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.06),_transparent_55%)]" />
      </div>

      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center px-6 py-20">
        <div className="w-full rounded-2xl border border-white/10 bg-white/5 p-10 shadow-[0_24px_60px_rgba(15,23,42,0.45)]">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300">Kurallar</p>
          <h1 className="mt-4 text-2xl font-semibold">Rol aktivasyonu için kuralları onaylayın</h1>
          <p className="mt-2 text-sm text-white/60">
            Rolünüzün aktif edilmesi için aşağıdaki kuralları kabul etmeniz gerekiyor.
          </p>

          <ul className="mt-6 space-y-3 text-sm text-white/70">
            {RULES.map((rule) => (
              <li key={rule} className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-indigo-400" />
                <span>{rule}</span>
              </li>
            ))}
          </ul>

          <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300">Bilgilendirme</p>
            <p className="mt-2 text-sm text-white/60">
              Devam etmeden önce aşağıdaki akışları bilmenizi isteriz.
            </p>
            <ul className="mt-4 space-y-3 text-sm text-white/70">
              {INFO_POINTS.map((point) => (
                <li key={point} className="flex gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-400" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
            <input
              id="rules-accept"
              type="checkbox"
              checked={accepted}
              onChange={(event) => setAccepted(event.target.checked)}
              className="mt-1 h-4 w-4 accent-indigo-400"
            />
            <label htmlFor="rules-accept" className="text-sm text-white/70">
              Kuralları okudum, anladım ve kabul ediyorum. Kabul etmeden rolünüz aktif edilemez.
            </label>
          </div>

          {error && <p className="mt-4 text-sm text-rose-300">{error}</p>}

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/"
              className="rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white/80 transition hover:border-white/30 hover:text-white"
            >
              Vazgeç
            </Link>
            <button
              type="button"
              onClick={handleAccept}
              disabled={loading || !accepted}
              className="rounded-full bg-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_12px_32px_rgba(99,102,241,0.45)] transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <LuLoader className="h-4 w-4 animate-spin" />
                  Rol etkinleştiriliyor...
                </span>
              ) : (
                'Kuralları onayla'
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function DiscordRulesPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#0b0d12] text-white">
        <div className="text-center">
          <LuLoader className="mx-auto mb-4 h-8 w-8 animate-spin text-indigo-400" />
          <p className="text-sm text-white/70">Kurallar yükleniyor...</p>
        </div>
      </div>
    }>
      <RulesPageContent />
    </Suspense>
  );
}
