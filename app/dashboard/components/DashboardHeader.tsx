'use client';

import Link from 'next/link';
import { LuClock, LuHouse, LuReceipt, LuShield, LuStore } from 'react-icons/lu';
import Image from 'next/image';
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
  notifications: {
    open: boolean;
    unreadCount: number;
    loading: boolean;
    items: Notification[];
    onToggle: () => void;
    onOpenModal: () => void;
    onOpenNotification: (item: Notification) => void;
    menuRef: RefObject<HTMLDivElement | null>;
  };
  settings: {
    open: boolean;
    onToggle: () => void;
    onOpenSettings: () => void;
    onOpenTransfer: () => void;
    logoutHref: string;
    menuRef: RefObject<HTMLDivElement | null>;
  };
};

export default function DashboardHeader({
  unauthorized,
  walletLoading,
  walletBalance,
  loginUrl,
  navigation,
  profile,
  profileLoading,
  notifications,
  settings,
}: DashboardHeaderProps) {
  const navItems: Array<{ key: Section; label: string; requiresAuth?: boolean; icon: JSX.Element }> = [
    { key: 'overview', label: 'Genel', icon: <LuHouse className="h-4 w-4" /> },
    { key: 'store', label: 'Mağaza', icon: <LuStore className="h-4 w-4" /> },
    { key: 'transactions', label: 'İşlemler', requiresAuth: true, icon: <LuReceipt className="h-4 w-4" /> },
    { key: 'tracking', label: 'Takip', requiresAuth: true, icon: <LuClock className="h-4 w-4" /> },
  ];

  return (
    <header className="fixed inset-x-0 top-0 z-30 flex h-16 items-center gap-4 border-b border-white/5 bg-[#0b0d12]/90 px-6 backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-indigo-200">
          <LuShield className="h-4 w-4" />
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm font-semibold">Üye Paneli</p>
          <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-emerald-200">
            Aktif
          </span>
        </div>
      </div>
      <nav className="flex flex-1 items-center justify-center gap-2 overflow-x-auto whitespace-nowrap">
        {navItems
          .filter((item) => !item.requiresAuth || !unauthorized)
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
            onOpenModal={notifications.onOpenModal}
            onOpenNotification={notifications.onOpenNotification}
            menuRef={notifications.menuRef}
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
            logoutHref={settings.logoutHref}
            menuRef={settings.menuRef}
            profile={profile}
            profileLoading={profileLoading}
          />
        )}
        {unauthorized ? (
          <Link
            href={loginUrl}
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 transition hover:border-white/30 hover:text-white"
          >
            Discord ile Giriş
          </Link>
        ) : null}
      </div>
    </header>
  );
}
