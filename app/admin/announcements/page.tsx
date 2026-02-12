"use client";

import { useState } from 'react';

export default function AdminAnnouncementsPage() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [detailsUrl, setDetailsUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!title.trim() || !body.trim()) return setMessage('Başlık ve içerik gerekli.');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), body: body.trim(), details_url: detailsUrl || null, image_url: imageUrl || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'unknown');
      setMessage('Duyuru yayımlandı.');
      setTitle(''); setBody(''); setDetailsUrl(''); setImageUrl('');
    } catch (err: any) {
      setMessage('Gönderme hatası: ' + (err?.message ?? String(err)));
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Yeni Duyuru Oluştur</h2>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Başlık</label>
          <input value={title} onChange={e => setTitle(e.target.value)} className="w-full px-3 py-2 rounded bg-zinc-900 border border-zinc-800 text-white" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">İçerik</label>
          <textarea value={body} onChange={e => setBody(e.target.value)} rows={6} className="w-full px-3 py-2 rounded bg-zinc-900 border border-zinc-800 text-white" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Detay URL (isteğe bağlı)</label>
            <input value={detailsUrl} onChange={e => setDetailsUrl(e.target.value)} className="w-full px-3 py-2 rounded bg-zinc-900 border border-zinc-800 text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Medya URL (isteğe bağlı)</label>
            <input value={imageUrl} onChange={e => setImageUrl(e.target.value)} className="w-full px-3 py-2 rounded bg-zinc-900 border border-zinc-800 text-white" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button disabled={loading} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded text-white font-medium">{loading ? 'Gönderiliyor...' : 'Yayınla'}</button>
          <button type="button" onClick={() => { setTitle(''); setBody(''); setDetailsUrl(''); setImageUrl(''); }} className="px-3 py-2 rounded border border-zinc-800 text-zinc-300">Temizle</button>
          {message && <div className="text-sm text-zinc-300 ml-3">{message}</div>}
        </div>
      </form>
    </div>
  );
}
