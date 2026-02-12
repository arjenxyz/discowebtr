'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LuBell,
  LuChartBar,
  LuChevronRight,
  LuClipboardList,
  LuChevronDown,
  LuFileText,
  LuTriangle,
  LuBadgePercent,
  LuClock,
  LuPackage,
  LuTag,
  LuLogOut,
  LuSettings,
  LuStore,
  LuUser,
  LuWallet,
} from 'react-icons/lu';

const MENU_GROUPS = [
  {
    title: 'Genel',
    items: [{ href: '/admin', label: 'Genel Bakış', icon: <LuChartBar className="h-5 w-5" /> }],
  },
  {
    title: 'Mağaza',
    items: [
      {
        label: 'Mağaza',
        icon: <LuStore className="h-5 w-5" />,
        children: [
          {
            href: '/admin/store/products/new',
            label: 'Yeni Ürün Oluştur',
            group: 'Oluştur',
            icon: <LuPackage className="h-4 w-4" />,
          },
          {
            href: '/admin/store/promos/new',
            label: 'Promosyon Kodu Oluştur',
            group: 'Oluştur',
            icon: <LuTag className="h-4 w-4" />,
          },
          {
            href: '/admin/store/discounts/new',
            label: 'İndirim Kodu Oluştur',
            group: 'Oluştur',
            icon: <LuBadgePercent className="h-4 w-4" />,
          },
          {
            href: '/admin/store/orders/pending',
            label: 'Bekleyen Siparişler',
            group: 'Siparişler',
            icon: <LuClock className="h-4 w-4" />,
          },
          {
            href: '/admin/store/orders/stuck',
            label: 'Sorunlu Siparişler',
            group: 'Siparişler',
            icon: <LuTriangle className="h-4 w-4" />,
          },
          {
            href: '/admin/store/orders/failed',
            label: 'Başarısız Siparişler',
            group: 'Siparişler',
            icon: <LuFileText className="h-4 w-4" />,
          },
          {
            href: '/admin/store/products',
            label: 'Ürün Listesi',
            group: 'Listeler',
            icon: <LuClipboardList className="h-4 w-4" />,
          },
          {
            href: '/admin/store/promos',
            label: 'Promosyon Listesi',
            group: 'Listeler',
            icon: <LuTag className="h-4 w-4" />,
          },
          {
            href: '/admin/store/discounts',
            label: 'İndirim Listesi',
            group: 'Listeler',
            icon: <LuBadgePercent className="h-4 w-4" />,
          },
        ],
      },
    ],
  },
  {
    title: 'Yönetim',
    items: [
      { href: '/admin/wallet', label: 'Bakiye Yönetimi', icon: <LuWallet className="h-5 w-5" /> },
      { href: '/admin/earn-settings', label: 'Kazanç Ayarları', icon: <LuWallet className="h-5 w-5" /> },
      { href: '/admin/log-channels', label: 'Log Kanalları', icon: <LuClipboardList className="h-5 w-5" /> },
    ],
  },
];

const HEADER_LINKS = [
  { href: '/admin/guide', label: 'Kullanım Kılavuzu', icon: <LuFileText className="h-4 w-4" /> },
];

const navItemClass = (active: boolean, collapsed: boolean) =>
  `group flex w-full items-center text-sm transition ${
    collapsed
      ? `justify-center rounded-2xl px-2 py-2 ${
          active ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/8 hover:text-white'
        }`
      : `gap-3 rounded-2xl px-4 py-3 ${
          active ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
        }`
  }`;

const navIconClass = (active: boolean, collapsed: boolean) =>
  `flex items-center justify-center ${
    collapsed ? 'h-10 w-10 rounded-full' : 'h-9 w-9 rounded-xl bg-white/5'
  } ${
    collapsed
      ? active
        ? 'bg-white/12 text-white'
        : 'bg-white/8 text-white/85 group-hover:text-white'
      : 'text-indigo-200'
  }`;

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [notificationMenuOpen, setNotificationMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [storeMenuOpen, setStoreMenuOpen] = useState(false);
  const notificationMenuRef = useRef<HTMLDivElement | null>(null);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const [profile, setProfile] = useState<{
    username: string;
    nickname: string | null;
    avatarUrl: string;
    guildName: string;
    guildIcon: string | null;
  } | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const loadProfile = async () => {
      const response = await fetch('/api/admin/profile', { credentials: 'include', cache: 'no-store' });
      if (response.ok) {
        const data = (await response.json()) as {
          username: string;
          nickname: string | null;
          avatarUrl: string;
          guildName: string;
          guildIcon: string | null;
        };
        setProfile(data);
      }
    };

    loadProfile();
  }, []);

  useEffect(() => {
    const checkAccess = async () => {
      const safeJson = async (res: Response) => {
        try {
          const ct = res.headers.get('content-type') || '';
          if (ct.includes('application/json')) return await res.json();
        } catch (e) {
          // ignore
        }
        return { status: res.status, statusText: res.statusText };
      };

      try {
        // Admin erişimi kontrolü — cookie/token gönderimi için credentials: 'include'
        const maxAttempts = 2;
        let adminOk = false;
        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
          const adminResponse = await fetch('/api/admin/profile', { credentials: 'include', cache: 'no-store' });
          if (adminResponse.ok) {
            console.log('Admin erişimi onaylandı.');
            adminOk = true;
            break;
          }
          const info = await safeJson(adminResponse);
          console.warn(`Admin erişimi reddedildi (attempt ${attempt}):`, info);
          if (adminResponse.status === 403 && attempt < maxAttempts) {
            // kısa bir bekleme, olası oturum/cookie propagation sorunları için retry
            // eslint-disable-next-line no-await-in-loop
            await new Promise((r) => setTimeout(r, 300));
            continue;
          }
          break;
        }

        if (adminOk) return;

        // Developer erişimi kontrolü
        const devResponse = await fetch('/api/developer/check-access', { credentials: 'include', cache: 'no-store' });
        if (devResponse.ok) {
          console.log('Developer erişimi onaylandı.');
          return;
        }
        const devInfo = await safeJson(devResponse);
        console.warn('Developer erişimi reddedildi veya bulunamadı:', devInfo);

        // Ne admin ne developer, yönlendirme yap
        console.log('Erişim reddedildi, dashboarda yönlendiriliyor.');
        window.location.href = '/dashboard';
      } catch (error) {
        console.error('Erişim kontrolü sırasında hata oluştu:', error);
        window.location.href = '/dashboard';
      }
    };

    checkAccess();
  }, []);

  useEffect(() => {
    if (!notificationMenuOpen) {
      return undefined;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (!notificationMenuRef.current) {
        return;
      }
      if (!notificationMenuRef.current.contains(event.target as Node)) {
        setNotificationMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [notificationMenuOpen]);

  useEffect(() => {
    if (!accountMenuOpen) {
      return undefined;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (!accountMenuRef.current) {
        return;
      }
      if (!accountMenuRef.current.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [accountMenuOpen]);

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
    <div className="h-screen overflow-hidden bg-[#0b0d12] text-white">
      <div className="flex h-full">
        <aside
          className={`sticky top-0 flex h-screen flex-col border-r border-white/5 bg-[#0f1116] transition-all duration-300 ${
            collapsed ? 'w-[110px]' : 'w-[320px]'
          }`}
        >
          <div className={`flex h-16 items-center ${collapsed ? 'justify-center' : 'justify-between'} px-4`}>
            {!collapsed && <span className="text-xs uppercase tracking-[0.2em] text-white/40">Menü</span>}
            <button
              type="button"
              onClick={() => setCollapsed((prev) => !prev)}
              className={`rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:border-white/30 hover:text-white ${
                collapsed ? 'h-12 w-12 p-0' : 'px-3 py-1 text-xs'
              }`}
              aria-label={collapsed ? 'Menüyü Aç' : 'Menüyü Kapat'}
            >
              {collapsed ? <LuChevronRight className="mx-auto h-6 w-6" /> : 'Menüyü Kapat'}
            </button>
          </div>

          {collapsed ? (
            <div className="px-4">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
              </div>
            </div>
          ) : (
            <div className="px-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.3em] text-white/40">Sunucu</p>
                    <p className="text-sm font-semibold text-white">
                      {profile?.guildName ?? 'Veri Merkezi'}
                    </p>
                  </div>
                  <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-emerald-200">
                    Aktif
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="mt-5 flex-1 overflow-y-auto px-3 pb-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <nav className="space-y-4">
              {MENU_GROUPS.map((group) => (
                <div key={group.title} className="space-y-2">
                  {!collapsed && (
                    <p className="px-3 text-[11px] uppercase tracking-[0.3em] text-white/30">{group.title}</p>
                  )}
                  {group.items.map((item) => {
                    // Durum 1: Dropdown Menü (Alt öğeleri var)
                    if ('children' in item && item.children) {
                      const isActive = pathname.startsWith('/admin/store');
                      const isOpen = storeMenuOpen && !collapsed;
                      const groupedChildren = item.children.reduce((acc, child) => {
                        const group = child.group ?? 'Diğer';
                        if (!acc[group]) {
                          acc[group] = [];
                        }
                        acc[group].push(child);
                        return acc;
                      }, {} as Record<string, typeof item.children>);

                      return (
                        <div key={item.label} className="space-y-2">
                          <button
                            type="button"
                            onClick={() => setStoreMenuOpen((prev) => !prev)}
                            className={navItemClass(isActive, collapsed)}
                          >
                            <span className={navIconClass(isActive, collapsed)}>{item.icon}</span>
                            {!collapsed && (
                              <div className="flex flex-1 items-center justify-between">
                                <span>{item.label}</span>
                                <LuChevronDown
                                  className={`h-4 w-4 text-white/50 transition ${
                                    isOpen ? 'rotate-180' : 'rotate-0'
                                  }`}
                                />
                              </div>
                            )}
                          </button>
                          {isOpen && (
                            <div className="ml-6">
                              <div className="space-y-4">
                                {Object.entries(groupedChildren).map(([groupTitle, children]) => (
                                  <div key={groupTitle} className="space-y-2">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/40">
                                      {groupTitle}
                                    </p>
                                    <div className="space-y-2 border-l border-white/10 pl-3">
                                      {children.map((child) => (
                                        <Link
                                          key={child.href}
                                          href={child.href}
                                          className={`group flex items-center gap-3 rounded-xl border border-white/10 px-3 py-2 text-sm transition ${
                                            pathname === child.href
                                              ? 'bg-white/15 text-white ring-1 ring-white/15'
                                              : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                                          }`}
                                        >
                                          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/10 text-indigo-200">
                                            {child.icon}
                                          </span>
                                          <span>{child.label}</span>
                                        </Link>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    }

                    // Durum 2: Tekil Link (href var mı kontrolü eklendi)
                    if ('href' in item) {
                      const active = pathname === item.href;
                      return (
                        <Link
                          key={`${item.href}-${item.label}`}
                          href={item.href}
                          className={navItemClass(active, collapsed)}
                        >
                          <span className={navIconClass(active, collapsed)}>{item.icon}</span>
                          {!collapsed && <span>{item.label}</span>}
                        </Link>
                      );
                    }

                    // Ne href ne de children varsa (Type safety için)
                    return null;
                  })}
                </div>
              ))}
            </nav>
          </div>

          <div className="px-4 pb-6" />
        </aside>

        <div className="flex-1 overflow-hidden">
          <header className="flex h-16 items-center justify-between border-b border-white/5 bg-[#0b0d12]/80 px-6">
            <div className="flex items-center gap-2">
              <div className="relative" ref={notificationMenuRef}>
                <button
                  type="button"
                  onClick={() => setNotificationMenuOpen((prev) => !prev)}
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-sm transition ${
                    pathname.startsWith('/admin/notifications')
                      ? 'bg-white/10 text-white'
                      : 'bg-white/5 text-white/70 hover:border-white/30 hover:text-white'
                  }`}
                >
                  <span className="text-indigo-200"><LuBell className="h-4 w-4" /></span>
                  <span className="sr-only">Bildirimler</span>
                </button>
                {notificationMenuOpen && (
                  <div className="absolute left-0 top-12 z-20 w-64 overflow-hidden rounded-2xl border border-white/10 bg-[#0f1116] shadow-[0_20px_50px_rgba(15,23,42,0.45)]">
                    <div className="border-b border-white/5 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300">Bildirimler</p>
                      <p className="mt-1 text-xs text-white/50">Gönderim ve geçmişe hızlı erişim</p>
                    </div>
                    <div className="p-2">
                      <Link
                        href="/admin/notifications/send"
                        onClick={() => setNotificationMenuOpen(false)}
                        className="group flex items-center justify-between rounded-xl px-3 py-2 text-sm text-white/70 transition hover:bg-white/5 hover:text-white"
                      >
                        <span className="flex items-center gap-2">
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-indigo-200 transition group-hover:bg-indigo-500/20">
                            <LuBell className="h-4 w-4" />
                          </span>
                          Bildirim Gönder
                        </span>
                        <span className="text-xs text-white/40">#send</span>
                      </Link>
                      <Link
                        href="/admin/notifications/history"
                        onClick={() => setNotificationMenuOpen(false)}
                        className="group flex items-center justify-between rounded-xl px-3 py-2 text-sm text-white/70 transition hover:bg-white/5 hover:text-white"
                      >
                        <span className="flex items-center gap-2">
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-indigo-200 transition group-hover:bg-indigo-500/20">
                            <LuFileText className="h-4 w-4" />
                          </span>
                          Bildirim Geçmişi
                        </span>
                        <span className="text-xs text-white/40">#history</span>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
              {HEADER_LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-sm transition ${
                    pathname === item.href
                      ? 'bg-white/10 text-white'
                      : 'bg-white/5 text-white/70 hover:border-white/30 hover:text-white'
                  }`}
                >
                  <span className="text-indigo-200">{item.icon}</span>
                  <span className="sr-only">{item.label}</span>
                </Link>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 transition hover:border-white/30 hover:text-white"
              >
                <LuUser className="h-4 w-4 text-indigo-200" />
                Üye Paneli
              </Link>
              <div className="relative" ref={accountMenuRef}>
                <button
                  type="button"
                  onClick={() => setAccountMenuOpen((prev) => !prev)}
                  className={`inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1.5 text-sm transition ${
                    accountMenuOpen
                      ? 'bg-white/10 text-white'
                      : 'text-white/70 hover:border-white/30 hover:text-white'
                  }`}
                >
                  <div className="h-7 w-7 overflow-hidden rounded-full border border-white/10 bg-white/10">
                    {profile ? (
                      <Image
                        src={profile.avatarUrl}
                        alt="avatar"
                        width={32}
                        height={32}
                        unoptimized
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-white/50">?</div>
                    )}
                  </div>
                  <div className="hidden flex-col text-left md:flex">
                    <span className="text-sm font-semibold text-white">
                      {profile?.nickname ?? profile?.username ?? 'Yetkili'}
                    </span>
                  </div>
                  <LuChevronDown className={`h-4 w-4 text-white/50 transition ${accountMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {accountMenuOpen && (
                  <div className="absolute right-0 top-12 z-20 w-60 overflow-hidden rounded-2xl border border-white/10 bg-[#0f1116] shadow-[0_20px_50px_rgba(15,23,42,0.45)]">
                    <div className="border-b border-white/5 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300">Hesap</p>
                      <p className="mt-1 text-xs text-white/50">
                        {profile?.nickname ?? profile?.username ?? 'Yetkili'} · Admin
                      </p>
                    </div>
                    <div className="p-2">
                      <Link
                        href="/admin/settings"
                        onClick={() => setAccountMenuOpen(false)}
                        className="group flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-white/70 transition hover:bg-white/5 hover:text-white"
                      >
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-indigo-200 transition group-hover:bg-indigo-500/20">
                          <LuSettings className="h-4 w-4" />
                        </span>
                        Ayarlar
                      </Link>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="group flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-white/70 transition hover:bg-white/5 hover:text-white"
                      >
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-rose-200 transition group-hover:bg-rose-500/10">
                          <LuLogOut className="h-4 w-4" />
                        </span>
                        Çıkış Yap
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          <main className="h-[calc(100vh-64px)] overflow-y-auto px-8 py-10 2xl:px-12">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}