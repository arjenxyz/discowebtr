'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// 1. Mantığı yürüten ana içeriği ayrı bir fonksiyon (component) haline getiriyoruz.
function DiscordAuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Giriş doğrulanıyor...');

  useEffect(() => {
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (error) {
      const params = new URLSearchParams();
      params.set('error', error);
      if (errorDescription) {
        params.set('error_description', errorDescription);
      }
      router.replace(`/auth/error?${params.toString()}`);
      return;
    }

    const code = searchParams.get('code');
    if (!code) {
      router.replace('/auth/error');
      return;
    }

    const exchange = async () => {
      try {
        setStatus('Discord bağlantısı doğrulanıyor...');
        const response = await fetch('/api/discord/exchange', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });

        if (!response.ok) {
          router.replace('/auth/error');
          return;
        }

        const payload = (await response.json()) as {
          status: 'ok' | 'needs_rules' | 'error';
          isAdmin?: boolean;
        };

        if (payload.status === 'needs_rules') {
          router.replace('/auth/rules');
          return;
        }

        if (payload.status === 'ok') {
          setStatus('Rol sorgulanıyor... başarılı. Yönlendiriliyor...');
          setTimeout(() => router.replace(payload.isAdmin ? '/admin' : '/dashboard'), 1200);
          return;
        }

        router.replace('/auth/error');
      } catch {
        router.replace('/auth/error');
      }
    };

    exchange();
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b0d12] text-white">
      <p className="text-sm text-white/70">{status}</p>
    </div>
  );
}

// 2. Default export edilen ana sayfa bileşeni sadece Suspense ile sarmalıyor.
export default function DiscordAuthCallbackPage() {
  return (
    <div className="bg-[#0b0d12]">
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center text-white">
            <p className="text-sm text-white/70">Yükleniyor...</p>
          </div>
        }
      >
        <DiscordAuthCallbackContent />
      </Suspense>
    </div>
  );
}