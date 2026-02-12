'use client';

import Image from 'next/image';
import type { MailItem } from '../types';
import { useEffect, useState, useRef } from 'react';
import { 
  LuReply,
  LuReplyAll,
  LuForward,
  LuArchive,
  LuTrash2,
  LuMoveVertical,
  LuStar,
  LuPrinter,
  LuDownload,
  LuChevronLeft,
  LuClock,
  LuShield
} from 'react-icons/lu';

// Category to sender mapping
const SENDER_CONFIG = {
  announcement: {
    name: 'Sistem Duyuruları',
    email: 'announcements@system.local',
    avatar: '🔔',
    verified: true
  },
  system: {
    name: 'Sistem Yöneticisi',
    email: 'system@noreply.local',
    avatar: '⚙️',
    // Optional URL to a system avatar image in `public/` (e.g. /system-avatar.svg)
    avatarUrl: '/gif/from.gif',
    verified: true
  },
  maintenance: {
    name: 'Bakım Ekibi',
    email: 'maintenance@system.local',
    avatar: '🔧',
    verified: true
  },
  sponsor: {
    name: 'İş Ortaklıkları',
    email: 'partnerships@system.local',
    avatar: '💼',
    verified: false
  },
  update: {
    name: 'Ürün Güncellemeleri',
    email: 'updates@system.local',
    avatar: '✨',
    verified: true
  },
  lottery: {
    name: 'Kampanya Yönetimi',
    email: 'campaigns@system.local',
    avatar: '🎉',
    verified: false
  },
  reward: {
    name: 'Ödül Merkezi',
    email: 'rewards@system.local',
    avatar: '🎁',
    verified: true
  },
  order: {
    name: 'Sipariş Yönetimi',
    email: 'orders@system.local',
    avatar: '📦',
    verified: true
  },
} as const;

type MailDetailModalProps = {
  mail: MailItem | null;
  onClose: () => void;
};

const isVideoUrl = (url: string) => {
  const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];
  return videoExtensions.some(ext => url.toLowerCase().includes(ext));
};

export default function MailDetailModal({ mail, onClose }: MailDetailModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [starred, setStarred] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  const handleClickOutside = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  useEffect(() => {
    if (mail && !mail.is_read) {
      void (async () => {
        try { 
          await fetch('/api/mail', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ id: mail.id }) 
          }); 
        } catch {}
        try { 
          window.dispatchEvent(new CustomEvent('mail:refresh')); 
        } catch {}
      })();
    }
  }, [mail]);
  // Recipient hooks must be declared before any early return
  const [recipient, setRecipient] = useState<{ id: string; username: string; avatar: string | null } | null>(null);

  useEffect(() => {
    let mounted = true;
    if (typeof mail !== 'undefined' && mail?.user_id) {
      void (async () => {
        try {
          const res = await fetch(`/api/discord/user/${mail.user_id}`);
          if (!mounted) return;
          if (res.ok) {
            const data = await res.json();
            setRecipient({ id: data.id, username: data.username, avatar: data.avatar ?? null });
          }
        } catch {
          // ignore
        }
      })();
    } else {
      // schedule clearing the recipient asynchronously to avoid synchronous setState inside effect
      try {
        queueMicrotask(() => { if (mounted) setRecipient(null); });
      } catch {
        setTimeout(() => { if (mounted) setRecipient(null); }, 0);
      }
    }
    return () => { mounted = false; };
  }, [mail?.user_id, mail]);

  if (!mail) return null;

  const sender = SENDER_CONFIG[mail.category as keyof typeof SENDER_CONFIG] || SENDER_CONFIG.order;
  // avatarUrl may be missing from some sender entries; access safely with proper typing
  type SenderType = typeof SENDER_CONFIG[keyof typeof SENDER_CONFIG];
  const senderTyped = sender as SenderType;
  const avatarUrl = (senderTyped as { avatarUrl?: string }).avatarUrl;

  const renderEmailBody = (body: string, category: string) => {
    if (!body) return null;

    // Parse HTML safely in the client and convert to themed blocks.
    const parser = typeof window !== 'undefined' ? new DOMParser() : null;
    const doc = parser ? parser.parseFromString(body, 'text/html') : null;

    // Helper to extract plain text
    const textContent = (el: Element | null) => (el ? el.textContent || '' : '');

    // Receipt-style rendering for order/reward
    if (category === 'order' || category === 'reward') {
      // Try to extract a table of line items if present
      const table = doc ? doc.querySelector('table') : null;
      const items: Array<{ label: string; qty?: string; price?: number }> = [];

      if (table) {
        const rows = Array.from(table.querySelectorAll('tr'));
        rows.forEach((tr) => {
          const cells = Array.from(tr.querySelectorAll('th,td')).map(c => (c.textContent || '').trim());
          if (cells.length >= 2) {
            const label = cells.slice(0, -1).join(' – ');
            const rawPrice = cells[cells.length - 1].replace(/[^0-9.,-]/g, '').replace(',', '.');
            const price = Number(rawPrice) || 0;
            items.push({ label, price });
          }
        });
      } else {
        // Fallback: split plain text lines that look like `Item — 12.34`
        const lines = (doc ? doc.body.textContent || '' : body).split('\n').map(l => l.trim()).filter(Boolean);
        lines.forEach(line => {
          const m = line.match(/(.+?)\s+[–-]\s*([0-9,.]+)/);
          if (m) {
            items.push({ label: m[1].trim(), price: Number(m[2].replace(',', '.')) || 0 });
          }
        });
      }

      const total = items.reduce((s, it) => s + (it.price || 0), 0);

      return (
        <div className="receipt-card bg-white/5 border border-white/5 rounded-xl p-6 mt-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm text-zinc-300">Dijital Makbuz</div>
              <div className="text-lg font-semibold text-white">{mail.title}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-zinc-400">Tarih</div>
              <div className="text-sm text-zinc-300">{new Date(mail.created_at).toLocaleString('tr-TR')}</div>
            </div>
          </div>

          <div className="grid gap-3">
            {items.map((it, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="text-sm text-zinc-300 truncate">{it.label}</div>
                <div className="text-sm text-zinc-300 font-mono">{it.price ? it.price.toFixed(2) : '-'}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
            <div className="text-sm text-zinc-400">Toplam</div>
            <div className="text-2xl font-extrabold text-white" style={{ textShadow: '0 4px 18px rgba(99,102,241,0.12)' }}>{total.toFixed(2)} ₺</div>
          </div>
        </div>
      );
    }

    // System alert rendering
    if (category === 'system' || category === 'maintenance') {
      // Render raw HTML for system/maintenance mails without extra boxed UI
      return (
        <div className="mt-2 text-zinc-300 leading-relaxed">
          <div dangerouslySetInnerHTML={{ __html: body }} />
          {doc && doc.querySelector('pre') && (
            <pre className="mt-3 p-3 rounded-md font-mono text-xs text-zinc-300 overflow-auto">{textContent(doc.querySelector('pre'))}</pre>
          )}
        </div>
      );
    }

    // General HTML: render inside a themed container and style common tags
    // Render raw HTML without boxed/card UI so it appears as plain document content.
    return (
      <div className="mt-2 text-zinc-300 leading-relaxed">
        <div dangerouslySetInnerHTML={{ __html: body }} />
      </div>
    );
  };

  const formatFullDate = (date: string) => {
    const d = new Date(date);
    const days = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
    const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
    
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}, ${d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const getShortDate = (date: string) => {
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

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Roboto:wght@400;500;700&display=swap');
        
        .email-modal {
          font-family: 'Roboto', sans-serif;
        }

        .email-modal-fade-in {
          animation: emailFadeIn 0.2s ease-out;
        }

        @keyframes emailFadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .email-scrollbar::-webkit-scrollbar {
          width: 8px;
        }

        .email-scrollbar::-webkit-scrollbar-track {
          background: #f1f3f4;
        }

        .email-scrollbar::-webkit-scrollbar-thumb {
          background: #dadce0;
          border-radius: 4px;
        }

        .email-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #bdc1c6;
        }

        .email-action-btn {
          transition: all 0.15s ease;
        }

        .email-action-btn:hover {
          background-color: #f1f3f4;
        }

        .email-action-btn:active {
          transform: scale(0.95);
        }

        /* Force light-mode visuals inside the modal regardless of body/theme */
        .email-modal {
          color: #111827 !important;
        }

        .email-modal .bg-white { background-color: #ffffff !important; }
        .email-modal .bg-gray-50 { background-color: #f9fafb !important; }
        .email-modal .border-gray-200 { border-color: #e6e9ee !important; }
        .email-modal .text-gray-900, .email-modal .text-white { color: #111827 !important; }
        .email-modal .text-gray-700 { color: #374151 !important; }
        .email-modal .text-gray-500, .email-modal .text-gray-400 { color: #6b7280 !important; }
        .email-modal .bg-blue-50 { background-color: rgba(37,99,235,0.06) !important; }
        .email-modal .text-blue-900, .email-modal .text-blue-700 { color: #1e3a8a !important; }
        .email-modal .border-blue-200 { border-color: rgba(37,99,235,0.18) !important; }

        /* Ensure avatars and attachments keep light backgrounds */
        .email-modal .bg-blue-600 { background-color: #2563eb !important; }
        .email-modal .group-hover\:opacity-100 { opacity: 1 !important; }

      `}</style>

      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
        onClick={handleClickOutside}
      >
        {/* Modal */}
        <div 
          ref={modalRef}
          className="email-modal email-modal-fade-in relative w-full max-w-4xl bg-white rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        >
          
          {/* Top Action Bar */}
          <div className="flex-shrink-0 px-4 py-3 bg-white border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button
                onClick={onClose}
                className="email-action-btn p-2 rounded-full text-gray-700 hover:bg-gray-100"
                aria-label="Geri dön"
              >
                <LuChevronLeft className="w-5 h-5" />
              </button>

              <button
                onClick={onClose}
                className="email-action-btn p-2 rounded-full text-gray-700"
                aria-label="Arşivle"
              >
                <LuArchive className="w-5 h-5" />
              </button>

              <button
                className="email-action-btn p-2 rounded-full text-gray-700"
                aria-label="Sil"
              >
                <LuTrash2 className="w-5 h-5" />
              </button>

              <div className="w-px h-6 bg-gray-300 mx-1" />

              <button
                className="email-action-btn p-2 rounded-full text-gray-700"
                aria-label="Okunmadı işaretle"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </button>

              <button
                className="email-action-btn p-2 rounded-full text-gray-700"
                aria-label="Snooze"
              >
                <LuClock className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-1">
              <button
                className="email-action-btn p-2 rounded-full text-gray-700"
                aria-label="Yazdır"
              >
                <LuPrinter className="w-5 h-5" />
              </button>

              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(prev => !prev)}
                  className="email-action-btn p-2 rounded-full text-gray-700"
                  aria-label="Daha fazla"
                >
                  <LuMoveVertical className="w-5 h-5" />
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      Yanıtla
                    </button>
                    <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      Herkese yanıtla
                    </button>
                    <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      İlet
                    </button>
                    <div className="h-px bg-gray-200 my-1" />
                    <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      Etiket ekle
                    </button>
                    <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      Klasöre taşı
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Email Content */}
          <div className="flex-1 overflow-y-auto email-scrollbar bg-white">
            <div className="max-w-3xl mx-auto px-6 sm:px-12 py-8">
              
              {/* Subject */}
              <h1 className="text-2xl sm:text-3xl font-normal text-gray-900 mb-6">
                {mail.title}
              </h1>

              {/* Email Header */}
              <div className="mb-6 pb-6 border-b border-gray-200">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Avatar: prefer image URL if provided, otherwise show emoji/avatar text. */}
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-lg font-medium ${avatarUrl ? '' : 'bg-blue-600 text-white'}`}>
                      {avatarUrl ? (
                        <Image
                          src={avatarUrl}
                          alt={`${sender.name} avatar`}
                          width={40}
                          height={40}
                          className="w-10 h-10 object-cover"
                          unoptimized
                        />
                      ) : (
                        <span className="select-none">{sender.avatar}</span>
                      )}
                    </div>

                    {/* Sender Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900 text-sm">
                          {sender.name}
                        </span>
                        {sender.verified && (
                          <LuShield className="w-3.5 h-3.5 text-blue-600" title="Doğrulanmış gönderici" />
                        )}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <span>bana</span>
                        <button className="hover:text-gray-700">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Date & Actions */}
                  <div className="flex items-start gap-3 flex-shrink-0">
                    <div className="text-xs text-gray-500 text-right">
                      <div>{getShortDate(mail.created_at)}</div>
                      <button 
                        className="text-gray-400 hover:text-gray-600 mt-1"
                        title={formatFullDate(mail.created_at)}
                      >
                        ({formatFullDate(mail.created_at).split(',')[1].trim()})
                      </button>
                    </div>
                    <button
                      onClick={() => setStarred(!starred)}
                      className="email-action-btn p-1 rounded"
                      aria-label="Yıldız ekle"
                    >
                      <LuStar className={`w-5 h-5 ${starred ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`} />
                    </button>
                    <button
                      className="email-action-btn p-1 rounded text-gray-400"
                      aria-label="Yanıtla"
                    >
                      <LuReply className="w-5 h-5" />
                    </button>
                    <button
                      className="email-action-btn p-1 rounded text-gray-400"
                      aria-label="Daha fazla"
                    >
                      <LuMoveVertical className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Detailed Header (Expandable) */}
                <div className="mt-3 text-xs text-gray-600">
                  <div className="flex gap-2">
                    <span className="font-medium w-12">Kimden:</span>
                    <span className="text-gray-700">{sender.name} &lt;{sender.email}&gt;</span>
                  </div>
                  <div className="flex gap-2 mt-1">
                    <span className="font-medium w-12">Tarih:</span>
                    <span className="text-gray-700">{formatFullDate(mail.created_at)}</span>
                  </div>
                  <div className="flex gap-2 mt-1 items-center">
                    <span className="font-medium w-12">Kime:</span>
                    {recipient ? (
                      <div className="flex items-center gap-2">
                        {recipient.avatar ? (
                          <Image src={recipient.avatar} alt={recipient.username} width={24} height={24} className="w-6 h-6 rounded-full" unoptimized />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs">{recipient.username?.slice(0,1)?.toUpperCase()}</div>
                        )}
                        <span className="text-gray-700">{recipient.username}</span>
                      </div>
                    ) : (
                      <span className="text-gray-700">bana</span>
                    )}
                  </div>
                </div>
              </div>

              {/* System notice moved to footer for consistent placement */}

              {/* Email Body */}
              <div className="mb-8">
                {renderEmailBody(mail.body ?? '', mail.category)}
              </div>

              {/* Attachment */}
              {mail.image_url && (
                <div className="mb-6">
                  <div className="text-sm text-gray-700 font-medium mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
                    </svg>
                    1 Ek
                  </div>

                  <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                    {isVideoUrl(mail.image_url) ? (
                      <video 
                        src={mail.image_url} 
                        controls 
                        className="w-full max-h-[500px] object-contain bg-black"
                      />
                    ) : (
                      <div className="relative group">
                        <Image 
                          src={mail.image_url} 
                          alt="Ek" 
                          width={1200} 
                          height={600} 
                          className="w-full h-auto object-contain max-h-[500px]" 
                          unoptimized 
                        />
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-2 bg-white rounded-lg shadow-md hover:bg-gray-50">
                            <LuDownload className="w-4 h-4 text-gray-700" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Call to Action */}
              {mail.details_url && (
                <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between gap-4">
                    <div className="text-sm text-blue-900">
                      <div className="font-medium mb-1">Daha fazla bilgi</div>
                      <div className="text-blue-700">Bu mesajla ilgili detaylı bilgi için tıklayın</div>
                    </div>
                    <a 
                      href={mail.details_url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="flex-shrink-0 inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                    >
                      Detayları Görüntüle
                    </a>
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="mt-8 flex flex-wrap gap-2">
                <button className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                  <LuReply className="w-4 h-4" />
                  Yanıtla
                </button>
                <button className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                  <LuReplyAll className="w-4 h-4" />
                  Herkese Yanıtla
                </button>
                <button className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                  <LuForward className="w-4 h-4" />
                  İlet
                </button>
              </div>

              {/* System footer removed per design: messages should show only content */}

            </div>
          </div>

        </div>
      </div>
    </>
  );
}