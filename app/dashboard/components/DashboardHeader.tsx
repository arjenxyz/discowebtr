'use client';

import Link from 'next/link';
import { LuTriangleAlert, LuClock, LuHouse, LuMail, LuReceipt, LuShield, LuStore, LuCode } from 'react-icons/lu';
import Image from 'next/image';
import DiscordAgreementButton from '@/components/DiscordAgreementButton';
import { useState, useRef, useEffect } from 'react';
import type { Notification } from '../types';
import type { Section } from '../types';
import NotificationsDropdown from './NotificationsDropdown';
import SettingsDropdown from './SettingsDropdown';
import type { RefObject, JSX } from 'react';


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
    menuRef: RefObject<HTMLDivElement | null>;
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
};

export default function DashboardHeader({
  unauthorized,
  walletLoading,
  walletBalance,
  loginUrl,
  isDeveloper,
  navigation,
  profile,
  profileLoading,
  server,
  notifications,
  renderNotificationBody,
  settings,
  maintenance,
}: DashboardHeaderProps) {
  const [serverDropdownOpen, setServerDropdownOpen] = useState(false);
  const serverMenuRef = useRef<HTMLDivElement | null>(null);
  const showMaintenance = Boolean(maintenance?.showIndicator && maintenance?.siteActive);

  useEffect(() => {
    if (!serverDropdownOpen) {
      return undefined;
    }

    const handleClick = (event: MouseEvent) => {
      if (!serverMenuRef.current) {
        return;
      }
      if (!serverMenuRef.current.contains(event.target as Node)) {
        setServerDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
    };
  }, [serverDropdownOpen]);
  const navItems: Array<{ key: Section; label: string; requiresAuth?: boolean; requiresDeveloper?: boolean; icon: JSX.Element }> = [
    { key: 'overview', label: 'Genel', icon: <LuHouse className="h-4 w-4" /> },
    { key: 'store', label: 'Mağaza', icon: <LuStore className="h-4 w-4" /> },
    { key: 'transactions', label: 'İşlemler', requiresAuth: true, icon: <LuReceipt className="h-4 w-4" /> },
    { key: 'tracking', label: 'Takip', requiresAuth: true, icon: <LuClock className="h-4 w-4" /> },
    { key: 'mail', label: 'Mail', requiresAuth: true, icon: <LuMail className="h-4 w-4" /> },
  ];

  return (
    <header className="fixed inset-x-0 top-0 z-30 flex h-16 items-center gap-4 border-b border-white/5 bg-[#0b0d12]/90 px-6 backdrop-blur">
      <div className="relative" ref={serverMenuRef}>
        <button
          onClick={() => setServerDropdownOpen((prev) => !prev)}
          className="flex items-center gap-3 hover:bg-white/5 rounded-xl px-3 py-2 transition-colors"
        >
          {server.loading ? (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
            </div>
          ) : server.data?.iconUrl ? (
            <Image
              src={server.data.iconUrl}
              alt={server.data.name}
              width={40}
              height={40}
              className="h-10 w-10 rounded-xl object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-indigo-200">
              <LuShield className="h-4 w-4" />
            </div>
          )}
          <div className="flex flex-col items-start">
            {showMaintenance ? (
              <div className="flex items-center gap-2 text-sm font-semibold text-amber-200">
                <LuTriangleAlert className="h-4 w-4 text-amber-300" />
                Bakımda
              </div>
            ) : (
              <p className="text-sm font-semibold text-white">{server.data?.name || 'Sunucu Seç'}</p>
            )}
            <p className="text-xs text-white/50">Tıklayarak değiştir</p>
          </div>
        </button>

        {serverDropdownOpen && (
          <div className="absolute top-full mt-2 w-72 rounded-lg border border-gray-600 bg-gray-800 shadow-2xl">
            <div className="p-2">
              {server.guilds.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-700 mb-3">
                  <LuShield className="h-6 w-6 text-gray-500" />
                </div>
                <p className="text-sm font-medium text-gray-400 mb-1">Sunucu bulunamadı</p>
                <p className="text-xs text-gray-500 text-center">Botun bulunduğu sunucular burada listelenecek</p>
              </div>
            ) : (
              <div className="space-y-1">
                {server.guilds.map((guild) => (
                  <button
                    key={guild.id}
                    onClick={() => {
                      if (guild.isSetup) {
                        server.onSelectServer(guild.id);
                        setServerDropdownOpen(false);
                      }
                    }}
                    disabled={!guild.isSetup}
                    className={`group w-full p-3 text-left rounded-md transition-all duration-150 ${
                      server.data?.id === guild.id
                        ? 'bg-indigo-600 text-white shadow-md border border-indigo-500'
                        : guild.isSetup
                        ? 'hover:bg-slate-700/60 text-gray-200 hover:text-white cursor-pointer border border-transparent hover:border-slate-600'
                        : 'text-gray-500 cursor-not-allowed opacity-60 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {guild.iconUrl ? (
                        <Image
                          src={guild.iconUrl}
                          alt={guild.name}
                          width={32}
                          height={32}
                          className="h-8 w-8 rounded-md object-cover ring-1 ring-gray-700"
                        />
                      ) : (
                        <div className={`flex h-8 w-8 items-center justify-center rounded-md ring-1 ring-gray-600 ${
                          server.data?.id === guild.id
                            ? 'bg-indigo-500/20'
                            : guild.isSetup
                            ? 'bg-gray-700 group-hover:bg-gray-600'
                            : 'bg-gray-800'
                        }`}>
                          <LuShield className={`h-4 w-4 ${
                            server.data?.id === guild.id
                              ? 'text-indigo-200'
                              : guild.isSetup
                              ? 'text-gray-400 group-hover:text-white'
                              : 'text-gray-600'
                          }`} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`text-sm font-medium truncate ${
                            server.data?.id === guild.id
                              ? 'text-white'
                              : guild.isSetup
                              ? 'text-gray-200 group-hover:text-white'
                              : 'text-gray-500'
                          }`}>
                            {guild.name}
                          </p>
                          <div className="flex items-center gap-2 ml-2">
                            {guild.isAdmin && (
                              <span className={`px-1.5 py-0.5 text-xs rounded ${
                                server.data?.id === guild.id
                                  ? 'bg-white/20 text-white'
                                  : 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50'
                              }`}>
                                Admin
                              </span>
                            )}
                            {server.data?.id === guild.id && (
                              <div className="flex h-4 w-4 items-center justify-center rounded-full bg-white/30">
                                <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                          </div>
                        </div>
                        {!guild.isSetup && (
                          <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            Kurulmamış
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            </div>
          </div>
        )}
      </div>
      <nav className="hidden flex-1 items-center justify-center gap-2 overflow-x-auto whitespace-nowrap md:flex">
        {navItems
          .filter((item) => (!item.requiresAuth || !unauthorized) && (!item.requiresDeveloper || isDeveloper))
          .map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => navigation.onNavigate(item.key)}
              className={`group inline-flex items-center gap-2 rounded-2xl border px-3.5 py-2 text-xs font-medium transition ${
                navigation.activeSection === item.key
                  ? 'border-white/20 bg-white/10 text-white'
                  : 'border-white/10 bg-white/5 text-white/70 hover:border-white/25 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className="text-white/80 group-hover:text-white">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
      </nav>
      <div className="flex items-center gap-3">
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
        {!unauthorized && (
          <div className="flex items-center rounded-xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 px-3 py-1.5 shadow-sm gap-2 min-w-[120px]">
            <Image src="/papel.gif" alt="Papel" width={22} height={22} className="h-5 w-5" />
            <div className="flex flex-col justify-center">
              <span className="text-base font-semibold text-white flex items-baseline gap-1">
                {walletLoading ? 'Yükleniyor...' : walletBalance.toFixed(2)}
                <span className="text-[11px] font-medium text-white/60">papel</span>
              </span>
            </div>
          </div>
        )}
        {!unauthorized && (
          <SettingsDropdown
            open={settings.open}
            onToggle={settings.onToggle}
            onOpenSettings={settings.onOpenSettings}
            onOpenTransfer={settings.onOpenTransfer}
            onOpenPromotions={settings.onOpenPromotions}
            onOpenDiscounts={settings.onOpenDiscounts}
            logoutHref={settings.logoutHref}
            menuRef={settings.menuRef}
            profile={profile}
            profileLoading={profileLoading}
          />
        )}
        {unauthorized ? (
          <DiscordAgreementButton
            href={loginUrl}
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 transition hover:border-white/30 hover:text-white"
            targetBlank={false}
          >
            Discord ile Giriş
          </DiscordAgreementButton>
        ) : null}
      </div>
    </header>
  );
}
