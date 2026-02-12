'use client';

import { useEffect, useState } from 'react';
import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  LuBell,
  LuCode,
  LuDatabase,
  LuLifeBuoy,
  LuShield,
  LuWrench,
  LuCommand,
  LuFlag,
  LuPodcast,
  LuRadar,
  LuChevronDown,
  LuChrome,
  LuLogOut,
  LuSearch,
  LuUsers,
  LuTrash2,
} from 'react-icons/lu';

type UserInfo = {
  id: string;
  username: string;
  avatar: string | null;
};


export default function DeveloperPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [accessLoading, setAccessLoading] = useState(true);
  const [accessAllowed, setAccessAllowed] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const cookies = document.cookie.split('; ');
        const userIdCookie = cookies.find((row) => row.startsWith('discord_user_id='));
        const userId = userIdCookie?.split('=')[1];
        if (!userId) {
          return;
        }
        const response = await fetch(`/api/discord/user/${userId}`);
        if (response.ok) {
          const userData = (await response.json()) as UserInfo;
          setUser(userData);
        }
      } catch {
        // ignore
      }
    };

    const checkAccess = async () => {
      try {
        setAccessLoading(true);
        const response = await fetch('/api/developer/check-access', { credentials: 'include', cache: 'no-store' });
        const data = (await response.json().catch(() => ({}))) as { hasAccess?: boolean; error?: string };

        if (response.ok && data.hasAccess) {
          setAccessAllowed(true);
          setAccessError(null);
          return;
        }

        // Handle different error cases from API
        if (response.status === 401 || data.error === 'unauthorized') {
          setAccessError('Giriş yapmanız gerekiyor.');
        } else if (response.status === 403 || data.error === 'forbidden') {
          setAccessError('Bu panele erişim izniniz yok.');
        } else if (data.error === 'developer_role_missing') {
          setAccessError('Developer rolü tanımlı değil.');
        } else {
          setAccessError('Geliştirici paneli doğrulaması yapılamadı.');
        }

        setAccessAllowed(false);
      } catch {
        setAccessError('Geliştirici paneli doğrulaması yapılamadı.');
        setAccessAllowed(false);
      } finally {
        setAccessLoading(false);
      }
    };

    fetchUserInfo();
    checkAccess();
  }, []);


  useEffect(() => {
    if (!menuOpen) {
      return undefined;
    }

    const handleClick = (event: MouseEvent) => {
      if (!menuRef.current) {
        return;
      }
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  const handleLogout = async () => {
    try {
      localStorage.clear();
      if (typeof document !== 'undefined') {
        document.cookie.split(';').forEach((c) => {
          const name = c.split('=')[0].trim();
          try {
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname}`;
          } catch {
            // ignore
          }
        });
      }
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      window.location.href = '/';
    } catch {
      localStorage.clear();
      window.location.href = '/';
    }
  };

  const handleSyncMembers = async () => {
    setSyncLoading(true);
    setSyncMessage(null);
    try {
      const response = await fetch('/api/developer/sync-members', { method: 'POST', credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setSyncMessage(data.message || 'Senkronizasyon tamamlandı.');
      } else {
        const data = await response.json().catch(() => ({}));
        setSyncMessage(data.error || 'Senkronizasyon başarısız.');
      }
    } catch {
      setSyncMessage('Senkronizasyon sırasında hata oluştu.');
    } finally {
      setSyncLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-[#0b0d12] text-white">
      <nav className="border-b border-white/10 bg-[#0b0d12]">
        <div className="flex w-full items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            {user?.avatar ? (
              <Image
                src={user.avatar}
                alt={user.username}
                width={44}
                height={44}
                className="h-11 w-11 rounded-full border-2 border-white/20"
              />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-white/20 bg-slate-600">
                <span className="text-base font-bold text-white">
                  {user?.username?.charAt(0).toUpperCase() ?? 'D'}
                </span>
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-white">{user?.username ?? 'Developer'}</p>
              <p className="text-xs text-white/50">Discord hesabınızla giriş yaptınız</p>
            </div>
          </div>
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className={`flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 transition hover:border-white/30 hover:text-white ${
                menuOpen ? 'bg-white/10 text-white' : ''
              }`}
            >
              Menü
              <LuChevronDown className={`h-3.5 w-3.5 transition ${menuOpen ? 'rotate-180' : ''}`} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 z-50 mt-3 w-56 rounded-2xl border border-white/10 bg-[#0f1116] p-3 shadow-2xl">
                <button
                  type="button"
                  onClick={() => router.replace('/dashboard')}
                  className="flex w-full items-center gap-2 rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-left text-xs text-white/70 transition hover:border-white/15 hover:text-white"
                >
                  <LuChrome className="h-3.5 w-3.5 text-indigo-300" />
                  Dashboard&apos;a dön
                </button>
                <button
                  type="button"
                  onClick={() => router.replace('/developer/user-lookup')}
                  className="mt-2 flex w-full items-center gap-2 rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-left text-xs text-white/70 transition hover:border-white/15 hover:text-white"
                >
                  <LuSearch className="h-3.5 w-3.5 text-indigo-300" />
                  Kullanıcı Sorgulama
                </button>
                <button
                  type="button"
                  onClick={() => router.replace('/developer/all-servers')}
                  className="mt-2 flex w-full items-center gap-2 rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-left text-xs text-white/70 transition hover:border-white/15 hover:text-white"
                >
                  <LuDatabase className="h-3.5 w-3.5 text-indigo-300" />
                  Tüm Sunucular
                </button>
                <button
                  type="button"
                  onClick={() => router.replace('/developer/servers')}
                  className="mt-2 flex w-full items-center gap-2 rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-left text-xs text-white/70 transition hover:border-white/15 hover:text-white"
                >
                  <LuDatabase className="h-3.5 w-3.5 text-indigo-300" />
                  Sunucu Listesi
                </button>
                <button
                  type="button"
                  onClick={() => router.replace('/developer/users')}
                  className="mt-2 flex w-full items-center gap-2 rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-left text-xs text-white/70 transition hover:border-white/15 hover:text-white"
                >
                  <LuCode className="h-3.5 w-3.5 text-indigo-300" />
                  Kullanıcı Listesi
                </button>
                <button
                  type="button"
                  onClick={() => router.replace('/developer/maintenance')}
                  className="mt-2 flex w-full items-center gap-2 rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-left text-xs text-white/70 transition hover:border-white/15 hover:text-white"
                >
                  <LuWrench className="h-3.5 w-3.5 text-indigo-300" />
                  Bakım Yönetimi
                </button>
                <button
                  type="button"
                  onClick={() => router.replace('/developer/clear-data')}
                  className="mt-2 flex w-full items-center gap-2 rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-left text-xs text-white/70 transition hover:border-white/15 hover:text-white"
                >
                  <LuTrash2 className="h-3.5 w-3.5 text-red-400" />
                  Veri Temizleme
                </button>
                <button
                  type="button"
                  onClick={() => router.replace('/admin')}
                  className="mt-2 flex w-full items-center gap-2 rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-left text-xs text-white/70 transition hover:border-white/15 hover:text-white"
                >
                  <LuShield className="h-3.5 w-3.5 text-indigo-300" />
                  Admin Paneli
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="mt-2 flex w-full items-center gap-2 rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-left text-xs text-white/70 transition hover:border-white/15 hover:text-white"
                >
                  <LuLogOut className="h-3.5 w-3.5 text-rose-300" />
                  Çıkış yap
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {accessLoading && (
        <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-6 py-16 text-center">
          <div className="rounded-3xl border border-white/10 bg-[#0f131d] p-8">
            <p className="text-sm text-white/70">Developer yetkisi kontrol ediliyor...</p>
          </div>
        </div>
      )}

      {!accessLoading && !accessAllowed && (
        <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-6 py-16 text-center">
          <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 p-8">
            <p className="text-sm font-semibold text-rose-200">Erişim Reddedildi</p>
            <p className="mt-2 text-sm text-rose-100/80">{accessError ?? 'Bu panele erişim izniniz yok.'}</p>
            <button
              type="button"
              onClick={() => router.replace('/dashboard')}
              className="mt-6 rounded-full border border-rose-300/40 px-4 py-2 text-xs text-rose-100 transition hover:border-rose-200"
            >
              Üye paneline dön
            </button>
          </div>
        </div>
      )}

      {!accessLoading && accessAllowed && (
        <div className="mx-auto grid max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-white/10 bg-[#0f131d] p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                <LuCode className="h-6 w-6 text-indigo-300" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-indigo-300">DEVELOPER</p>
                <h1 className="mt-1 text-xl font-semibold text-white">Developer Paneli</h1>
                <p className="mt-1 text-xs text-white/50">Sistem yönetimi, bakım ve duyuru araçları.</p>
              </div>
            </div>
          </section>
          <section className="rounded-3xl border border-white/10 bg-[#0f131d] p-6">
            <h2 className="text-lg font-semibold text-white">Hızlı Aksiyonlar</h2>
            <p className="mt-1 text-sm text-white/60">
              Duyuru gönder, bakım modunu yönet ve kritik işlemleri tek yerden takip et.
            </p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <button
                type="button"
                className="flex items-center gap-3 rounded-2xl border border-indigo-400/30 bg-indigo-500/10 px-4 py-3 text-left text-sm text-white/80 transition hover:border-indigo-300/60"
              >
                <LuBell className="h-5 w-5 text-indigo-300" />
                Duyuru & Mail Gönder
              </button>
              <button
                type="button"
                className="flex items-center gap-3 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-left text-sm text-white/80 transition hover:border-amber-300/60"
              >
                <LuWrench className="h-5 w-5 text-amber-300" />
                Bakım Modu Yönetimi
              </button>
              <button
                type="button"
                className="flex items-center gap-3 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-left text-sm text-white/80 transition hover:border-emerald-300/60"
              >
                <LuDatabase className="h-5 w-5 text-emerald-300" />
                Veritabanı Kontrolleri
              </button>
              <button
                type="button"
                className="flex items-center gap-3 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-left text-sm text-white/80 transition hover:border-rose-300/60"
              >
                <LuShield className="h-5 w-5 text-rose-300" />
                Güvenlik & Yetkiler
              </button>
              <button
                type="button"
                onClick={handleSyncMembers}
                disabled={syncLoading}
                className="flex items-center gap-3 rounded-2xl border border-blue-400/30 bg-blue-500/10 px-4 py-3 text-left text-sm text-white/80 transition hover:border-blue-300/60 disabled:opacity-50"
              >
                <LuUsers className="h-5 w-5 text-blue-300" />
                {syncLoading ? 'Senkronize Ediliyor...' : 'Üyeleri Senkronize Et'}
              </button>
            </div>
          </section>

          {syncMessage && (
            <section className="rounded-3xl border border-blue-500/30 bg-blue-500/10 p-6">
              <p className="text-sm font-semibold text-blue-200">Üye Senkronizasyonu</p>
              <p className="mt-2 text-sm text-blue-100/80">{syncMessage}</p>
            </section>
          )}

          <section className="rounded-3xl border border-white/10 bg-[#0f131d] p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">Geliştirici Modülleri</h2>
                <p className="mt-1 text-sm text-white/60">Her özellik kendi sayfasında.</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={() => router.replace('/developer/user-lookup')}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-white/80 transition hover:border-white/20"
              >
                <span className="flex items-center gap-2">
                  <LuSearch className="h-4 w-4 text-indigo-300" />
                  Kullanıcı Sorgulama
                </span>
                <span className="text-xs text-white/40">sayfa</span>
              </button>
              <button
                type="button"
                onClick={() => router.replace('/developer/all-servers')}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-white/80 transition hover:border-white/20"
              >
                <span className="flex items-center gap-2">
                  <LuDatabase className="h-4 w-4 text-indigo-300" />
                  Tüm Sunucular & Üyeler
                </span>
                <span className="text-xs text-white/40">sayfa</span>
              </button>
              <button
                type="button"
                onClick={() => router.replace('/developer/servers')}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-white/80 transition hover:border-white/20"
              >
                <span className="flex items-center gap-2">
                  <LuDatabase className="h-4 w-4 text-indigo-300" />
                  Sunucu Listesi
                </span>
                <span className="text-xs text-white/40">sayfa</span>
              </button>
              <button
                type="button"
                onClick={() => router.replace('/developer/users')}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-white/80 transition hover:border-white/20"
              >
                <span className="flex items-center gap-2">
                  <LuCode className="h-4 w-4 text-indigo-300" />
                  Kullanıcı Listesi
                </span>
                <span className="text-xs text-white/40">sayfa</span>
              </button>
              <button
                type="button"
                onClick={() => router.replace('/developer/maintenance')}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-white/80 transition hover:border-white/20"
              >
                <span className="flex items-center gap-2">
                  <LuWrench className="h-4 w-4 text-indigo-300" />
                  Bakım Yönetimi
                </span>
                <span className="text-xs text-white/40">sayfa</span>
              </button>
              <button
                type="button"
                onClick={() => router.replace('/developer/users')}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-white/80 transition hover:border-white/20"
              >
                <span className="flex items-center gap-2">
                  <LuShield className="h-4 w-4 text-indigo-300" />
                  Yetkiler & Güvenlik
                </span>
                <span className="text-xs text-white/40">sayfa</span>
              </button>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-[#0f131d] p-6">
            <h2 className="text-lg font-semibold text-white">Süper Kontrol Merkezi</h2>
            <p className="mt-1 text-sm text-white/60">
              Sunucunun tamamını buradan yönetin. Operasyon, otomasyon ve olay yönetimi tek panelde.
            </p>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs text-white/50">Canlı Sistem</p>
                <p className="mt-2 text-sm font-semibold text-emerald-300">Stabil</p>
                <p className="mt-1 text-[11px] text-white/40">Çekirdek servisler yeşil</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs text-white/50">Görev Kuyruğu</p>
                <p className="mt-2 text-sm font-semibold text-white/70">0 bekleyen</p>
                <p className="mt-1 text-[11px] text-white/40">Otomasyon temiz</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs text-white/50">Güvenlik</p>
                <p className="mt-2 text-sm font-semibold text-emerald-300">Koruma aktif</p>
                <p className="mt-1 text-[11px] text-white/40">Kritik kurallar devrede</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <button
                type="button"
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-white/80 transition hover:border-white/20"
              >
                <LuRadar className="h-4 w-4 text-indigo-300" />
                Canlı İzleme Aç
              </button>
              <button
                type="button"
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-white/80 transition hover:border-white/20"
              >
                <LuCommand className="h-4 w-4 text-indigo-300" />
                Komut Kontrol Paneli
              </button>
              <button
                type="button"
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-white/80 transition hover:border-white/20"
              >
                <LuPodcast className="h-4 w-4 text-indigo-300" />
                Acil Yayın Modu
              </button>
              <button
                type="button"
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-white/80 transition hover:border-white/20"
              >
                <LuFlag className="h-4 w-4 text-indigo-300" />
                Özellik Bayrakları
              </button>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-[#0f131d] p-6">
            <h2 className="text-lg font-semibold text-white">Bakım Yönetimi</h2>
            <p className="mt-1 text-sm text-white/60">
              Bakım modülü artık ayrı sayfada yönetiliyor.
            </p>
            <button
              type="button"
              onClick={() => router.replace('/developer/maintenance')}
              className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:border-white/20"
            >
              <LuWrench className="h-4 w-4 text-indigo-300" />
              Bakım sayfasına git
            </button>
          </section>

          <section className="rounded-3xl border border-white/10 bg-[#0f131d] p-6">
            <h2 className="text-lg font-semibold text-white">Sistem Durumu</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs text-white/50">Mail Servisi</p>
                <p className="mt-2 text-sm font-semibold text-emerald-300">Aktif</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs text-white/50">Bildirimler</p>
                <p className="mt-2 text-sm font-semibold text-emerald-300">Aktif</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs text-white/50">Bakım</p>
                <p className="mt-2 text-sm font-semibold text-white/70">Kapalı</p>
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-3xl border border-white/10 bg-[#0f131d] p-6">
            <h2 className="text-base font-semibold text-white">Geliştirici Notları</h2>
            <p className="mt-2 text-sm text-white/60">
              Sistem ayarları üzerinde çalışırken kritik değişiklikleri burada takip edebilirsiniz.
            </p>
            <ul className="mt-4 space-y-3 text-sm text-white/70">
              <li className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                Mail kategorileri güncellendi.
              </li>
              <li className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                Verify rol kontrolü mailde kapatıldı.
              </li>
              <li className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                Mail kutusu tam ekran deneyimine taşındı.
              </li>
              <li className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                Bakım yönetimi developer paneline taşındı.
              </li>
            </ul>
          </section>

          <section className="rounded-3xl border border-white/10 bg-[#0f131d] p-6">
            <h2 className="text-base font-semibold text-white">Destek</h2>
            <p className="mt-2 text-sm text-white/60">Acil müdahale ve destek kanalları.</p>
            <button
              type="button"
              className="mt-4 flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70 transition hover:border-white/30 hover:text-white"
            >
              <span className="flex items-center gap-2">
                <LuLifeBuoy className="h-4 w-4 text-indigo-300" />
                Teknik Destek Kanalı
              </span>
              <span className="text-xs text-white/40">discord</span>
            </button>
          </section>
        </aside>
      </div>
      )}
    </div>
  );
}