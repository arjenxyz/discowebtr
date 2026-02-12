'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LuTicket, LuWand, LuCalendar, LuLoaderCircle, LuCircleCheck, LuUsers, LuDollarSign } from 'react-icons/lu';

type DiscountStatus = 'active' | 'disabled' | 'expired';
type TabType = 'single' | 'welcome' | 'bulk';

export default function AdminStoreDiscountCreatePage() {
  const [activeTab, setActiveTab] = useState<TabType>('single');
  
  // Form States
  const [code, setCode] = useState('');
  const [percent, setPercent] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [minSpend, setMinSpend] = useState(''); // Yeni: Min Sepet Tutarı
  const [perUserLimit, setPerUserLimit] = useState('1');
  const [expiresAt, setExpiresAt] = useState('');
  const [status, setStatus] = useState<DiscountStatus>('active');
  const [isSpecial, setIsSpecial] = useState(false);
  
  // Loading & Error States
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Helper: Rastgele Kod Üretici
  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCode(result);
  };

  const handleCreateDiscount = async () => {
    setSaving(true);
    setMessage(null);

    // Basit validasyon
    if (!code || !percent) {
        setMessage({ type: 'error', text: 'Kod ve indirim oranı zorunludur.' });
        setSaving(false);
        return;
    }

    const payload = {
      code: code.toUpperCase(),
      percent: Number(percent),
      maxUses: maxUses ? Number(maxUses) : null,
      minSpend: minSpend ? Number(minSpend) : 0, // Yeni
      perUserLimit: perUserLimit ? Number(perUserLimit) : 1,
      status,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      is_special: isSpecial,
      is_welcome: activeTab === 'welcome', // Tab'a göre belirle
    };

    try {
      const response = await fetch('/api/admin/discounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Bir hata oluştu.');
      }

      setMessage({ type: 'success', text: 'İndirim kodu başarıyla oluşturuldu!' });
      
      // Formu temizle (Welcome değilse)
      if (activeTab !== 'welcome') {
        setCode('');
        setPercent('');
        setMaxUses('');
        setMinSpend('');
        setExpiresAt('');
      }

    } catch (err: unknown) {
      let errorMsg = 'Bir hata oluştu.';
      if (err instanceof Error) {
        errorMsg = err.message;
      }
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/10 bg-[#0b0d12]/50 p-8 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-500/20 rounded-2xl text-indigo-400">
            <LuTicket className="w-8 h-8" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-400">Yönetim Paneli</p>
            <h1 className="text-3xl font-bold text-white mt-1">İndirim Yöneticisi</h1>
          </div>
        </div>
        <Link
          href="/admin/store/discounts"
          className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white hover:border-white/20"
        >
          Listeye Dön
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-[#0b0d12] border border-white/10 rounded-2xl w-fit">
        <button
            onClick={() => { setActiveTab('single'); setCode(''); }}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'single' ? 'bg-indigo-600 text-white shadow-lg' : 'text-white/50 hover:text-white'}`}
        >
            Tekil Kod
        </button>
        <button
            onClick={() => { setActiveTab('welcome'); setCode('WELCOME2026'); }}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'welcome' ? 'bg-emerald-600 text-white shadow-lg' : 'text-white/50 hover:text-white'}`}
        >
            Hoşgeldin Ayarı
        </button>
        <button
            disabled
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-white/20 cursor-not-allowed"
            title="Yakında"
        >
            Toplu Oluştur (Yakında)
        </button>
      </div>

      {/* Main Form Card */}
      <div className="rounded-3xl border border-white/10 bg-[#0b0d12]/80 p-8 relative overflow-hidden">
        
        {/* Dekoratif Glow */}
        <div className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-[100px] pointer-events-none opacity-20 ${activeTab === 'welcome' ? 'bg-emerald-500' : 'bg-indigo-500'}`} />

        <div className="relative z-10">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                {activeTab === 'welcome' ? 'Varsayılan Hoşgeldin İndirimi' : 'Yeni İndirim Kodu Tanımla'}
            </h2>

            {/* Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Sol Kolon: Temel Bilgiler */}
                <div className="space-y-5">
                    
                    {/* Kod Input + Generator */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-white/60 ml-1">İndirim Kodu</label>
                        <div className="flex gap-2">
                            <input
                                value={code}
                                onChange={(e) => setCode(e.target.value.toUpperCase())}
                                placeholder="Örn: YAZ2026"
                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-mono tracking-wider focus:border-indigo-500 focus:outline-none transition-colors"
                            />
                            {activeTab !== 'welcome' && (
                                <button 
                                    onClick={generateRandomCode}
                                    className="p-3 bg-white/5 border border-white/10 rounded-xl text-indigo-400 hover:bg-indigo-500/20 hover:border-indigo-500/50 transition-all"
                                    title="Rastgele Kod Üret"
                                >
                                    <LuWand className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Oran & Limit */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-white/60 ml-1">İndirim Oranı (%)</label>
                            <input
                                type="number"
                                min="1" max="100"
                                value={percent}
                                onChange={(e) => setPercent(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-indigo-500 focus:outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-white/60 ml-1">Kullanım Limiti</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={maxUses}
                                    onChange={(e) => setMaxUses(e.target.value)}
                                    placeholder="Sınırsız"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-indigo-500 focus:outline-none pl-10"
                                />
                                <LuUsers className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                            </div>
                        </div>
                    </div>

                    {/* Min Sepet Tutarı (YENİ) */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-white/60 ml-1">Minimum Sepet Tutarı (Papel)</label>
                        <div className="relative">
                            <input
                                type="number"
                                value={minSpend}
                                onChange={(e) => setMinSpend(e.target.value)}
                                placeholder="0"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-indigo-500 focus:outline-none pl-10"
                            />
                            <LuDollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                        </div>
                        <p className="text-[10px] text-white/30 ml-1">* İndirimin uygulanması için sepetin en az bu tutarda olması gerekir.</p>
                    </div>

                      {/* Per-user limit (YENİ) */}
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-white/60 ml-1">Her Kullanıcı İçin Limit</label>
                        <div className="relative">
                          <input
                            type="number"
                            min="1"
                            value={perUserLimit}
                            onChange={(e) => setPerUserLimit(e.target.value)}
                            placeholder="1"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-indigo-500 focus:outline-none pl-10"
                          />
                        </div>
                        <p className="text-[10px] text-white/30 ml-1">* Her kullanıcı bu kodu bu kadar kez kullanabilir (varsayılan 1).</p>
                      </div>

                </div>

                {/* Sağ Kolon: Ayarlar & Zaman */}
                <div className="space-y-5">
                    
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-white/60 ml-1">Son Kullanma Tarihi</label>
                        <div className="relative">
                            <input
                                type="datetime-local"
                                value={expiresAt}
                                onChange={(e) => setExpiresAt(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-indigo-500 focus:outline-none [color-scheme:dark]"
                            />
                            <LuCalendar className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 pointer-events-none" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-white/60 ml-1">Durum</label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value as DiscountStatus)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-indigo-500 focus:outline-none appearance-none"
                        >
                            <option value="active">🟢 Aktif</option>
                            <option value="disabled">🔴 Pasif (Devre Dışı)</option>
                            <option value="expired">⚫ Süresi Dolmuş</option>
                        </select>
                    </div>

                    {/* Checkbox */}
                    <div className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-white/5">
                        <input
                            id="special-checkbox"
                            type="checkbox"
                            checked={isSpecial}
                            onChange={(e) => setIsSpecial(e.target.checked)}
                            className="w-5 h-5 rounded border-white/20 bg-black/50 text-indigo-500 focus:ring-indigo-500"
                        />
                        <label htmlFor="special-checkbox" className="text-sm text-white/80 cursor-pointer select-none">
                          <span className="block font-semibold">Herkese Özel İndirim Kodu</span>
                          <span className="text-xs text-white/40">Sepette &quot;Özel İndirim&quot; bölümünde herkese görünür ve mail ile bildirilir.</span>
                        </label>
                    </div>

                </div>
            </div>

            {/* Action Bar */}
            <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
                
                {/* Mesaj Alanı */}
                <div className="flex-1 mr-4">
                    {message && (
                        <div className={`flex items-center gap-2 text-sm font-medium ${message.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {message.type === 'success' ? <LuCircleCheck /> : <LuLoaderCircle />}
                            {message.text}
                        </div>
                    )}
                </div>

                <button
                    onClick={handleCreateDiscount}
                    disabled={saving}
                    className={`px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-all active:scale-95 flex items-center gap-2 ${
                        saving 
                        ? 'bg-white/10 cursor-not-allowed' 
                        : activeTab === 'welcome' 
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110'
                            : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:brightness-110'
                    }`}
                >
                    {saving ? 'İşleniyor...' : (activeTab === 'welcome' ? 'Ayarları Kaydet' : 'Kodu Oluştur')}
                </button>
            </div>

        </div>
      </div>
    </div>
  );
}