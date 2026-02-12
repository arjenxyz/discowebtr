"use client";

import { useMemo, useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import MailDetailModal from './MailDetailModal';
import type { MailItem } from '../types';
import { 
  LuMailOpen, LuTrash2, 
  LuRefreshCw, LuSearch, LuInbox,
  LuSettings, LuStar,
  LuTag, LuClock
} from 'react-icons/lu';

// MailDetailModal handled by parent via `onOpenMail` prop (navigate to page)

const stripHtml = (s?: string) => (s ?? '').replace(/<[^>]+>/g, '').replace(/&nbsp;?/g, ' ');

const previewText = (s?: string, max = 100) => {
  const t = stripHtml(s).replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
};

// Gmail-style category configuration
const CATEGORY_CONFIG = {
  announcement: {
    label: 'Duyurular',
    icon: '📢',
    color: '#1a73e8', // Gmail blue
  },
  system: {
    label: 'Sistem',
    icon: '⚙️',
    color: '#ea4335', // Gmail red
  },
  maintenance: {
    label: 'Bakım',
    icon: '🔧',
    color: '#fbbc04', // Gmail yellow
  },
  sponsor: {
    label: 'Sponsorluk',
    icon: '💼',
    color: '#9334e8', // Purple
  },
  update: {
    label: 'Güncellemeler',
    icon: '✨',
    color: '#34a853', // Gmail green
  },
  lottery: {
    label: 'Promosyonlar',
    icon: '🎁',
    color: '#e91e63', // Pink
  },
  reward: {
    label: 'Ödüller',
    icon: '🏆',
    color: '#0f9d58', // Green
  },
  order: {
    label: 'Siparişler',
    icon: '📦',
    color: '#757575', // Gray
  },
} as const;

const FIXED_CATEGORIES = ['announcement', 'system', 'update', 'maintenance', 'reward', 'lottery', 'sponsor', 'order'] as const;

type MailSectionProps = {
  loading: boolean;
  error: string | null;
  items: MailItem[];
  onOpenMail?: (mail: MailItem) => void;
  onBack?: () => void;
};

export default function MailSection({
  loading,
  error,
  items,
  onOpenMail,
  onBack,
}: MailSectionProps) {
  
  const [activeCategory, setActiveCategory] = useState<'all' | string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedMail, setSelectedMail] = useState<MailItem | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const [searchParams, setSearchParams] = useState<URLSearchParams | null>(null);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef<HTMLDivElement | null>(null);
  const [toast, setToast] = useState<{ open: boolean; message: string; type?: 'success' | 'error' }>({ 
    open: false, 
    message: '', 
    type: 'success' 
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem('mailSectionTheme') || localStorage.getItem('uiTheme');
      if (stored === 'dark' || stored === 'light') {
        // initialize local state from storage; ThemeBootstrap applies the body class on first paint
        setTheme(stored as 'dark' | 'light');
      }
    } catch {}
  }, []);

  // Open modal when route contains /dashboard/mail and id search param is present
  useEffect(() => {
    try {
      // next/navigation's useSearchParams can cause a CSR bailout during prerendering.
      // Instead, read the location search on the client when pathname changes.
      if (typeof window !== 'undefined') {
        setSearchParams(new URLSearchParams(window.location.search));
      }
      const id = searchParams?.get('id');
      const path = pathname ?? '';
      if (path.startsWith('/dashboard/mail')) {
        if (id) {
          const found = items.find(i => String(i.id) === String(id));
          if (found) setSelectedMail(found);
        }
      }
    } catch {}
  }, [pathname, /* intentionally include items so opening works */ items, searchParams]);

  // Temporarily set UI theme in component state. Persist only when user clicks "Kaydet".
  const applyTheme = (t: 'light' | 'dark') => {
    setTheme(t);
  };

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettings(false);
      }
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  // Persisted theme is only written when user explicitly saves.

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ open: true, message, type });
    setTimeout(() => setToast({ open: false, message: '', type }), 3500);
  };

  // Counts
  const countsTotal = useMemo(() => {
    return items.reduce<Record<string, number>>((acc, item) => {
      acc.all = (acc.all ?? 0) + 1;
      acc[item.category] = (acc[item.category] ?? 0) + 1;
      return acc;
    }, { all: 0 });
  }, [items]);

  const countsUnread = useMemo(() => {
    return items.reduce<Record<string, number>>((acc, item) => {
      const unread = item.is_read ? 0 : 1;
      acc.all = (acc.all ?? 0) + unread;
      acc[item.category] = (acc[item.category] ?? 0) + unread;
      return acc;
    }, { all: 0 });
  }, [items]);

  const filtered = useMemo(() => {
    // derive visible list then sort by `created_at`
    const base = activeCategory === 'all' ? items.slice() : items.filter((item) => item.category === activeCategory).slice();
    base.sort((a, b) => {
      const ta = new Date(a.created_at).getTime();
      const tb = new Date(b.created_at).getTime();
      return sortOrder === 'desc' ? tb - ta : ta - tb;
    });
    return base;
  }, [items, activeCategory, sortOrder]);

  const toggleSort = () => setSortOrder((s) => (s === 'desc' ? 'asc' : 'desc'));

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays < 7) {
      const days = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
      return days[d.getDay()];
    } else {
      return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const selectAll = () => {
    // Toggle selection for items visible in `filtered` only
    const visibleIds = filtered.map(m => String(m.id));
    const allVisibleSelected = visibleIds.every(id => selectedIds.has(id));
    const newSet = new Set(selectedIds);
    if (allVisibleSelected) {
      // remove visible ids
      for (const id of visibleIds) newSet.delete(id);
    } else {
      // add visible ids
      for (const id of visibleIds) newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');

        /* Design tokens for mail UI - light (default) */
        .mail-list-container {
          font-family: 'Roboto', sans-serif;
          --bg: #ffffff;
          --panel-bg: #f8fafc;
          --muted-bg: #f1f5f9;
          --text: #111827;
          --muted-text: #6b7280;
          --border: #e6e9ee;
          --accent: #2563eb; /* blue-600 */
          --item-hover-shadow: 0 1px 2px rgba(16,24,40,0.06);
          --scroll-track: #f3f4f6;
          --scroll-thumb: #cbd5e1;
        }

        /* Dark theme tokens */
        .mail-list-container.theme-dark {
          --bg: #0b0d12;
          --panel-bg: #08090b;
          --muted-bg: #0f1113;
          --text: #e6eef8;
          --muted-text: #9aa4b2;
          --border: #1f2933;
          --accent: #1e90ff; /* slightly brighter blue */
          --item-hover-shadow: 0 1px 2px rgba(2,6,23,0.6);
          --scroll-track: #050608;
          --scroll-thumb: #202225;
        }

        /* Scrollbar (WebKit) */
        .mail-scrollbar::-webkit-scrollbar { width: 10px; height: 10px; }
        .mail-scrollbar::-webkit-scrollbar-track { background: var(--scroll-track); }
        .mail-scrollbar::-webkit-scrollbar-thumb { background: var(--scroll-thumb); border-radius: 6px; }
        .mail-scrollbar::-webkit-scrollbar-thumb:hover { filter: brightness(0.9); }

        /* Generic mail item hover */
        .mail-item-hover { transition: box-shadow 0.12s ease, background-color 0.12s ease; }
        .mail-item-hover:hover {
          box-shadow: var(--item-hover-shadow);
          z-index: 1;
        }

        /* Panel and divider tones */
        .mail-list-container .border-gray-200 { border-color: var(--border) !important; }
        .mail-list-container .bg-white { background-color: var(--bg) !important; }
        .mail-list-container .bg-gray-50 { background-color: var(--panel-bg) !important; }
        .mail-list-container .text-gray-700 { color: var(--text) !important; }
        .mail-list-container .text-gray-500 { color: var(--muted-text) !important; }

        /* Subtle category badge backgrounds and item accents */
        .mail-list-container .mail-item-hover:not(.bg-blue-50) { }

        /* Focus / active states */
        .mail-list-container .rounded-full[aria-pressed='true'],
        .mail-list-container .bg-blue-50 { background-color: rgba(37,99,235,0.06) !important; }

        /* Accessibility: ensure contrast for interactive icons */
        .mail-list-container svg { color: var(--muted-text); }
        .mail-list-container .text-sm.font-medium, .mail-list-container .font-bold { color: var(--text); }

      `}</style>

      <section className={`mail-list-container ${theme === 'dark' ? 'theme-dark' : 'theme-light'} relative w-full h-screen overflow-hidden rounded-none shadow-none flex`}>
        
        {/* Sidebar */}
        <div className={`w-64 flex flex-col ${theme === 'dark' ? 'bg-[#08090b] border-r border-gray-800' : 'bg-white border-r border-gray-200'}`}>
          {/* Compose Button */}
          <div className="p-4">
            {onBack ? (
              <button onClick={onBack} className={`w-full flex items-center gap-3 px-6 py-3 ${theme === 'dark' ? 'bg-[#0b0d12] hover:bg-[#0e1114] border border-gray-800' : 'bg-white hover:bg-gray-50 border border-gray-300'} rounded-full shadow-sm transition-all`}>
                <svg className={`w-5 h-5 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className={`font-medium text-sm ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>Geri Dön</span>
              </button>
            ) : (
              <button onClick={() => { setActiveCategory('all'); router.push('/dashboard/mail'); }} className={`w-full flex items-center gap-3 px-6 py-3 ${theme === 'dark' ? 'bg-[#0b0d12] hover:bg-[#0e1114] border border-gray-800' : 'bg-white hover:bg-gray-50 border border-gray-300'} rounded-full shadow-sm transition-all`}>
                <svg className={`w-5 h-5 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                </svg>
                <span className={`font-medium text-sm ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>Yeni Mesaj</span>
              </button>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-2">
            {/* Inbox */}
            <button
              onClick={() => setActiveCategory('all')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-r-full mb-1 transition-all ${
                activeCategory === 'all'
                  ? (theme === 'dark' ? 'bg-red-900/30 text-red-400 font-bold' : 'bg-red-50 text-red-600 font-bold')
                  : (theme === 'dark' ? 'text-gray-300 hover:bg-gray-900' : 'text-gray-700 hover:bg-gray-100')
              }`}
            >
              <div className="flex items-center gap-3">
                <LuInbox className={`w-5 h-5 ${activeCategory === 'all' ? (theme === 'dark' ? 'text-red-400' : 'text-red-600') : (theme === 'dark' ? 'text-gray-300' : 'text-gray-600')}`} />
                <span className={`text-sm ${theme === 'dark' ? 'text-gray-200' : ''}`}>Gelen Kutusu</span>
              </div>
              {countsUnread.all > 0 && (
                <span className="text-xs font-bold">{countsUnread.all}</span>
              )}
            </button>

            {/* Categories */}
            {FIXED_CATEGORIES.map((cat) => {
              const config = CATEGORY_CONFIG[cat];
              const isActive = activeCategory === cat;
              const unreadCount = countsUnread[cat] ?? 0;

              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-r-full mb-1 transition-all ${
                    isActive
                      ? (theme === 'dark' ? 'bg-blue-900/20 text-blue-400 font-medium' : 'bg-blue-50 text-blue-600 font-medium')
                      : (theme === 'dark' ? 'text-gray-300 hover:bg-gray-900' : 'text-gray-700 hover:bg-gray-100')
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{config.icon}</span>
                    <span className="text-sm">{config.label}</span>
                  </div>
                  {unreadCount > 0 && (
                    <span className="text-xs font-bold">{unreadCount}</span>
                  )}
                </button>
              );
            })}

            {/* Divider */}
            <div className={`h-px my-2 ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'}`} />

            {/* Additional Items */}
            <button className={`w-full flex items-center gap-3 px-3 py-2 rounded-r-full ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-900' : 'text-gray-700 hover:bg-gray-100'} transition-all mb-1`}>
              <LuStar className={`w-5 h-5 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`} />
              <span className={`text-sm ${theme === 'dark' ? 'text-gray-200' : ''}`}>Yıldızlı</span>
            </button>

            <button className={`w-full flex items-center gap-3 px-3 py-2 rounded-r-full ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-900' : 'text-gray-700 hover:bg-gray-100'} transition-all`}>
              <LuClock className={`w-5 h-5 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`} />
              <span className={`text-sm ${theme === 'dark' ? 'text-gray-200' : ''}`}>Ertelenmiş</span>
            </button>
          </nav>

          {/* Storage Info */}
          <div className={`p-4 border-t ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}>
            <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-2`}>
              {countsTotal.all} mesajdan {countsUnread.all} okunmadı
            </div>
            <div className={`w-full h-1 ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'} rounded-full overflow-hidden`}>
              <div 
                className="h-full bg-blue-600 rounded-full transition-all"
                style={{ width: `${Math.min((countsUnread.all / countsTotal.all) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className={`flex-1 flex flex-col ${theme === 'dark' ? 'bg-[#0b0d12]' : 'bg-white'}`}>
          
          {/* Search Bar */}
          <div className={`px-6 py-3 border-b ${theme === 'dark' ? 'border-gray-800 bg-transparent' : 'border-gray-200 bg-gray-50'}`}>
            <div className="flex items-center gap-4">
              <div className={`flex-1 flex items-center gap-2 px-4 py-2 ${theme === 'dark' ? 'bg-[#0b0d12] border border-gray-800' : 'bg-white border border-gray-300'} rounded-lg hover:shadow-sm transition-shadow`}>
                <LuSearch className={`w-5 h-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                <input
                  type="text"
                  placeholder="Mesajlarda ara"
                  className={`flex-1 bg-transparent outline-none text-sm ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}
                />
              </div>
              <div className="relative" ref={settingsRef}>
                <button onClick={() => setShowSettings(s => !s)} className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-gray-900' : 'hover:bg-gray-100'}`}>
                  <LuSettings className={`w-5 h-5 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`} />
                </button>
                {showSettings && (
                  <div className={`absolute right-0 mt-2 w-44 rounded-lg shadow-lg border ${theme === 'dark' ? 'bg-[#0b0d12] border-gray-800 text-gray-200' : 'bg-white border-gray-200 text-gray-700'}`}>
                    <div className="px-3 py-2 text-sm font-semibold">Ayarlar</div>
                    <div className="px-3 py-2 border-t">
                      <label className="flex items-center gap-2">
                        <input type="radio" checked={theme === 'light'} onChange={() => applyTheme('light')} />
                        <span className="text-sm">Açık Tema</span>
                      </label>
                      <label className="flex items-center gap-2 mt-2">
                        <input type="radio" checked={theme === 'dark'} onChange={() => applyTheme('dark')} />
                        <span className="text-sm">Koyu Tema</span>
                      </label>
                      <div className="flex items-center gap-2 mt-3">
                        <button
                          onClick={() => {
                            try {
                              // persist current selection and apply immediately
                              localStorage.setItem('mailSectionTheme', theme);
                              localStorage.setItem('uiTheme', theme);
                            } catch {}
                            try { document.body.classList.toggle('mail-theme-dark', theme === 'dark'); } catch {}
                            showToast('Tema kaydedildi', 'success');
                            setShowSettings(false);
                          }}
                          className="px-3 py-1 rounded bg-blue-600 text-white text-sm hover:opacity-90"
                        >
                          Kaydet
                        </button>
                        
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Toolbar */}
          <div className={`px-4 py-2 border-b ${theme === 'dark' ? 'border-gray-800 bg-transparent' : 'border-gray-200 bg-white'} flex items-center justify-between`}>
            <div className="flex items-center gap-1">
              {/* Select All Checkbox */}
              <button
                onClick={selectAll}
                className="p-2 rounded hover:bg-gray-100 transition-colors"
              >
                <div className={`w-5 h-5 border-2 rounded flex items-center justify-center ${
                  selectedIds.size > 0 ? 'bg-blue-600 border-blue-600' : 'border-gray-400'
                }`}>
                  {selectedIds.size > 0 && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </button>

              <button
                onClick={async () => {
                  try {
                    await fetch('/api/mail', { method: 'POST' });
                    showToast('Yenilendi', 'success');
                    window.dispatchEvent(new CustomEvent('mail:refresh'));
                  } catch {}
                }}
                className={`p-2 rounded transition-colors ${theme === 'dark' ? 'hover:bg-gray-900' : 'hover:bg-gray-100'}`}
                title="Yenile"
              >
                <LuRefreshCw className={`w-5 h-5 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`} />
              </button>

              {selectedIds.size > 0 && (
                <>
                  <div className="w-px h-6 bg-gray-300 mx-1" />
                  
                  <button
                    onClick={async () => {
                      const ids = Array.from(selectedIds);
                      try {
                        await fetch('/api/mail', { 
                          method: 'DELETE', 
                          headers: { 'Content-Type': 'application/json' }, 
                          body: JSON.stringify({ ids }) 
                        });
                        showToast(`${ids.length} mesaj silindi`, 'success');
                        setSelectedIds(new Set());
                        window.dispatchEvent(new CustomEvent('mail:refresh'));
                      } catch {
                        showToast('Silme hatası', 'error');
                      }
                    }}
                    className={`p-2 rounded transition-colors ${theme === 'dark' ? 'hover:bg-gray-900' : 'hover:bg-gray-100'}`}
                    title="Sil"
                  >
                    <LuTrash2 className={`w-5 h-5 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`} />
                  </button>

                  <button
                    onClick={async () => {
                      const ids = Array.from(selectedIds);
                      try {
                        await fetch('/api/mail', { 
                          method: 'POST', 
                          headers: { 'Content-Type': 'application/json' }, 
                          body: JSON.stringify({ ids }) 
                        });
                        showToast('Okundu işaretlendi', 'success');
                        setSelectedIds(new Set());
                        window.dispatchEvent(new CustomEvent('mail:refresh'));
                      } catch {
                        showToast('İşlem hatası', 'error');
                      }
                    }}
                    className={`p-2 rounded transition-colors ${theme === 'dark' ? 'hover:bg-gray-900' : 'hover:bg-gray-100'}`}
                    title="Okundu işaretle"
                  >
                    <LuMailOpen className={`w-5 h-5 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`} />
                  </button>

                  <button className={`p-2 rounded transition-colors ${theme === 'dark' ? 'hover:bg-gray-900' : 'hover:bg-gray-100'}`} title="Taşı">
                    <LuTag className={`w-5 h-5 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`} />
                  </button>
                </>
              )}
            </div>

            <div className={`flex items-center gap-2 text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              <span>{filtered.length > 0 ? '1' : '0'}–{filtered.length} / {filtered.length}</span>
              <div className="flex items-center gap-1">
                <button onClick={toggleSort} title="Sırala" className="p-1 rounded hover:bg-gray-100 transition-colors">
                  <span className="text-xs">{sortOrder === 'desc' ? '↓' : '↑'}</span>
                </button>
                <button className="p-1 rounded hover:bg-gray-100 transition-colors">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                <button className="p-1 rounded hover:bg-gray-100 transition-colors">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Mail List */}
          <div className="flex-1 overflow-y-auto mail-scrollbar">
            {loading && (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <LuRefreshCw className="w-8 h-8 animate-spin mb-3" />
                <span className="text-sm">Yükleniyor...</span>
              </div>
            )}

            {!loading && error && (
              <div className="m-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {!loading && !error && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <LuInbox className="w-16 h-16 mb-4 text-gray-300" />
                <p className="text-lg font-medium text-gray-700">Gelen kutunuz boş</p>
                <p className="text-sm text-gray-500 mt-1">Bu kategoride mesaj yok</p>
              </div>
            )}

            {!loading && !error && filtered.map((mail) => {
              const config = CATEGORY_CONFIG[mail.category as keyof typeof CATEGORY_CONFIG];
              const isSelected = selectedIds.has(String(mail.id));

              return (
                <div
                  key={mail.id}
                  className={`mail-item-hover border-b ${theme === 'dark' ? 'border-gray-800 cursor-pointer' : 'border-gray-200 cursor-pointer'} ${
                    mail.is_read ? (theme === 'dark' ? 'bg-transparent' : 'bg-white') : (theme === 'dark' ? 'bg-blue-900/20' : 'bg-blue-50/30')
                  } ${isSelected ? (theme === 'dark' ? 'bg-blue-800/30' : 'bg-blue-50') : ''}`}
                  onClick={(e) => {
                      if ((e.target as HTMLElement).closest('.checkbox-cell')) {
                        return;
                      }
                      // open modal and push route so `/dashboard/mail?id=...` is navigable
                      setSelectedMail(mail);
                      try { router.push(`/dashboard/mail?id=${encodeURIComponent(String(mail.id))}`); } catch { }
                    }}
                >
                  <div className="flex items-center gap-4 px-4 py-3">
                    {/* Checkbox */}
                    <div className="checkbox-cell flex-shrink-0">
                      <button
                        onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            toggleSelect(String(mail.id));
                          }}
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                      >
                        <div className={`w-5 h-5 border-2 rounded flex items-center justify-center ${
                          isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-400'
                        }`}>
                          {isSelected && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </button>
                    </div>

                    {/* Star */}
                    <div className="flex-shrink-0">
                      <button className="p-1 hover:bg-gray-200 rounded transition-colors">
                        <LuStar
                          className={`w-5 h-5 ${mail.is_starred ? 'text-yellow-400' : 'text-gray-400'} hover:text-yellow-400`}
                          onClick={async (e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            try {
                              if (mail.is_starred) {
                                await fetch('/api/mail/star', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: String(mail.id) }) });
                              } else {
                                await fetch('/api/mail/star', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: String(mail.id) }) });
                              }
                              // optimistic UI update: refresh list
                              window.dispatchEvent(new CustomEvent('mail:refresh'));
                            } catch {
                              showToast('Yıldız işlemi başarısız', 'error');
                            }
                          }}
                        />
                      </button>
                    </div>

                    {/* Category Badge */}
                    <div className="flex-shrink-0">
                      <div 
                        className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium"
                        style={{ 
                          backgroundColor: theme === 'dark' ? `${config?.color}33` : `${config?.color}15`,
                          color: config?.color 
                        }}
                      >
                        <span>{config?.icon}</span>
                        <span className="hidden sm:inline">{config?.label}</span>
                      </div>
                    </div>

                    {/* Subject & Preview */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className={`text-sm truncate ${mail.is_read ? `font-normal ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}` : `font-bold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}`}>
                          {mail.title}
                        </span>
                        <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} truncate flex-shrink-0`}>
                          — {previewText(mail.body, 80)}
                        </span>
                      </div>
                    </div>

                    {/* Date */}
                    <div className={`flex-shrink-0 text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {formatDate(mail.created_at)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detail modal handled by parent via `onOpenMail` */}

        </div>

        {/* Toast */}
        {toast.open && (
          <div 
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-lg text-white text-sm font-medium ${
              toast.type === 'success' ? 'bg-gray-800' : 'bg-red-600'
            }`}
          >
            {toast.message}
          </div>
        )}
        {/* Local mail detail modal */}
        {selectedMail && (
          <MailDetailModal mail={selectedMail} onClose={() => {
            setSelectedMail(null);
            try { router.push('/dashboard/mail'); } catch {}
          }} />
        )}
      </section>
    </>
  );
}