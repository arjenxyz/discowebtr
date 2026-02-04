'use client';

import Image from 'next/image';
import type { MailItem } from '../types';

const CATEGORY_LABELS: Record<string, string> = {
  announcement: 'Sistem Duyurusu',
  maintenance: 'Bakım',
  sponsor: 'Sponsor',
  update: 'Güncelleme',
  lottery: 'Çekiliş',
  reward: 'Ödül',
};

type MailDetailModalProps = {
  mail: MailItem | null;
  onClose: () => void;
  renderBody: (body: string) => React.ReactNode;
};

export default function MailDetailModal({ mail, onClose, renderBody }: MailDetailModalProps) {
  if (!mail) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0b0d12] p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {mail.author_avatar_url ? (
              <Image
                src={mail.author_avatar_url}
                alt="author"
                width={48}
                height={48}
                className="h-12 w-12 rounded-full"
              />
            ) : (
              <div className="h-12 w-12 rounded-full bg-white/10" />
            )}
            <div>
              <p className="text-lg font-semibold text-white">{mail.title}</p>
              {mail.author_name && <p className="text-sm text-white/50">{mail.author_name}</p>}
              <p className="text-xs text-white/40">
                {CATEGORY_LABELS[mail.category] ?? mail.category} · {new Date(mail.created_at).toLocaleString('tr-TR')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/60 transition hover:border-white/30 hover:text-white"
          >
            Kapat
          </button>
        </div>
        <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
          {renderBody(mail.body)}
        </div>
      </div>
    </div>
  );
}
