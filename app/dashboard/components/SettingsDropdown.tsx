'use client';

// Link importunu sildik veya kalsın istiyorsan dursun ama aşağıda kullanmayacağız
import Image from 'next/image';
import { LuChevronDown, LuGift, LuLogOut, LuSend, LuSettings, LuTag } from 'react-icons/lu';
import type { RefObject } from 'react';

type SettingsDropdownProps = {
  open: boolean;
  onToggle: () => void;
  onOpenSettings: () => void;
  onOpenTransfer: () => void;
  logoutHref: string; // Bu prop artık teknik olarak gereksiz ama type hatası vermemesi için kalsın
  menuRef: RefObject<HTMLDivElement | null>;
  profile?: {
    name: string;
    username: string;
    avatarUrl: string | null;
  } | null;
  profileLoading?: boolean;
};

export default function SettingsDropdown({
  open,
  onToggle,
  onOpenSettings,
  onOpenTransfer,
  menuRef,
  profile,
  profileLoading,
}: SettingsDropdownProps) {
  const displayName = profile?.name ?? 'Üye';
  const username = profile?.username ?? 'guest';

  // YENİ EKLENEN FONKSİYON
  const handleLogout = async () => {
    try {
      // API'ye POST isteği atıyoruz
      await fetch('/api/auth/logout', { method: 'POST' });
      // İşlem bitince ana sayfaya zorla yönlendiriyoruz (Cache temizlensin diye)
      window.location.href = '/';
    } catch {
      // Hata olsa bile kullanıcıyı dışarı atalım
      window.location.href = '/';
    }
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={onToggle}
        className={`flex items-center gap-2 rounded-full border border-white/5 bg-white/5 px-2.5 py-1.5 text-white/70 transition hover:border-white/20 hover:text-white ${
          open ? 'bg-white/10 text-white' : ''
        }`}
        aria-label="Hesap"
      >
        <div className="h-7 w-7 overflow-hidden rounded-full border border-white/5 bg-white/10">
          {profile?.avatarUrl ? (
            <Image
              src={profile.avatarUrl}
              alt="avatar"
              width={28}
              height={28}
              unoptimized
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-white/50">
              {profileLoading ? '…' : '?'}
            </div>
          )}
        </div>
        <div className="hidden text-left md:block">
          <span className="text-sm font-semibold text-white">{displayName}</span>
        </div>
        <LuChevronDown className={`h-4 w-4 text-white/50 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-3 w-64 rounded-2xl border border-white/10 bg-[#0f1116] p-4 shadow-2xl">
          <p className="text-sm font-semibold text-white">Hesap</p>
          <p className="mt-1 text-xs text-white/50">{displayName} · @{username}</p>
          <div className="mt-3 space-y-2">
            <button
              type="button"
              onClick={onOpenSettings}
              className="flex w-full items-center gap-2 rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-left text-xs text-white/70 transition hover:border-white/15 hover:text-white"
            >
              <LuGift className="h-3.5 w-3.5 text-indigo-300" />
              Promosyon
            </button>
            <button
              type="button"
              onClick={onOpenSettings}
              className="flex w-full items-center gap-2 rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-left text-xs text-white/70 transition hover:border-white/15 hover:text-white"
            >
              <LuTag className="h-3.5 w-3.5 text-indigo-300" />
              İndirim kodu
            </button>
            <button
              type="button"
              onClick={onOpenTransfer}
              className="flex w-full items-center gap-2 rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-left text-xs text-white/70 transition hover:border-white/15 hover:text-white"
            >
              <LuSend className="h-3.5 w-3.5 text-indigo-300" />
              Papel gönder
            </button>
            <button
              type="button"
              onClick={onOpenSettings}
              className="flex w-full items-center gap-2 rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-left text-xs text-white/70 transition hover:border-white/15 hover:text-white"
            >
              <LuSettings className="h-3.5 w-3.5 text-indigo-300" />
              Ayarlar
            </button>
            
            {/* DEĞİŞİKLİK BURADA: Link yerine button kullanıldı */}
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-left text-xs text-white/70 transition hover:border-white/15 hover:text-white"
            >
              <LuLogOut className="h-3.5 w-3.5 text-rose-300" />
              Çıkış yap
            </button>

          </div>
        </div>
      )}
    </div>
  );
}