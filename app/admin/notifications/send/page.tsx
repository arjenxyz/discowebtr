'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

type MemberResult = {
  id: string;
  username: string;
  nickname: string | null;
  displayName: string | null;
  avatarUrl: string;
};

type Template = {
  value: string;
  label: string;
  title: string;
  type: 'announcement' | 'mail';
  body: string;
  detailsUrl?: string;
};

const ANNOUNCEMENT_TEMPLATES: Template[] = [
  {
    value: 'maintenance',
    label: 'Bakım bilgilendirmesi',
    title: 'Planlı bakım',
    type: 'announcement',
    body: 'Kısa süreli bakım çalışması yapıyoruz. Bu sürede bazı özellikler geçici olarak kullanılamayabilir. Anlayışınız için teşekkürler.',
  },
  {
    value: 'event',
    label: 'Etkinlik duyurusu',
    title: 'Etkinlik zamanı!',
    type: 'announcement',
    body: 'Topluluk etkinliğimiz başlıyor. Katılım detayları ve saat bilgileri için duyuru kanalını kontrol edin.',
  },
  {
    value: 'rules',
    label: 'Kural hatırlatması',
    title: 'Topluluk kuralları hatırlatması',
    type: 'announcement',
    body: 'Huzurlu bir ortam için kurallara dikkat edelim. İhlal tespitinde yaptırımlar uygulanabilir.',
  },
  {
    value: 'store',
    label: 'Mağaza güncellemesi',
    title: 'Mağazada yeni ürünler',
    type: 'announcement',
    body: 'Mağazamıza yeni ürünler eklendi. Güncel ürünleri incelemek için mağaza sekmesine göz atabilirsiniz.',
  },
];

const MAIL_TEMPLATES: Template[] = [
  {
    value: 'account',
    label: 'Hesap bilgilendirmesi',
    title: 'Hesap bilgilendirmesi',
    type: 'mail',
    body: 'Merhaba, hesabınızla ilgili önemli bir bilgilendirme yapmak istiyoruz. Detaylar için bağlantıyı kullanabilirsiniz.',
    detailsUrl: 'https://',
  },
  {
    value: 'warning',
    label: 'Uyarı mesajı',
    title: 'Uyarı',
    type: 'mail',
    body: 'Topluluk kurallarına uygun davranmanız önemlidir. Tekrarlayan ihlallerde işlem uygulanacaktır.',
    detailsUrl: '',
  },
  {
    value: 'info',
    label: 'Genel bilgi (kişisel)',
    title: 'Bilgilendirme',
    type: 'mail',
    body: 'Size özel bilgilendirme: Sorularınız için moderasyon ekibiyle iletişime geçebilirsiniz.',
    detailsUrl: '',
  },
];

export default function AdminNotificationSendPage() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState<'announcement' | 'mail'>('announcement');
  const [template, setTemplate] = useState('');
  const [detailsUrl, setDetailsUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [memberQuery, setMemberQuery] = useState('');
  const [memberResults, setMemberResults] = useState<MemberResult[]>([]);
  const [memberLoading, setMemberLoading] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (type !== 'mail') {
      setMemberQuery('');
      setMemberResults([]);
      setSelectedMember(null);
      return;
    }

    if (!memberQuery.trim()) {
      setMemberResults([]);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setMemberLoading(true);
      try {
        const response = await fetch(`/api/admin/members/search?q=${encodeURIComponent(memberQuery.trim())}`);
        if (response.ok) {
          const data = (await response.json()) as MemberResult[];
          setMemberResults(data ?? []);
        }
      } finally {
        if (!controller.signal.aborted) {
          setMemberLoading(false);
        }
      }
    }, 300);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [memberQuery, type]);

  const handleSubmit = async () => {
    setSaving(true);
    setError(null);

    if (type === 'mail' && !selectedMember) {
      setError('Mail göndermek için üye seçmelisiniz.');
      setSaving(false);
      return;
    }

    const response = await fetch('/api/admin/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        body,
        type,
        status: 'published',
        targetUserId: type === 'mail' ? selectedMember?.id : null,
        detailsUrl: type === 'mail' && detailsUrl.trim().length ? detailsUrl.trim() : null,
        imageUrl: imageUrl.trim().length ? imageUrl.trim() : null,
      }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (data.error === 'target_required') {
        setError('Mail göndermek için üye seçmelisiniz.');
      } else {
        setError('Bildirim gönderilemedi.');
      }
      setSaving(false);
      return;
    }

    setTitle('');
    setBody('');
    setTemplate('');
    setDetailsUrl('');
    setImageUrl('');
    setMemberQuery('');
    setMemberResults([]);
    setSelectedMember(null);
    setSaving(false);
  };

  const templateOptions = type === 'announcement' ? ANNOUNCEMENT_TEMPLATES : MAIL_TEMPLATES;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300">Admin</p>
        <h1 className="mt-2 text-2xl font-semibold">Bildirim Gönder</h1>
        <p className="mt-1 text-sm text-white/60">Üyelere duyuru veya mail formatında bildirim gönderin.</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="grid gap-4">
          <div className="rounded-2xl border border-white/10 bg-[#0b0d12]/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300">Yeni Bildirim</p>
            <p className="mt-2 text-sm text-white/60">Duyuru ya da mail formatında bildirim gönderin.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Başlık"
              className="w-full rounded-xl border border-white/10 bg-[#0b0d12]/70 px-4 py-3 text-sm text-white/80 focus:border-indigo-400 focus:outline-none"
            />
            <select
              value={type}
              onChange={(event) => setType(event.target.value as 'announcement' | 'mail')}
              className="w-full rounded-xl border border-white/10 bg-[#0b0d12]/70 px-4 py-3 text-sm text-white/80 focus:border-indigo-400 focus:outline-none"
            >
              <option value="announcement">Duyuru</option>
              <option value="mail">Mail</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/40">Şablonlar</label>
            <div className="mt-2 grid gap-3 md:grid-cols-2">
              <select
                value={template}
                onChange={(event) => {
                  const selectedValue = event.target.value;
                  setTemplate(selectedValue);
                  const source = templateOptions.find((item) => item.value === selectedValue);
                  if (source) {
                    setTitle(source.title);
                    setBody(source.body);
                    setDetailsUrl(source.detailsUrl ?? '');
                  }
                }}
                className="w-full rounded-xl border border-white/10 bg-[#0b0d12]/70 px-4 py-3 text-sm text-white/80 focus:border-indigo-400 focus:outline-none"
              >
                <option value="">Şablon seç</option>
                {templateOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              {type === 'mail' && (
                <input
                  value={detailsUrl}
                  onChange={(event) => setDetailsUrl(event.target.value)}
                  placeholder="Detay bağlantısı"
                  className="w-full rounded-xl border border-white/10 bg-[#0b0d12]/70 px-4 py-3 text-sm text-white/80 focus:border-indigo-400 focus:outline-none"
                />
              )}
            </div>
          </div>
          {type === 'mail' && (
            <div className="grid gap-3">
              <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/40">Hedef Üye</label>
              <input
                value={memberQuery}
                onChange={(event) => setMemberQuery(event.target.value)}
                placeholder="Üye adı ya da ID"
                className="w-full rounded-xl border border-white/10 bg-[#0b0d12]/70 px-4 py-3 text-sm text-white/80 focus:border-indigo-400 focus:outline-none"
              />
              {memberLoading && <p className="text-xs text-white/40">Aranıyor...</p>}
              {!memberLoading && memberResults.length > 0 && (
                <div className="grid gap-2 rounded-xl border border-white/10 bg-[#0b0d12]/60 p-2">
                  {memberResults.map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => {
                        setSelectedMember(member);
                        setMemberResults([]);
                        setMemberQuery(member.nickname ?? member.displayName ?? member.username);
                      }}
                      className="flex items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-white/70 transition hover:bg-white/5 hover:text-white"
                    >
                      <Image
                        src={member.avatarUrl}
                        alt={member.username}
                        width={32}
                        height={32}
                        className="h-8 w-8 rounded-full"
                      />
                      <div>
                        <p>{member.nickname ?? member.displayName ?? member.username}</p>
                        <p className="text-xs text-white/40">@{member.username}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {selectedMember && (
                <div className="rounded-xl border border-white/10 bg-[#0b0d12]/60 p-3 text-sm text-white/70">
                  <p>Seçilen üye: {selectedMember.nickname ?? selectedMember.displayName ?? selectedMember.username}</p>
                </div>
              )}
            </div>
          )}
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/40">Görsel</label>
            <input
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              placeholder="https://..."
              className="mt-3 w-full rounded-xl border border-white/10 bg-[#0b0d12]/70 px-4 py-3 text-sm text-white/80 focus:border-indigo-400 focus:outline-none"
            />
            {imageUrl.trim().length > 0 && (
              <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-2">
                <Image
                  src={imageUrl}
                  alt="preview"
                  width={960}
                  height={480}
                  unoptimized
                  className="max-h-64 w-full object-contain"
                />
              </div>
            )}
          </div>
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Bildirim içeriği"
            rows={4}
            className="w-full rounded-xl border border-white/10 bg-[#0b0d12]/70 px-4 py-3 text-sm text-white/80 focus:border-indigo-400 focus:outline-none"
          />
        </div>
        {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving || !title || !body}
          className="mt-4 rounded-xl bg-indigo-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? 'Gönderiliyor...' : 'Bildirim Gönder'}
        </button>
      </div>
    </div>
  );
}
