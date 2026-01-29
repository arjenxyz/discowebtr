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

export default function AdminWalletPage() {
  const [mode, setMode] = useState<'add' | 'remove'>('add');
  const [scope, setScope] = useState<'user' | 'all'>('user');
  const [userId, setUserId] = useState('');
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [preset, setPreset] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MemberResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberResult | null>(null);

  const userPresets = [
    {
      value: 'maintenance',
      label: 'Bakım telafisi mesajı',
      text: 'Merhaba, kısa süreli bakım nedeniyle telafi olarak {amount} papel hesabınıza eklendi. Anlayışınız için teşekkürler.',
    },
    {
      value: 'event',
      label: 'Etkinlik/başarı ödülü',
      text: 'Tebrikler! Etkinlik katkınız için {amount} papel ödülünüz hesabınıza aktarıldı. Keyifle kullanın.',
    },
    {
      value: 'gift',
      label: 'Topluluk teşekkür hediyesi',
      text: 'Topluluğumuza verdiğiniz destek için teşekkürler. Size {amount} papel hediye ediyoruz.',
    },
    {
      value: 'refund',
      label: 'Hata telafisi/iade',
      text: 'Yaşanan aksaklık için üzgünüz. Telafi olarak {amount} papel bakiyenize eklendi.',
    },
    {
      value: 'milestone',
      label: 'Seviye/katkı ödülü',
      text: 'Topluluk katkınız için teşekkürler! {amount} papel ödülünüz hesabınıza aktarıldı.',
    },
    {
      value: 'support',
      label: 'Destek teşekkür',
      text: 'Destek talebiniz sonrası iyi niyet hediyesi olarak {amount} papel hesabınıza yansıdı.',
    },
  ];

  const allPresets = [
    {
      value: 'maintenance_all',
      label: 'Bakım telafisi (tüm üyeler)',
      text: 'Planlı bakım nedeniyle telafi olarak {amount} papel tüm üye bakiyelerine eklendi. Teşekkürler.',
    },
    {
      value: 'announcement_all',
      label: 'Topluluk teşvik (genel)',
      text: 'Topluluk motivasyonu için {amount} papel tüm üyelere tanımlandı. Keyifle kullanın.',
    },
    {
      value: 'event_all',
      label: 'Etkinlik ödülü (genel)',
      text: 'Etkinlik katılım teşekkürü olarak {amount} papel tüm üyelere aktarıldı.',
    },
    {
      value: 'season_all',
      label: 'Sezon kapanışı bonusu',
      text: 'Sezon kapanışı kapsamında {amount} papel tüm üyelere bonus olarak eklendi.',
    },
    {
      value: 'promo_all',
      label: 'Promosyon teşviki',
      text: 'Yeni dönem teşviki için {amount} papel tüm üye bakiyelerine yüklendi.',
    },
    {
      value: 'loyalty_all',
      label: 'Sadakat teşekkür',
      text: 'Topluluğa katkılarınız için {amount} papel tüm üyelerimize hediye edildi.',
    },
  ];

  const presets = scope === 'all' ? allPresets : userPresets;

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);

    const value = Number(amount);
    if (Number.isNaN(value) || value <= 0) {
      setError('Geçerli bir miktar girin.');
      return;
    }

    if (scope === 'user' && !userId.trim()) {
      setError('Kullanıcı ID zorunlu.');
      return;
    }

    if (mode === 'add' && !message.trim()) {
      setError('Papel eklerken açıklama zorunludur.');
      return;
    }

    setLoading(true);
    const response = await fetch('/api/admin/wallet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode,
        scope,
        amount: value,
        userId: scope === 'user' ? userId.trim() : undefined,
        message: message.trim(),
        imageUrl: imageUrl.trim() || undefined,
      }),
    });

    const data = (await response.json().catch(() => ({}))) as { error?: string; updated?: number };

    if (!response.ok) {
      if (data.error === 'message_required') {
        setError('Papel eklemek için açıklama zorunludur.');
      } else {
        setError('İşlem başarısız.');
      }
      setLoading(false);
      return;
    }

    if (scope === 'all') {
      setSuccess(`Tüm kullanıcılara işlem uygulandı. Toplam: ${data.updated ?? 0}`);
    } else {
      setSuccess('İşlem başarılı.');
    }

    setAmount('');
    setMessage('');
    setPreset('');
    setImageUrl('');
    setLoading(false);
  };

  // DÜZELTME 1: Temizleme işlemi useEffect'ten çıkarıldı, aşağıda onChange içine taşındı.
  // useEffect artık sadece arama (search) işlemiyle ilgileniyor.
  useEffect(() => {
    if (scope !== 'user') {
      return;
    }

    const query = searchQuery.trim();
    if (query.length < 2) {
      return;
    }

    let active = true;
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      const response = await fetch(`/api/admin/members/search?q=${encodeURIComponent(query)}`);
      const data = (await response.json().catch(() => [])) as MemberResult[];
      if (active) {
        setSearchResults(Array.isArray(data) ? data : []);
        setSearchLoading(false);
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchQuery, scope]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300">Admin</p>
        <h1 className="mt-2 text-2xl font-semibold">Bakiye Yönetimi</h1>
        <p className="mt-1 text-sm text-white/60">Kullanıcılara veya tüm üyelere papel ekleyin/silin.</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs text-white/50">İşlem</label>
            <select
              value={mode}
              onChange={(event) => setMode(event.target.value as 'add' | 'remove')}
              className="w-full rounded-xl border border-white/10 bg-[#0b0d12]/70 px-4 py-3 text-sm text-white/80 focus:border-indigo-400 focus:outline-none"
            >
              <option value="add">Bakiye Ekle</option>
              <option value="remove">Bakiye Sil</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-white/50">Kapsam</label>
            <select
              value={scope}
              // DÜZELTME 2: Temizleme işlemi buraya (event handler'a) taşındı.
              onChange={(event) => {
                const newScope = event.target.value as 'user' | 'all';
                setScope(newScope);
                if (newScope !== 'user') {
                  setSearchResults([]);
                  setSearchQuery('');
                  setSelectedMember(null);
                }
              }}
              className="w-full rounded-xl border border-white/10 bg-[#0b0d12]/70 px-4 py-3 text-sm text-white/80 focus:border-indigo-400 focus:outline-none"
            >
              <option value="user">Tek Kullanıcı</option>
              <option value="all">Tüm Kullanıcılar</option>
            </select>
          </div>
        </div>

        {scope === 'user' && (
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <label className="text-xs text-white/50">Kullanıcı ara (nickname / username)</label>
              <input
                value={searchQuery}
                onChange={(event) => {
                  const value = event.target.value;
                  setSearchQuery(value);
                  if (value.trim().length < 2) {
                    setSearchResults([]);
                  }
                }}
                placeholder="Örn: night, newli"
                className="w-full rounded-xl border border-white/10 bg-[#0b0d12]/70 px-4 py-3 text-sm text-white/80 focus:border-indigo-400 focus:outline-none"
              />
              {searchLoading && <p className="text-xs text-white/50">Aranıyor...</p>}
              {!searchLoading && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
                <p className="text-xs text-white/50">Sonuç bulunamadı.</p>
              )}
              {searchResults.length > 0 && (
                <div className="grid gap-2 rounded-xl border border-white/10 bg-[#0b0d12]/60 p-2">
                  {searchResults.map((member) => {
                    const label = member.nickname || member.displayName || member.username;
                    return (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => {
                          setUserId(member.id);
                          setSelectedMember(member);
                          setSearchQuery(label);
                          setSearchResults([]);
                        }}
                        className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/5 px-3 py-2 text-left text-sm text-white/80 transition hover:border-indigo-400/40"
                      >
                        <Image
                          src={member.avatarUrl}
                          alt="avatar"
                          width={28}
                          height={28}
                          unoptimized
                          className="h-7 w-7 rounded-full border border-white/10"
                        />
                        <div>
                          <p className="text-sm text-white">{label}</p>
                          <p className="text-xs text-white/50">
                            @{member.username} · {member.id}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs text-white/50">Kullanıcı Discord ID</label>
              <input
                value={userId}
                onChange={(event) => {
                  setUserId(event.target.value);
                  setSelectedMember(null);
                }}
                placeholder="1234567890"
                className="w-full rounded-xl border border-white/10 bg-[#0b0d12]/70 px-4 py-3 text-sm text-white/80 focus:border-indigo-400 focus:outline-none"
              />
            </div>

            {selectedMember && (
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
                <div className="flex items-center gap-3">
                  <Image
                    src={selectedMember.avatarUrl}
                    alt="avatar"
                    width={32}
                    height={32}
                    unoptimized
                    className="h-8 w-8 rounded-full border border-white/10"
                  />
                  <div>
                    <p className="text-white">
                      {selectedMember.nickname || selectedMember.displayName || selectedMember.username}
                    </p>
                    <p className="text-xs text-white/50">{selectedMember.id}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMember(null);
                    setUserId('');
                    setSearchQuery('');
                  }}
                  className="text-xs text-white/60 transition hover:text-white"
                >
                  Seçimi temizle
                </button>
              </div>
            )}
          </div>
        )}

        <div className="mt-4 space-y-2">
          <label className="text-xs text-white/50">Miktar (papel)</label>
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="100"
            type="number"
            className="w-full rounded-xl border border-white/10 bg-[#0b0d12]/70 px-4 py-3 text-sm text-white/80 focus:border-indigo-400 focus:outline-none"
          />
        </div>

        <div className="mt-4 space-y-2">
          <label className="text-xs text-white/50">Hazır mesajlar</label>
          <select
            value={preset}
            onChange={(event) => {
              const selected = event.target.value;
              setPreset(selected);
              const found = presets.find((item) => item.value === selected);
              if (found) {
                setMessage(found.text);
              }
            }}
            className="w-full rounded-xl border border-white/10 bg-[#0b0d12]/70 px-4 py-3 text-sm text-white/80 focus:border-indigo-400 focus:outline-none"
          >
            <option value="">Seçiniz</option>
            {presets.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-white/40">{`{amount}`} yer tutucusu otomatik tutar ile değişir.</p>
        </div>

        <div className="mt-4 space-y-2">
          <label className="text-xs text-white/50">Açıklama {mode === 'add' ? '(zorunlu)' : '(opsiyonel)'}</label>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={4}
            placeholder="Örn: Bakım telafisi, etkinlik ödülü vb."
            className="w-full rounded-xl border border-white/10 bg-[#0b0d12]/70 px-4 py-3 text-sm text-white/80 focus:border-indigo-400 focus:outline-none"
          />
        </div>

        {mode === 'add' && (
          <div className="mt-4 space-y-2">
            <label className="text-xs text-white/50">Görsel URL (opsiyonel)</label>
            <input
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              placeholder="https://..."
              className="w-full rounded-xl border border-white/10 bg-[#0b0d12]/70 px-4 py-3 text-sm text-white/80 focus:border-indigo-400 focus:outline-none"
            />
            {imageUrl.trim().length > 0 && (
              <div className="mt-2 rounded-xl border border-white/10 bg-black/20 p-2">
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
        )}

        {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
        {success && <p className="mt-3 text-sm text-emerald-300">{success}</p>}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="mt-4 rounded-xl bg-indigo-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'İşleniyor...' : 'Uygula'}
        </button>
      </div>
    </div>
  );
}