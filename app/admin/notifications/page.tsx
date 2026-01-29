'use client';

import Link from 'next/link';

export default function AdminNotificationsPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300">Admin</p>
        <h1 className="mt-2 text-2xl font-semibold">Bildirim Ayarları</h1>
        <p className="mt-1 text-sm text-white/60">Bildirim gönderme ve geçmişe erişim burada.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link
          href="/admin/notifications/send"
          className="group rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:border-white/30 hover:bg-white/10"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300">Bildirim Gönder</p>
          <h2 className="mt-2 text-lg font-semibold text-white">Yeni bildirim oluştur</h2>
          <p className="mt-2 text-sm text-white/60">
            Duyuru veya kişisel mail gönderimi için hazırlık ekranı.
          </p>
          <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-xs text-white/60 transition group-hover:border-white/30 group-hover:text-white">
            Gönderim ekranına git
          </span>
        </Link>

        <Link
          href="/admin/notifications/history"
          className="group rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:border-white/30 hover:bg-white/10"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300">Bildirim Geçmişi</p>
          <h2 className="mt-2 text-lg font-semibold text-white">Gönderilen bildirimler</h2>
          <p className="mt-2 text-sm text-white/60">
            Önceden gönderilen duyuru ve mailleri takip edin.
          </p>
          <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-xs text-white/60 transition group-hover:border-white/30 group-hover:text-white">
            Geçmişe git
          </span>
        </Link>
      </div>
    </div>
  );
}
