'use client';

import { useState } from 'react';
import Link from 'next/link';

type PromotionStatus = 'active' | 'disabled' | 'expired';

export default function AdminStorePromoCreatePage() {
  const [code, setCode] = useState('');
  const [value, setValue] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [promoStatus, setPromoStatus] = useState<PromotionStatus>('active');
  const [promoSaving, setPromoSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreatePromo = async () => {
    setPromoSaving(true);
    setError(null);

    const payload = {
      code,
      value: Number(value),
      maxUses: maxUses ? Number(maxUses) : null,
      status: promoStatus,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
    };

    const response = await fetch('/api/admin/promotions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string; details?: string };
      if (data.error === 'invalid_payload') {
        setError('Kod ve papel paketi zorunlu.');
      } else if (data.error === 'invalid_value') {
        setError('Papel paketi 0 olamaz.');
      } else if (data.error === 'save_failed') {
        setError(`Promosyon kaydedilemedi: ${data.details ?? 'Sunucu hatası'}`);
      } else {
        setError('Promosyon kaydedilemedi.');
      }
      setPromoSaving(false);
      return;
    }

    setCode('');
    setValue('');
    setMaxUses('');
    setExpiresAt('');
    setPromoStatus('active');
    setPromoSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300">Mağaza</p>
          <h1 className="mt-2 text-2xl font-semibold">Promosyon Kodu Oluştur</h1>
          <p className="mt-1 text-sm text-white/60">Yeni promosyon kodu ve papel paketi tanımlayın.</p>
        </div>
        <Link
          href="/admin/store/promos"
          className="rounded-full border border-white/10 px-4 py-2 text-xs text-white/60 transition hover:border-white/30 hover:text-white"
        >
          Promosyon Listesi
        </Link>
      </div>

      {error && (
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-semibold">Promosyon Formu</h2>
        <div className="mt-4 grid gap-3">
          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="Kod"
            className="w-full rounded-xl border border-white/10 bg-[#0b0d12]/70 px-4 py-3 text-sm text-white/80 focus:border-indigo-400 focus:outline-none"
          />
          <div className="grid gap-3 md:grid-cols-2">
            <input
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder="Papel paketi (papel)"
              type="number"
              className="w-full rounded-xl border border-white/10 bg-[#0b0d12]/70 px-4 py-3 text-sm text-white/80 focus:border-indigo-400 focus:outline-none"
            />
            <input
              value={maxUses}
              onChange={(event) => setMaxUses(event.target.value)}
              placeholder="Limit (opsiyonel)"
              type="number"
              className="w-full rounded-xl border border-white/10 bg-[#0b0d12]/70 px-4 py-3 text-sm text-white/80 focus:border-indigo-400 focus:outline-none"
            />
            <input
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
              placeholder="Bitiş (opsiyonel)"
              type="datetime-local"
              className="w-full rounded-xl border border-white/10 bg-[#0b0d12]/70 px-4 py-3 text-sm text-white/80 focus:border-indigo-400 focus:outline-none"
            />
          </div>
          <select
            value={promoStatus}
            onChange={(event) => setPromoStatus(event.target.value as PromotionStatus)}
            className="w-full rounded-xl border border-white/10 bg-[#0b0d12]/70 px-4 py-3 text-sm text-white/80 focus:border-indigo-400 focus:outline-none"
          >
            <option value="active">Aktif</option>
            <option value="disabled">Pasif</option>
            <option value="expired">Süresi Doldu</option>
          </select>
          <button
            type="button"
            onClick={handleCreatePromo}
            disabled={promoSaving || !code || !value}
            className="rounded-xl bg-indigo-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {promoSaving ? 'Kaydediliyor...' : 'Promosyonu Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
}
