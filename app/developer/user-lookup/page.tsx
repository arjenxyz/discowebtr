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
} from 'react-icons/lu';

type UserInfo = {
  id: string;
  username: string;
  avatar: string | null;
};

const DENIED_MESSAGES = [
  'Hop dur bakalım, nereye böyle kereta?',
  'Burası geliştirici alanı, gizli geçit kapalı.',
  'Yetkisiz giriş tespit edildi. Geri dön!',
  'Bu kapı sadece developer için açılıyor.',
  'Dur bakalım kahraman, buraya giriş yetkin yok.',
  'Şifreli bölge! Erişim reddedildi.',
  'Bu taraf VIP, önce izin lazım.',
  'Yetki yoksa buradan geçiş yok!',
  'Gizli laboratuvar. Girişin yasak.',
  'Uyarı: Yetkisiz ziyaretçi algılandı.',
];

type UserItem = {
  id: string;
  discord_id: string;
  username: string;
  email?: string | null;
  points: number;
  role_level: number;
  created_at: string;
};

export default function DeveloperUserLookupPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [accessLoading, setAccessLoading] = useState(true);
  const [accessAllowed, setAccessAllowed] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchUsers, setSearchUsers] = useState<UserItem[]>([]);
  const [searchServers, setSearchServers] = useState<Array<{ discord_id: string | null; name: string; slug: string; invite_link?: string | null }>>([]);
  const [oauthGuilds, setOauthGuilds] = useState<
    Array<{
      discord_id: string | null;
      name: string;
      slug: string;
      icon_url?: string | null;
      link?: string | null;
      invite?: string | null;
    }>
  >([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [joinLoadingId, setJoinLoadingId] = useState<string | null>(null);
  const [joinMessage, setJoinMessage] = useState<string | null>(null);
  const [deniedMessage, setDeniedMessage] = useState<string | null>(null);


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
        const response = await fetch('/api/developer/access', { cache: 'no-store' });
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
    if (!accessLoading && !accessAllowed) {
      const index = Math.floor(Math.random() * DENIED_MESSAGES.length);
      setDeniedMessage(DENIED_MESSAGES[index]);
    }
  }, [accessLoading, accessAllowed]);

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
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/';
    } catch {
      window.location.href = '/';
    }
  };

  const handleSearch = async () => {
    const query = searchQuery.trim();
    if (!query) {
      setSearchUsers([]);
      setSearchServers([]);
      setSearchError('Lütfen arama terimi girin.');
      return;
    }
    if (!/^\d{10,}$/.test(query) && query.length < 3) {
      setSearchError('Kullanıcı adı için en az 3 karakter girin.');
      return;
    }
    try {
      setSearchLoading(true);
      setSearchError(null);
      setHasSearched(true);
      const response = await fetch(`/api/developer/user-lookup?query=${encodeURIComponent(query)}`);
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        if (data.error === 'unauthorized') {
          setSearchError('Giriş yapmanız gerekiyor.');
        } else if (data.error === 'forbidden') {
          setSearchError('Bu işlem için yetkiniz yok.');
        } else if (data.error === 'developer_role_missing') {
          setSearchError('Developer rolü tanımlı değil.');
        } else if (data.error === 'missing_query') {
          setSearchError('Arama terimi gerekli.');
        } else {
          setSearchError('Kullanıcı bulunamadı.');
        }
        setSearchUsers([]);
        setSearchServers([]);
        return;
      }
      const data = (await response.json()) as {
        users?: UserItem[];
        servers?: Array<{ discord_id: string | null; name: string; slug: string; invite_link?: string | null }>;
        oauthGuilds?: Array<{
          discord_id: string | null;
          name: string;
          slug: string;
          icon_url?: string | null;
          link?: string | null;
          invite?: string | null;
        }>;
      };
      setSearchUsers(data.users ?? []);
      setSearchServers(data.servers ?? []);
      setOauthGuilds(data.oauthGuilds ?? []);
      setJoinMessage(null);
    } catch {
      setSearchError('Kullanıcı sorgulanamadı.');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleJoin = async (discordId: string) => {
    try {
      setJoinLoadingId(discordId);
      setJoinMessage(null);
      const response = await fetch('/api/developer/guild-join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: discordId }),
      });
      if (response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { status?: string };
        if (payload.status === 'already_member') {
          setJoinMessage('Kullanıcı zaten destek sunucusunda.');
        } else {
          setJoinMessage('Kullanıcı destek sunucusuna eklendi.');
        }
        return;
      }
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (data.error === 'missing_oauth_token') {
        setJoinMessage('Kullanıcının OAuth erişimi bulunamadı.');
      } else if (data.error === 'token_expired') {
        setJoinMessage('Kullanıcı token süresi dolmuş. Tekrar giriş yaptırın.');
      } else if (data.error === 'missing_selected_guild') {
        setJoinMessage('Sunucu seçimi bulunamadı.');
      } else {
        setJoinMessage('Kullanıcı sunucuya eklenemedi.');
      }
    } catch {
      setJoinMessage('Kullanıcı sunucuya eklenemedi.');
    } finally {
      setJoinLoadingId(null);
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
                  onClick={() => router.replace('/developer')}
                  className="mt-2 flex w-full items-center gap-2 rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-left text-xs text-white/70 transition hover:border-white/15 hover:text-white"
                >
                  <LuSearch className="h-3.5 w-3.5 text-indigo-300" />
                  Developer Paneli
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
            <p className="mt-2 text-sm text-rose-100/80">{deniedMessage ?? accessError ?? 'Bu panele erişim izniniz yok.'}</p>
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
          <div className="rounded-3xl border border-white/10 bg-[#0f131d] p-6">
            <h1 className="text-xl font-semibold text-white">Kullanıcı Sorgulama</h1>
            <p className="mt-1 text-sm text-white/60">Discord ID veya kullanıcı adına göre ara.</p>
            <div className="mt-4 space-y-3">
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    handleSearch();
                  }
                }}
                placeholder="Örn: 1234567890 veya username"
                className="w-full rounded-xl border border-white/10 bg-[#0b0d12]/70 px-3 py-2 text-sm text-white/80 focus:border-indigo-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleSearch}
                disabled={searchLoading}
                className="w-full rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-60"
              >
                {searchLoading ? 'Sorgulanıyor...' : 'Sorgula'}
              </button>
              {searchError && <p className="text-xs text-rose-300">{searchError}</p>}
            </div>

            {(searchUsers.length > 0 || searchServers.length > 0 || oauthGuilds.length > 0) && (
              <div className="mt-6 space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  {searchUsers.map((item) => (
                    <div key={item.id} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                      <p className="text-sm font-semibold text-white">{item.username}</p>
                      <p className="text-[11px] text-white/50">{item.discord_id}</p>
                      {item.email && <p className="text-[11px] text-white/40">{item.email}</p>}
                      <p className="mt-1 text-[11px] text-white/40">{item.points} puan</p>
                      <button
                        type="button"
                        onClick={() => handleJoin(item.discord_id)}
                        disabled={joinLoadingId === item.discord_id}
                        className="mt-3 inline-flex items-center rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-[11px] text-emerald-100 transition hover:border-emerald-300 disabled:opacity-60"
                      >
                        {joinLoadingId === item.discord_id ? 'Ekleniyor...' : 'Sunucuya ekle'}
                      </button>
                    </div>
                  ))}
                </div>
                {joinMessage && <p className="text-xs text-white/60">{joinMessage}</p>}
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/40">Sunucular</p>
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    {searchServers.map((server) => (
                      <div key={server.discord_id ?? server.slug} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                        <p className="text-sm text-white/80">{server.name}</p>
                        <p className="text-[11px] text-white/40">{server.discord_id ?? server.slug}</p>
                        {server.invite_link && (
                          <div className="mt-2">
                            <a
                              href={server.invite_link}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex text-xs text-blue-200/80 transition hover:text-blue-100"
                            >
                              Widget Davet Bağlantısı
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                    {searchServers.length === 0 && (
                      <p className="text-xs text-white/40">Sunucu kaydı bulunamadı.</p>
                    )}
                  </div>
                </div>
                {oauthGuilds.length > 0 && (
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-white/40">Discord Sunucuları (OAuth)</p>
                    <div className="mt-2 grid gap-2 md:grid-cols-2">
                      {oauthGuilds.map((server) => (
                        <div key={server.discord_id ?? server.slug} className="rounded-xl border border-white/10 bg-indigo-500/10 px-4 py-3">
                          <div className="flex items-center gap-3">
                            {server.icon_url ? (
                              <Image
                                src={server.icon_url}
                                alt={server.name}
                                width={36}
                                height={36}
                                className="h-9 w-9 rounded-full border border-white/10"
                              />
                            ) : (
                              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/10 text-xs font-semibold text-white/70">
                                {server.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <p className="text-sm text-white/80">{server.name}</p>
                              <p className="text-[11px] text-white/40">{server.discord_id ?? server.slug}</p>
                            </div>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-3">
                            {server.link && (
                              <a
                                href={server.link}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex text-xs text-indigo-200/80 transition hover:text-indigo-100"
                              >
                                Widget bağlantısı
                              </a>
                            )}
                            {server.invite && (
                              <a
                                href={server.invite}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex text-xs text-emerald-200/80 transition hover:text-emerald-100"
                              >
                                Geçici davet
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {hasSearched && searchUsers.length === 0 && searchServers.length === 0 && oauthGuilds.length === 0 && !searchLoading && !searchError && (
              <div className="mt-6 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
                Sonuç bulunamadı.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
