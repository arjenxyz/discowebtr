'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

type Notification = {
  id: string;
  title: string;
  body: string;
  type: 'announcement' | 'mail';
  status: 'published' | 'draft';
  created_at: string;
  author_name?: string | null;
  author_avatar_url?: string | null;
  details_url?: string | null;
  image_url?: string | null;
};

export default function AdminNotificationHistoryPage() {
  const [list, setList] = useState<Notification[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = async () => {
    const response = await fetch('/api/admin/notifications');
    if (response.ok) {
      const data = (await response.json()) as Notification[];
      setList(data ?? []);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    await fetch('/api/admin/notifications', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    await load();
    setDeleting(null);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300">Admin</p>
        <h1 className="mt-2 text-2xl font-semibold">Bildirim Geçmişi</h1>
        <p className="mt-1 text-sm text-white/60">Gönderilen duyuru ve mailleri görüntüleyin.</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="mt-1 space-y-3 text-sm">
          {list.map((item) => {
            const typeLabel = item.type === 'announcement' ? 'Duyuru' : 'Mail';
            const typeClass = item.type === 'announcement'
              ? 'border-indigo-400/30 bg-indigo-500/10 text-indigo-200'
              : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200';

            return (
              <div key={item.id} className="rounded-xl border border-white/10 bg-[#0b0d12]/60 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {item.author_avatar_url ? (
                      <Image
                        src={item.author_avatar_url}
                        alt="author"
                        width={40}
                        height={40}
                        className="h-10 w-10 rounded-full"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-white/10" />
                    )}
                    <div>
                      <p className="text-white/80">{item.title}</p>
                      {item.author_name && <p className="text-xs text-white/40">{item.author_name}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full border px-2 py-1 text-[10px] ${typeClass}`}>{typeLabel}</span>
                    <span className="text-xs text-white/40">{new Date(item.created_at).toLocaleString('tr-TR')}</span>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      disabled={deleting === item.id}
                      className="rounded-full border border-white/10 px-3 py-1 text-[11px] text-white/50 transition hover:border-white/30 hover:text-white disabled:opacity-60"
                    >
                      {deleting === item.id ? 'Siliniyor...' : 'Sil'}
                    </button>
                  </div>
                </div>
                <p className="mt-3 text-sm text-white/60">{item.body}</p>
                {item.image_url && (
                  <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-2">
                    <Image
                      src={item.image_url}
                      alt="notification"
                      width={960}
                      height={480}
                      unoptimized
                      className="max-h-80 w-full object-contain"
                    />
                  </div>
                )}
                {item.details_url && (
                  <a
                    href={item.details_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-[11px] text-white/60 transition hover:border-white/30 hover:text-white"
                  >
                    Detay bağlantısı
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
