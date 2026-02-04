'use client';

import { useMemo, useState } from 'react';
import type { MailItem } from '../types';

const CATEGORY_LABELS: Record<string, string> = {
  announcement: 'Sistem Duyurusu',
  maintenance: 'Bakım',
  sponsor: 'Sponsor',
  update: 'Güncelleme',
  lottery: 'Çekiliş',
  reward: 'Ödül',
};

const FIXED_CATEGORIES = ['announcement', 'update', 'maintenance', 'reward', 'lottery', 'sponsor'] as const;

const categoryClass = (category: string) => {
  switch (category) {
    case 'maintenance':
      return 'border-amber-400/30 bg-amber-500/10 text-amber-200';
    case 'sponsor':
      return 'border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-200';
    case 'update':
      return 'border-indigo-400/30 bg-indigo-500/10 text-indigo-200';
    case 'lottery':
      return 'border-rose-400/30 bg-rose-500/10 text-rose-200';
    case 'reward':
      return 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200';
    default:
      return 'border-white/10 bg-white/5 text-white/70';
  }
};

type MailSectionProps = {
  loading: boolean;
  error: string | null;
  items: MailItem[];
  onOpenMail: (mail: MailItem) => void;
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

  const counts = useMemo(() => {
    return items.reduce<Record<string, number>>((acc, item) => {
      acc.all = (acc.all ?? 0) + 1;
      acc[item.category] = (acc[item.category] ?? 0) + 1;
      return acc;
    }, { all: 0 });
  }, [items]);

  const filtered = useMemo(() => {
    if (activeCategory === 'all') {
      return items;
    }
    return items.filter((item) => item.category === activeCategory);
  }, [items, activeCategory]);

  const navItems = [
    { key: 'all', label: 'Gelen Kutusu' },
    ...FIXED_CATEGORIES.map((category) => ({ key: category, label: CATEGORY_LABELS[category] ?? category })),
  ];

  const isContact = false;

  return (
    <section className="w-full bg-gradient-to-br from-[#0a1220] via-[#0a0f1a] to-[#070b12]">
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-indigo-300">POSTA</p>
          <h2 className="mt-1 text-lg font-semibold text-white">Üye Mail Sistemi</h2>
        </div>
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-white/70 transition hover:border-white/30 hover:text-white"
            >
              Geri
            </button>
          )}
          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-white/60">
            {counts.all ?? 0} mesaj
          </div>
        </div>
      </div>

      <div className="flex min-h-[620px] flex-col gap-0 md:flex-row">
        <div className="md:w-64 md:border-r md:border-white/10">
          <div className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.3em] text-white/40">
            Kategoriler
          </div>
          <div className="space-y-1 px-3 pb-4">
            {navItems.map((item) => {
              const isActive = activeCategory === item.key;
              const count = counts[item.key] ?? (item.key === 'contact' ? 0 : 0);
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveCategory(item.key)}
                  className={`relative flex w-full items-center justify-between rounded-xl px-4 py-2 text-left text-sm transition ${
                    isActive
                      ? 'bg-indigo-500/15 text-white shadow-[inset_0_0_0_1px_rgba(99,102,241,0.35)]'
                      : 'text-white/60 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        isActive ? 'bg-indigo-300 shadow-[0_0_8px_rgba(99,102,241,0.9)]' : 'bg-white/20'
                      }`}
                    />
                    {item.label}
                  </span>
                  {item.key !== 'contact' && (
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/60">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 px-6 py-5">
          {!isContact && (
            <div>
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <p className="text-xs text-white/40">Gelen Kutusu</p>
                  <h3 className="text-base font-semibold text-white">
                    {activeCategory === 'all'
                      ? 'Tüm Mesajlar'
                      : CATEGORY_LABELS[activeCategory] ?? activeCategory}
                  </h3>
                </div>
                <span className="text-xs text-white/50">{filtered.length} mesaj</span>
              </div>

              <div className="mt-4 max-h-[480px] divide-y divide-white/10 overflow-y-auto">
                {loading && <p className="text-sm text-white/60">Yükleniyor...</p>}
                {!loading && error && <p className="text-sm text-rose-300">{error}</p>}
                {!loading && !error && filtered.length === 0 && (
                  <p className="text-sm text-white/50">Henüz duyuru yok.</p>
                )}
                {!loading && !error && filtered.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onOpenMail(item)}
                    className={`flex w-full items-center justify-between gap-4 px-3 py-4 text-left transition ${
                      item.is_read
                        ? 'text-white/70 hover:bg-white/5'
                        : 'text-white hover:bg-indigo-500/10'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-1 h-9 w-9 rounded-lg border ${
                          item.is_read
                            ? 'border-white/10 bg-white/5'
                            : 'border-indigo-400/40 bg-indigo-500/15 shadow-[0_0_12px_rgba(99,102,241,0.35)]'
                        }`}
                      />
                      <div>
                        <p className="text-sm font-semibold">{item.title}</p>
                        <p className="mt-1 text-[11px] text-white/60 line-clamp-2">{item.body}</p>
                        <div className="mt-2 text-[10px] text-white/40">
                          {new Date(item.created_at).toLocaleString('tr-TR')}
                        </div>
                      </div>
                    </div>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] ${categoryClass(item.category)}`}>
                      {CATEGORY_LABELS[item.category] ?? item.category}
                    </span>
                  </button>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-white/10 pt-4">
                <button
                  type="button"
                  disabled
                  className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/50"
                >
                  Hepsini Sil
                </button>
                <button
                  type="button"
                  disabled
                  className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/50"
                >
                  Tümünü Okundu İşaretle
                </button>
                <button
                  type="button"
                  disabled
                  className="rounded-lg border border-indigo-400/30 bg-indigo-500/10 px-4 py-2 text-xs text-indigo-200"
                >
                  Hepsini Al
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
