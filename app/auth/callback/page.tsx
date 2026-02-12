'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LuLoader } from 'react-icons/lu';

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
          let body: any = null;
          try {
            body = await response.json();
          } catch {
            try { body = await response.text(); } catch { body = null; }
          }
          console.error('Discord exchange failed', { status: response.status, body });
          try {
            localStorage.setItem('oauth_debug', JSON.stringify({ time: new Date().toISOString(), status: response.status, body }));
          } catch {}
          router.replace('/auth/error');
          return;
        }

        const payload = (await response.json()) as {
          status: 'ok' | 'needs_rules' | 'no_guilds' | 'error';
          isAdmin?: boolean;
          adminGuilds?: Array<{ id: string; name: string; isAdmin: boolean; isSetup: boolean; verifyRoleId: string | null; isOwner?: boolean }>;
          user?: { id: string; username: string; avatar: string | null; discriminator: string };
        };

        if (payload.status === 'needs_rules') {
          // Sunucu bilgilerini localStorage'a kaydet (rules sayfasında kullanılacak)
          if (payload.adminGuilds) {
            localStorage.setItem('adminGuilds', JSON.stringify(payload.adminGuilds));
            localStorage.setItem('adminGuildsUpdatedAt', new Date().toISOString());
          }
          // Kullanıcı bilgilerini localStorage'a kaydet
          if (payload.user) {
            localStorage.setItem('discordUser', JSON.stringify(payload.user));
          }
          router.replace('/auth/rules');
          return;
        }

        if (payload.status === 'no_guilds') {
          setStatus('Botumuzun bulunduğu bir sunucu bulunamadı. Yönlendiriliyor...');
          // Kullanıcı bilgilerini localStorage'a kaydet
          if (payload.user) {
            localStorage.setItem('discordUser', JSON.stringify(payload.user));
          }
          setTimeout(() => router.replace('/auth/bot-invite'), 1200);
          return;
        }

        if (payload.status === 'ok') {
          setStatus('Rol sorgulanıyor... başarılı. Yönlendiriliyor...');
          
          console.log('OAuth payload:', payload); // Debug log
          
          // Kullanıcı bilgilerini localStorage'a kaydet
          if (payload.user) {
            localStorage.setItem('discordUser', JSON.stringify(payload.user));
          }
          
          // Tüm erişilebilir sunucuları say (setup olup olmamasına bakmadan)
          const totalGuilds = payload.adminGuilds?.length || 0;
          
          // Her zaman sunucu seçtirmeye git (eğer erişilebilir sunucu varsa)
          if (totalGuilds > 0) {
            // Sunucu bilgilerini localStorage'a kaydet
            localStorage.setItem('adminGuilds', JSON.stringify(payload.adminGuilds));
            localStorage.setItem('adminGuildsUpdatedAt', new Date().toISOString());
            setTimeout(() => router.replace('/auth/select-server'), 1200);
            return;
          }
          
          // Hiç erişilebilir sunucu yoksa dashboard'a git
          setTimeout(() => router.replace('/dashboard'), 1200);
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
      <div className="text-center">
        <LuLoader className="mx-auto mb-4 h-8 w-8 animate-spin text-blue-500" />
        <p className="text-sm text-white/70">{status}</p>
      </div>
    </div>
  );
}

// 2. Default export edilen ana sayfa bileşeni sadece Suspense ile sarmalıyor.
export default function DiscordAuthCallbackPage() {
  return (
    <div className="bg-[#0b0d12]">
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-[#0b0d12] text-white">
            <div className="text-center">
              <LuLoader className="mx-auto mb-4 h-8 w-8 animate-spin text-blue-500" />
              <p className="text-sm text-white/70">Yükleniyor...</p>
            </div>
          </div>
        }
      >
        <DiscordAuthCallbackContent />
      </Suspense>
    </div>
  );
}