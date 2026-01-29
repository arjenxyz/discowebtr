'use client';

import { useEffect, useState } from 'react';

export default function AdminSettingsPage() {
  const [threshold, setThreshold] = useState(80);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const load = async () => {
      const response = await fetch('/api/admin/settings');
      if (response.ok) {
        const data = (await response.json()) as { approval_threshold: number };
        setThreshold(data.approval_threshold ?? 80);
      }
    };

    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSuccess(false);
    const response = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approval_threshold: threshold }),
    });
    setSaving(false);
    setSuccess(response.ok);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300">Admin</p>
        <h1 className="mt-2 text-2xl font-semibold">Ayarlar</h1>
        <p className="mt-1 text-sm text-white/60">Yetkili uygunluk eşiğini yönetin.</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <label className="text-sm text-white/60">Yetkili uygunluk eşiği (%)</label>
        <input
          type="number"
          min={50}
          max={100}
          value={threshold}
          onChange={(event) => setThreshold(Number(event.target.value))}
          className="mt-3 w-full rounded-xl border border-white/10 bg-[#0b0d12]/70 px-4 py-3 text-sm text-white/80 focus:border-indigo-400 focus:outline-none"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="mt-4 rounded-xl bg-indigo-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
        {success && <p className="mt-3 text-sm text-emerald-300">Güncellendi.</p>}
      </div>
    </div>
  );
}
