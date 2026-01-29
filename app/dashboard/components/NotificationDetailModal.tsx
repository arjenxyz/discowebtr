'use client';

import Image from 'next/image';
import type { Notification } from '../types';

type NotificationDetailModalProps = {
  notification: Notification | null;
  onClose: () => void;
};

export default function NotificationDetailModal({ notification, onClose }: NotificationDetailModalProps) {
  if (!notification) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0b0d12] p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {notification.author_avatar_url ? (
              <Image
                src={notification.author_avatar_url}
                alt="author"
                width={48}
                height={48}
                className="h-12 w-12 rounded-full"
              />
            ) : (
              <div className="h-12 w-12 rounded-full bg-white/10" />
            )}
            <div>
              <p className="text-lg font-semibold text-white">{notification.title}</p>
              {notification.author_name && <p className="text-sm text-white/50">{notification.author_name}</p>}
              <p className="text-xs text-white/40">{new Date(notification.created_at).toLocaleString('tr-TR')}</p>
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
          {notification.body}
        </div>
        {notification.image_url && (
          <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-2">
            <Image
              src={notification.image_url}
              alt="notification"
              width={960}
              height={480}
              unoptimized
              className="max-h-80 w-full object-contain"
            />
          </div>
        )}
        {notification.details_url && (
          <a
            href={notification.details_url}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex rounded-full border border-white/10 px-3 py-2 text-xs text-white/60 transition hover:border-white/30 hover:text-white"
          >
            Detayları görüntüle
          </a>
        )}
      </div>
    </div>
  );
}
