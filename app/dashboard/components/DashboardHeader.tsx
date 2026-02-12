'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { LuHouse, LuMail, LuShield, LuStore, LuLogOut, LuSettings, LuChevronRight, LuArrowLeft } from 'react-icons/lu';
import Image from 'next/image';
import DiscordAgreementButton from '@/components/DiscordAgreementButton';
import type { Notification, Section } from '../types';
import NotificationsDropdown from './NotificationsDropdown';
import type { JSX, RefObject } from 'react';


type DashboardHeaderProps = {
  unauthorized: boolean;
  walletLoading: boolean;
  walletBalance: number;
  loginUrl: string;
  isDeveloper: boolean;
  navigation: {
    activeSection: Section;
    onNavigate: (section: Section) => void;
  };
  profile: {
    name: string;
    username: string;
    avatarUrl: string | null;
  } | null;
  profileLoading: boolean;
  server: {
    data: { id: string; name: string; iconUrl: string | null } | null;
    loading: boolean;
    guilds: Array<{ id: string; name: string; iconUrl: string | null; isAdmin: boolean; isSetup: boolean }>;
    onSelectServer: (guildId: string) => void;
  };
  notifications: {
    open: boolean;
    unreadCount: number;
    loading: boolean;
    items: Notification[];
    onToggle: () => void;
    onOpenNotification: (item: Notification) => void;
    onOpenModal?: () => void;
    menuRef: RefObject<HTMLDivElement>;
  };
  renderNotificationBody: (body: string) => React.ReactNode;
  settings: {
    open: boolean;
    onToggle: () => void;
    onOpenSettings: () => void;
    onOpenTransfer: () => void;
    onOpenPromotions: () => void;
    onOpenDiscounts: () => void;
    logoutHref: string;
    menuRef: RefObject<HTMLDivElement | null>;
  };
  maintenance?: {
    siteActive: boolean;
    showIndicator: boolean;
  };
  mailUnreadCount?: number;
};

// Rastgele GIF Listesi
const RANDOM_GIFS = [
  '/gif/image.gif',
  '/gif/indir2.gif',
  '/gif/sungerbubi.gif',
  '/gif/Patickstar.gif',
  '/gif/cat.gif'
];

// Çıkış yapıldığında çerezleri ve localStorage'ı temizle
const handleLogout = async () => {
  try {
    if (typeof document !== 'undefined') {
      document.cookie.split(';').forEach((cookie) => {
        const eqPos = cookie.indexOf('=');
        const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
        try {
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
        } catch {
          // ignore
        }
      });
    }

    localStorage.clear();
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/';
  } catch {
    localStorage.clear();
    window.location.href = '/';
  }
};

export default function DashboardHeader({
  unauthorized,
  walletLoading,
  walletBalance,
  loginUrl,
  isDeveloper,
  navigation,
  profile,
  server,
  notifications,
  mailUnreadCount = 0,
  renderNotificationBody,
  settings,
}: DashboardHeaderProps) {
  const router = useRouter();
  
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isServerSelectOpen, setIsServerSelectOpen] = useState(false);
  const [currentGif, setCurrentGif] = useState(RANDOM_GIFS[0]);
  const [isLogoHovered, setIsLogoHovered] = useState(false);
  const [fetchedIcons, setFetchedIcons] = useState<Record<string, string | null>>({});
  const [switchingServerId, setSwitchingServerId] = useState<string | null>(null);
  const switchTimeoutRef = React.useRef<number | null>(null);

  // YENİ: Alt menü state'i (Sunucu seçimi için)
  const [activeSubmenu, setActiveSubmenu] = useState<'main' | 'servers'>('main');

  // Button to load accrued balances (message + voice) into user's wallet
  const LoadAccruedButton = () => {
    const [loading, setLoading] = useState(false);

    const handleLoad = async () => {
      if (loading) return;
      setLoading(true);
      try {
        const res = await fetch('/api/member/load-accrued', { method: 'POST', credentials: 'include' });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          window.alert('Hata: ' + (err?.error || res.statusText));
          setLoading(false);
          return;
        }
        const data = await res.json();
        window.alert(`Başarılı: ${data.totalTransferred ?? 0} papel yüklendi (${data.count ?? 0} kayıt).`);
        // refresh the page to update wallet display
        window.location.reload();
      } catch {
        window.alert('İşlem sırasında hata oluştu.');
      } finally {
        setLoading(false);
      }
    };

    return (
      <button
        onClick={handleLoad}
        disabled={loading}
        className="flex-1 flex items-center justify-center gap-2 p-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 text-xs font-bold text-emerald-400 hover:text-white transition-all border border-emerald-500/20 hover:border-transparent group"
      >
        <LuStore className="w-4 h-4 group-hover:scale-110 transition-transform" />
        {loading ? 'Yükleniyor...' : 'Bakiyelerimi Yükle'}
      </button>
    );
  };

  // Menü açıldığında GIF seç ve her açılışta ana menüye dön
  useEffect(() => {
    if (isProfileOpen) {
      const randomIndex = Math.floor(Math.random() * RANDOM_GIFS.length);
      setCurrentGif(RANDOM_GIFS[randomIndex]);
      setActiveSubmenu('main'); // Her açılışta ana menüye sıfırla
    }
  }, [isProfileOpen]);

  useEffect(() => {
    console.log('DashboardHeader Props:', {
      unauthorized,
      walletLoading,
      walletBalance,
      isDeveloper,
      profile,
      server,
      notifications,
      settings,
    });

    if (server?.data) {
      console.log('Active Server:', server.data);
    }

    if (server?.guilds) {
      console.log('Available Guilds:', server.guilds);
    }
  }, [unauthorized, walletLoading, walletBalance, isDeveloper, profile, server, notifications, settings]);

  // Fetch missing guild icons from server-side Discord route when available
  useEffect(() => {
    if (!server?.guilds || server.guilds.length === 0) return;

    server.guilds.forEach((g) => {
      if (g.iconUrl || fetchedIcons[g.id] !== undefined) return; // already have
      void (async () => {
        try {
          const res = await fetch(`/api/discord/guild/${g.id}`);
          if (!res.ok) {
            setFetchedIcons(prev => ({ ...prev, [g.id]: null }));
            return;
          }
          const data = await res.json();
          setFetchedIcons(prev => ({ ...prev, [g.id]: data.icon ?? null }));
        } catch {
          setFetchedIcons(prev => ({ ...prev, [g.id]: null }));
        }
      })();
    });
  }, [server?.guilds, fetchedIcons]);

  const handleSelectServer = (guild: { id: string; name: string; isSetup: boolean }) => {
    if (!guild.isSetup) {
      console.log(`Kurulum yapılmamış sunucu: ${guild.name}`);
      return;
    }
    setSwitchingServerId(guild.id);
    // clear any existing pending switch
    if (switchTimeoutRef.current) {
      clearTimeout(switchTimeoutRef.current);
      switchTimeoutRef.current = null;
    }
    // Schedule the server switch after a short animation window
    switchTimeoutRef.current = window.setTimeout(() => {
      server.onSelectServer(guild.id);
      switchTimeoutRef.current = null;
    }, 2000);
    setIsProfileOpen(false);
  };

  

  useEffect(() => {
    return () => {
      if (switchTimeoutRef.current) {
        clearTimeout(switchTimeoutRef.current);
        switchTimeoutRef.current = null;
      }
    };
  }, []);

  const navItems: Array<{ key: Section; label: string; requiresAuth?: boolean; requiresDeveloper?: boolean; icon: JSX.Element }> = [
    { key: 'overview', label: 'Genel', icon: <LuHouse className="h-4 w-4" /> },
    { key: 'store', label: 'Mağaza', icon: <LuStore className="h-4 w-4" /> },
    { key: 'mail', label: 'Mail', requiresAuth: true, icon: <LuMail className="h-4 w-4" /> },
  ];

  return (
    <>
      {/* --- FOCUS OVERLAY --- */}
      <div 
        onClick={() => {
          setIsProfileOpen(false);
          setIsServerSelectOpen(false);
        }}
        className={`fixed inset-0 bg-black/60 backdrop-blur-[12px] transition-all duration-500 z-[9990] ${
          isProfileOpen || isServerSelectOpen ? 'opacity-100 visible cursor-pointer' : 'opacity-0 invisible pointer-events-none'
        }`}
      />

      {/* Server switching overlay (large gif + improved design) */}
      {switchingServerId && (() => {
          const selected = server?.guilds?.find((g) => g.id === switchingServerId);
          const selectedName = selected?.name ?? server?.data?.name ?? 'Sunucu';
          const selectedIcon = selected?.iconUrl ?? fetchedIcons[switchingServerId ?? ''] ?? server.data?.iconUrl ?? null;

          return (
            <div
              role="status"
              aria-live="polite"
              className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80"
            >
              <div className="pointer-events-none absolute inset-0" />
              <div className="pointer-events-auto rounded-2xl bg-[#0f1116]/85 border border-white/8 p-6 shadow-2xl max-w-[90%] w-[min(1100px,95%)] text-left">
                <div className="flex flex-col items-center gap-6 md:gap-8">
                  {/* Decorative rotating ring with server avatar in center */}
                  <div className="relative flex items-center justify-center">
                    <div
                      className="absolute rounded-full -inset-2 md:-inset-3"
                      style={{
                        background: 'conic-gradient(from 0deg, rgba(16,185,129,0.15), rgba(99,102,241,0.18), rgba(236,72,153,0.12), rgba(16,185,129,0.15))',
                        filter: 'blur(14px) saturate(120%)',
                        transformOrigin: 'center',
                        animation: 'spin 4s linear infinite',
                      }}
                    />
                    <div className="relative z-10 flex items-center justify-center w-40 h-40 md:w-52 md:h-52 rounded-full bg-[#0b0d12] ring-1 ring-white/6 overflow-hidden">
                      {selectedIcon ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={selectedIcon} alt={selectedName} className="w-full h-full object-cover" />
                        ) : (
                        <div className="flex items-center justify-center w-full h-full text-3xl font-bold text-white/90">
                          {selectedName.charAt(0)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="w-full max-w-[56rem] text-center">
                    <h3 className="text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-emerald-300 via-purple-400 to-pink-400 bg-clip-text text-transparent truncate">{selectedName}</h3>
                    <p className="text-sm text-white/60 mt-2">Sunucunuza bağlanırken birkaç işlem gerçekleştiriliyor. Bu işlem kısa sürecektir.</p>
                  </div>

                </div>
              </div>
            </div>
          );
      })()}

      {/* --- HEADER --- */}
      <header className={`fixed inset-x-0 top-0 flex h-20 items-center gap-4 bg-[#0b0d12]/90 px-6 backdrop-blur border-b border-white/5 shadow-lg overflow-visible transition-all duration-200 ${
        isProfileOpen ? 'z-[9991]' : 'z-30'
      }`}>
        
        {/* --- SOL TARAF --- */}
        <div className="flex items-center gap-3 min-w-fit">
            <div className="w-10 h-10 rounded-xl bg-[#5865F2] p-0.5 shadow-lg shadow-[#5865F2]/20 group cursor-pointer transition-transform hover:scale-110 relative z-50">
              <div className="w-full h-full bg-[#1e1f22] rounded-[10px] overflow-hidden">
                <Image src="/gif/cat.gif" alt="avatar" className="w-full h-full object-cover" width={500} height={500} />
              </div>
            </div>

            <div 
              className="relative flex items-center gap-1 cursor-pointer h-full group"
              onMouseEnter={() => setIsLogoHovered(true)}
              onMouseLeave={() => setIsLogoHovered(false)}
            >
              <div className="text-white font-black text-xl tracking-tight z-50 relative">DiscoWeb</div>

              {/* Sarkan Penguen */}
              <div className={`absolute top-[60%] left-1/2 -translate-x-1/2 z-0 transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) ${
                isLogoHovered 
                  ? 'opacity-100 translate-y-0 rotate-0' 
                  : 'opacity-0 -translate-y-12 -rotate-12 pointer-events-none'
              }`}>
                <div className="w-[200px] md:w-[280px] drop-shadow-2xl filter brightness-110">
                  <Image src="/gif/asılıpengu.gif" alt="Hanging Penguin" className="w-full h-full object-contain" width={500} height={500} />
                </div>
              </div>
            </div>
        </div>

        {/* --- ORTA MENÜ --- */}
        <div className="flex-1 flex items-center justify-center">
            <nav className="hidden lg:flex items-center gap-1">
                {navItems
                .filter((item) => (!item.requiresAuth || !unauthorized) && (!item.requiresDeveloper || isDeveloper))
                .map((item) => (
                    <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      if (item.key === 'mail') {
                        navigation.onNavigate('mail');
                        try { router.push('/dashboard/mail'); } catch { navigation.onNavigate('mail'); }
                      } else {
                        navigation.onNavigate(item.key);
                      }
                    }}
                    className={`group relative px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                        navigation.activeSection === item.key
                        ? 'bg-white/10 text-white shadow-inner'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                    >
                    <span className="flex items-center gap-2 relative z-10">
                        {item.icon}
                        {item.label}
                    </span>
                    {item.key === 'mail' && mailUnreadCount > 0 && (
                      <span
                        title={`${mailUnreadCount} okunmamış mesaj`}
                        aria-label={`${mailUnreadCount} unread mails`}
                        className={`absolute -top-1 -right-2 flex items-center justify-center rounded-full bg-rose-500 text-white text-[10px] font-bold ring-1 ring-white/10 shadow-sm select-none ${
                          mailUnreadCount > 99 ? 'px-2 h-5 min-w-[26px]' : mailUnreadCount > 9 ? 'px-2 h-5 min-w-[22px]' : 'w-5 h-5'
                        }`}
                      >
                        {mailUnreadCount > 99 ? '99+' : mailUnreadCount}
                      </span>
                    )}
                    </button>
                ))}
            </nav>
        </div>

        {/* --- SAĞ TARAF --- */}
        <div className="flex items-center gap-3">
            
            {!unauthorized && (
            <div className="hidden sm:flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 shadow-sm gap-2 transition-transform hover:scale-105">
                <Image src="/papel.gif" alt="Papel" width={20} height={20} className="h-5 w-5" />
                <span className="text-sm font-bold text-emerald-400">
                    {walletLoading ? '...' : walletBalance.toFixed(2)}
                </span>
            </div>
            )}

            {!unauthorized && (
            <NotificationsDropdown
                open={notifications.open}
                unreadCount={notifications.unreadCount}
                loading={notifications.loading}
                notifications={notifications.items}
                onToggle={notifications.onToggle}
                onOpenNotification={notifications.onOpenNotification}
                onOpenModal={notifications.onOpenModal}
                menuRef={notifications.menuRef}
                renderNotificationBody={renderNotificationBody}
            />
            )}

            {/* Sunucu seçimi navbar'dan kaldırıldı, sadece profil dropdown'da mevcut */}

            {/* --- PROFİL ALANI (GELİŞMİŞ MENÜ) --- */}
            {!unauthorized && (
                <div className="relative">
                    
                    {/* Profil Tetikleyici */}
                    <button 
                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                        className={`flex items-center gap-3 cursor-pointer p-1 rounded-full border transition-all outline-none ${
                            isProfileOpen 
                                ? 'bg-white/10 border-white/20' 
                                : 'border-transparent hover:border-white/10'
                        }`}
                    >
                        <div className="text-right hidden lg:block">
                            <div className="text-sm font-bold text-white">{profile?.username || 'Kullanıcı'}</div>
                            <div className="text-[10px] text-white/50">{server.data?.name || 'Sunucu Seçilmedi'}</div>
                        </div>
                        <div className="w-10 h-10 rounded-full border-2 border-[#5865F2] overflow-hidden shadow-[0_0_15px_rgba(88,101,242,0.4)]">
                            <Image 
                                src={profile?.avatarUrl || '/gif/cat.gif'} 
                                alt="Profile" 
                                width={40} 
                                height={40}
                                className="w-full h-full object-cover" 
                            />
                        </div>
                    </button>

                    {/* --- SAĞA AÇILAN KUTU (ANA KAPLAYICI) --- */}
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        className={`absolute top-20 right-0 w-[340px] transition-all duration-300 origin-right ${
                            isProfileOpen 
                                ? 'opacity-100 translate-x-0 scale-100 visible' 
                                : 'opacity-0 translate-x-10 scale-95 invisible'
                    }`}>
                        <div className="bg-[#1e1f22] border border-white/10 rounded-[24px] shadow-2xl overflow-hidden relative min-h-[400px]">
                            
                            {/* --- HEADER (GIF & BAŞLIK) --- */}
                            <div className="relative h-28 bg-[#5865F2]/20 w-full overflow-hidden flex items-center justify-center">
                                <div className="absolute inset-0 opacity-60">
                                    <Image 
                                        src={currentGif} 
                                        alt="Random Fun" 
                                        fill 
                                        className="object-contain scale-125"
                                        unoptimized
                                    />
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-t from-[#1e1f22] via-[#1e1f22]/50 to-transparent"></div>
                                
                                <div className="absolute bottom-3 left-4 right-4 z-10 flex items-end justify-between">
                                    {activeSubmenu === 'main' ? (
                                      <div>
                                        <p className="text-white font-bold text-xl drop-shadow-md">Merhaba, {profile?.username}!</p>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-2">
                                         <button 
                                            onClick={() => setActiveSubmenu('main')}
                                            className="p-1.5 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                                         >
                                            <LuArrowLeft className="text-white w-4 h-4" />
                                         </button>
                                         <div>
                                            <p className="text-white font-bold text-lg">Sunucu Değiştir</p>
                                            <p className="text-white/60 text-xs">Yönetmek istediğin sunucuyu seç</p>
                                         </div>
                                      </div>
                                    )}
                                </div>
                            </div>

                            {/* --- İÇERİK DEĞİŞİM ALANI --- */}
                            <div className="p-3">
                                
                                {/* 1. GÖRÜNÜM: ANA MENÜ */}
                                <div className={`space-y-2 transition-all duration-300 ${activeSubmenu === 'main' ? 'block' : 'hidden'}`}>
                                    
                                    {/* Mevcut Sunucu Bilgisi */}
                                    <div className="bg-white/5 rounded-xl p-3 border border-white/5 flex items-center gap-3">
                                        {server.data?.iconUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={server.data.iconUrl} width={40} height={40} className="rounded-lg object-cover" alt="Server" loading="lazy" />
                                      ) : (
                                          <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center font-bold">{server.data?.name?.charAt(0)}</div>
                                       )}
                                       <div className="flex-1 overflow-hidden">
                                          <p className="text-xs text-white/40 font-medium uppercase tracking-wider">Aktif Sunucu</p>
                                          <p className="text-white font-semibold truncate">{server.data?.name || 'Seçilmedi'}</p>
                                       </div>
                                    </div>

                                    {/* Menü Linkleri */}
                                    <button 
                                        onClick={() => setActiveSubmenu('servers')}
                                        className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-[#5865F2]/20 text-[#5865F2] flex items-center justify-center">
                                                <LuShield className="w-4 h-4" />
                                            </div>
                                            <span className="text-sm font-medium text-white/80 group-hover:text-white">Sunucu Değiştir</span>
                                        </div>
                                        <LuChevronRight className="text-white/40" />
                                    </button>

                                    <button 
                                        onClick={settings.onOpenSettings} 
                                        className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                                                <LuSettings className="w-4 h-4" />
                                            </div>
                                            <span className="text-sm font-medium text-white/80 group-hover:text-white">Hesap Ayarları</span>
                                        </div>
                                        <LuChevronRight className="text-white/40" />
                                    </button>

                                    {/* Diğer Kısayollar */}
                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                       <button onClick={settings.onOpenTransfer} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-center text-white/70 hover:text-white transition-colors">
                                          Papel Transfer
                                       </button>
                                       <button onClick={settings.onOpenPromotions} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-center text-white/70 hover:text-white transition-colors">
                                          Promosyonlar
                                       </button>
                                    </div>

                                </div>

                                {/* 2. GÖRÜNÜM: SUNUCU LİSTESİ */}
                                <div className={`transition-all duration-300 ${activeSubmenu === 'servers' ? 'block' : 'hidden'}`}>
                                    <div className="max-h-[250px] overflow-y-auto custom-scrollbar space-y-1 pr-1">
                                      {server.loading ? (
                                          <div className="p-4 text-center text-white/50 text-xs">Yükleniyor...</div>
                                      ) : server.guilds.length === 0 ? (
                                          <div className="p-4 text-center text-white/50 text-xs">Sunucu bulunamadı.</div>
                                      ) : (
                                          server.guilds.map((guild) => {
                                            // Sunucu bilgilerini loglayarak kontrol et
                                            console.log(`Sunucu: ${guild.name}, isSetup: ${guild.isSetup}`);
                                            const displayIcon = guild.iconUrl ?? fetchedIcons[guild.id] ?? (server.data?.id === guild.id ? server.data.iconUrl : null);
                                            return (
                                              <button
                                                key={guild.id}
                                                onClick={() => handleSelectServer(guild)}
                                                disabled={!guild.isSetup}
                                                className={`group w-full p-2 rounded-xl flex items-center gap-3 transition-all ${
                                                  server.data?.id === guild.id
                                                    ? 'bg-[#5865F2] text-white shadow-lg'
                                                    : guild.isSetup
                                                      ? 'hover:bg-white/10 text-white/70 hover:text-white'
                                                      : 'opacity-50 cursor-not-allowed'
                                                }`}
                                              >
                                                {displayIcon ? (
                                                  // eslint-disable-next-line @next/next/no-img-element
                                                  <img src={displayIcon} width={32} height={32} className="rounded-lg object-cover" alt={guild.name} loading="lazy" />
                                                ) : (
                                                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-xs font-bold">
                                                    {guild.name.charAt(0)}
                                                  </div>
                                                )}
                                                <span className="text-sm font-medium truncate flex-1 text-left">{guild.name}</span>
                                                {!guild.isSetup && (
                                                  <span className="ml-2 text-xs text-amber-400 bg-amber-900/40 px-2 py-0.5 rounded-full">Kurulum yapılmamış</span>
                                                )}
                                                {server.data?.id === guild.id && <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>}
                                              </button>
                                            );
                                          })
                                      )}
                                    </div>
                                </div>

                            </div>

                            {/* Footer (Yükle + Çıkış) */}
                            <div className="bg-black/20 p-3 border-t border-white/5 mt-auto flex gap-2">
                                <LoadAccruedButton />
                                <button
                                  onClick={handleLogout}
                                  className="flex-1 flex items-center justify-center gap-2 p-3 rounded-xl bg-red-500/10 hover:bg-red-500 text-xs font-bold text-red-400 hover:text-white transition-all border border-red-500/20 hover:border-transparent group"
                                >
                                  <LuLogOut className="w-4 h-4 group-hover:scale-110 transition-transform" /> 
                                  Hesaptan Çıkış Yap
                                </button>
                            </div>

                        </div>
                    </div>
                </div>
            )}

            {unauthorized ? (
            <DiscordAgreementButton
                href={loginUrl}
                className="rounded-full bg-[#5865F2] hover:bg-[#4752C4] px-6 py-2 text-sm font-bold text-white transition-all shadow-lg hover:shadow-[#5865F2]/40"
                targetBlank={false}
            >
                Giriş Yap
            </DiscordAgreementButton>
            ) : null}

        </div>
      </header>
    </>
  );
}