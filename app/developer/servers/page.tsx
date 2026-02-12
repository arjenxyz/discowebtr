'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  LuChevronDown,
  LuChrome,
  LuLogOut,
  LuSearch,
  LuShield,
  LuDatabase,
  LuWrench,
} from 'react-icons/lu';

type UserInfo = {
  id: string;
  username: string;
  avatar: string | null;
};

type ServerItem = {
  id: string;
  name: string;
  slug: string;
  discord_id: string | null;
  is_setup: boolean;
  created_at: string;
};

export default function DeveloperServersPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [accessLoading, setAccessLoading] = useState(true);
  const [accessAllowed, setAccessAllowed] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [servers, setServers] = useState<ServerItem[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

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
        if (response.ok) {
          setAccessAllowed(true);
          setAccessError(null);
          return;
        }
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        if (data.error === 'developer_role_missing') {
          setAccessError('Developer rolü tanımlı değil.');
        } else if (data.error === 'unauthorized') {
          setAccessError('Giriş yapmanız gerekiyor.');
        } else {
          setAccessError('Bu panele erişim izniniz yok.');
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
    if (!accessAllowed) {
      return;
    }

    const loadData = async () => {
      try {
        setDataLoading(true);
        setDataError(null);
        const response = await fetch('/api/developer/servers', { credentials: 'include', cache: 'no-store' });
        if (!response.ok) {
          setDataError('Veriler yüklenemedi.');
          setDataLoading(false);
          return;
        }
        const data = (await response.json()) as { items?: ServerItem[] };
        setServers(data.items ?? []);
      } catch {
        setDataError('Veriler yüklenemedi.');
      } finally {
        setDataLoading(false);
      }
    };

    loadData();
  }, [accessAllowed]);

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
          } catch (e) {
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
                  onClick={() => router.replace('/developer')}
                  className="flex w-full items-center gap-2 rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-left text-xs text-white/70 transition hover:border-white/15 hover:text-white"
                >
                  <LuChrome className="h-3.5 w-3.5 text-indigo-300" />
                  Developer Paneli
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
                  onClick={() => router.replace('/developer/maintenance')}
                  className="mt-2 flex w-full items-center gap-2 rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-left text-xs text-white/70 transition hover:border-white/15 hover:text-white"
                >
                  <LuWrench className="h-3.5 w-3.5 text-indigo-300" />
                  Bakım Yönetimi
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
        <div className="mx-auto max-w-5xl px-6 py-8">
          <section className="rounded-3xl border border-white/10 bg-[#0f131d] p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-semibold text-white">Sunucu Listesi</h1>
                <p className="mt-1 text-sm text-white/60">Tüm kayıtlı sunucular.</p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
                {servers.length} sunucu
              </span>
            </div>
            {dataLoading && <p className="mt-4 text-sm text-white/60">Yükleniyor...</p>}
            {dataError && <p className="mt-4 text-sm text-rose-300">{dataError}</p>}
            {!dataLoading && !dataError && (
              <div className="mt-4 max-h-[420px] space-y-2 overflow-y-auto pr-1">
                {servers.map((server) => (
                  <div key={server.id} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{server.name}</p>
                        <p className="text-[11px] text-white/50">{server.discord_id ?? 'discord-id yok'}</p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] ${
                          server.is_setup ? 'bg-emerald-500/15 text-emerald-200' : 'bg-rose-500/15 text-rose-200'
                        }`}
                      >
                        {server.is_setup ? 'Kurulu' : 'Kurulum yok'}
                      </span>
                    </div>
                  </div>
                ))}
                {servers.length === 0 && <p className="text-sm text-white/50">Sunucu bulunamadı.</p>}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
