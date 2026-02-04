'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

export const dynamic = 'force-dynamic';

type StoreItem = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  status: 'active' | 'inactive';
  role_id: string | null;
  duration_days: number;
};

type RoleOption = {
  id: string;
  name: string;
  color: number;
};

function AdminStoreProductCreatePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [roleId, setRoleId] = useState('');
  const [roleQuery, setRoleQuery] = useState('');
  const [roleResults, setRoleResults] = useState<RoleOption[]>([]);
  const [roleLoading, setRoleLoading] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [selectedRoleName, setSelectedRoleName] = useState('');
  const [durationDays, setDurationDays] = useState('30');
  const [itemStatus, setItemStatus] = useState<'active' | 'inactive'>('active');
  const [itemSaving, setItemSaving] = useState(false);
  const [loadingItem, setLoadingItem] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editId) return;

    const loadItem = async () => {
      setLoadingItem(true);
      const response = await fetch('/api/admin/store-items');
      if (response.ok) {
        const data = (await response.json()) as StoreItem[];
        const item = data.find((entry) => entry.id === editId);
        if (item) {
          setTitle(item.title);
          setDescription(item.description ?? '');
          setPrice(String(item.price));
          setRoleId(item.role_id ?? '');
          setDurationDays(String(item.duration_days));
          setItemStatus(item.status);
        } else {
          setError('Düzenlenecek ürün bulunamadı.');
        }
      } else {
        setError('Ürün bilgisi alınamadı.');
      }
      setLoadingItem(false);
    };

    void loadItem();
  }, [editId]);

  useEffect(() => {
    if (!roleId) {
      const timer = setTimeout(() => {
        setSelectedRoleName('');
      }, 0);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(async () => {
      const response = await fetch(`/api/admin/roles?query=${encodeURIComponent(roleId)}&limit=5`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = (await response.json()) as RoleOption[];
        const exact = data.find((item) => item.id === roleId);
        setSelectedRoleName(exact?.name ?? '');
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [roleId]);

  useEffect(() => {
    if (!roleQuery || roleQuery.trim().length < 2) {
      const timer = setTimeout(() => {
        setRoleResults([]);
        setRoleError(null);
      }, 0);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(async () => {
      setRoleLoading(true);
      setRoleError(null);

      const response = await fetch(`/api/admin/roles?query=${encodeURIComponent(roleQuery)}&limit=20`, {
        credentials: 'include'
      });
      if (!response.ok) {
        setRoleError('Roller alınamadı.');
        setRoleResults([]);
        setRoleLoading(false);
        return;
      }

      const data = (await response.json()) as RoleOption[];
      setRoleResults(data);
      setRoleLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [roleQuery]);

  const handleCreateItem = async () => {
    setItemSaving(true);
    setError(null);

    const payload = {
      title,
      description: description || null,
      price: Number(price),
      status: itemStatus,
      roleId: roleId || null,
      durationDays: Number(durationDays),
    };

    const response = await fetch('/api/admin/store-items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include'
    });

    if (!response.ok) {
      setError('Ürün kaydedilemedi.');
      setItemSaving(false);
      return;
    }

    setTitle('');
    setDescription('');
    setPrice('');
    setRoleId('');
    setDurationDays('30');
    setItemStatus('active');
    setItemSaving(false);
  };

  const handleUpdateItem = async () => {
    if (!editId) return;
    setItemSaving(true);
    setError(null);

    const payload = {
      id: editId,
      title,
      description: description || null,
      price: Number(price),
      status: itemStatus,
      roleId: roleId || null,
      durationDays: Number(durationDays),
    };

    const response = await fetch('/api/admin/store-items', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      setError('Ürün güncellenemedi.');
      setItemSaving(false);
      return;
    }

    setItemSaving(false);
    router.push('/admin/store/products');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300">Mağaza</p>
          <h1 className="mt-2 text-2xl font-semibold">
            {editId ? 'Ürün Düzenle' : 'Yeni Ürün Oluştur'}
          </h1>
          <p className="mt-1 text-sm text-white/60">Ürün bilgilerini girip kaydedin.</p>
        </div>
        <Link
          href="/admin/store/products"
          className="rounded-full border border-white/10 px-4 py-2 text-xs text-white/60 transition hover:border-white/30 hover:text-white"
        >
          Ürün Listesi
        </Link>
      </div>

      {(error || loadingItem) && (
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
          {loadingItem ? 'Yükleniyor...' : error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold">Ürün Formu</h2>
              <p className="mt-1 text-sm text-white/60">Temel bilgileri girip rol bağlayın.</p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-white/60">
              Zorunlu: Ürün adı, Rol, Fiyat
            </span>
          </div>

          <div className="mt-6 grid gap-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/40">
                Ürün Adı
              </label>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Örn. VIP Rol"
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b0d12]/70 px-4 py-3 text-sm text-white/80 focus:border-indigo-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/40">
                Rol Adı (Sunucudan)
              </label>
              <input
                value={roleQuery}
                onChange={(event) => setRoleQuery(event.target.value)}
                placeholder="Rol adını yazıp seçin"
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b0d12]/70 px-4 py-3 text-sm text-white/80 focus:border-indigo-400 focus:outline-none"
              />
              <div className="mt-3 space-y-2">
                {roleLoading && <p className="text-xs text-white/50">Roller aranıyor...</p>}
                {roleError && <p className="text-xs text-rose-200">{roleError}</p>}
                {roleResults.length > 0 && (
                  <div className="grid gap-2 rounded-xl border border-white/10 bg-[#0b0d12]/60 p-2">
                    {roleResults.map((role) => (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => {
                          setRoleId(role.id);
                          setRoleQuery(role.name);
                          setSelectedRoleName(role.name);
                          setRoleResults([]);
                        }}
                        className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2 text-left text-xs text-white/70 transition hover:border-indigo-400/40 hover:text-white"
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: role.color ? `#${role.color.toString(16).padStart(6, '0')}` : '#6366f1' }}
                          />
                          {role.name}
                        </span>
                        <span className="text-[10px] text-white/40">{role.id}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/40">
                Rol ID (Otomatik doldurulur)
              </label>
              <input
                value={roleId}
                onChange={(event) => {
                  setRoleId(event.target.value);
                  setSelectedRoleName('');
                }}
                placeholder="Discord rol ID"
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b0d12]/70 px-4 py-3 text-sm text-white/80 focus:border-indigo-400 focus:outline-none"
              />
              <p className="mt-2 text-xs text-white/45">Rol adıyla seçebilir veya ID’yi manuel girebilirsiniz.</p>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/40">
                Açıklama
              </label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Ürün detayları ve avantajları"
                rows={4}
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b0d12]/70 px-4 py-3 text-sm text-white/80 focus:border-indigo-400 focus:outline-none"
              />
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/40">
                  Fiyat (papel)
                </label>
                <input
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  placeholder="Örn. 250"
                  type="number"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b0d12]/70 px-4 py-3 text-sm text-white/80 focus:border-indigo-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/40">
                  Süre (gün)
                </label>
                <input
                  value={durationDays}
                  onChange={(event) => setDurationDays(event.target.value)}
                  placeholder="0 = süresiz"
                  type="number"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b0d12]/70 px-4 py-3 text-sm text-white/80 focus:border-indigo-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/40">
                  Durum
                </label>
                <select
                  value={itemStatus}
                  onChange={(event) => setItemStatus(event.target.value as 'active' | 'inactive')}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b0d12]/70 px-4 py-3 text-sm text-white/80 focus:border-indigo-400 focus:outline-none"
                >
                  <option value="active">Aktif</option>
                  <option value="inactive">Pasif</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={editId ? handleUpdateItem : handleCreateItem}
                disabled={itemSaving || !title || !price || !roleId || durationDays === ''}
                className="rounded-xl bg-indigo-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {itemSaving ? 'Kaydediliyor...' : editId ? 'Güncelle' : 'Ürünü Kaydet'}
              </button>
              {editId && (
                <Link
                  href="/admin/store/products"
                  className="rounded-xl border border-white/10 px-6 py-3 text-sm text-white/70 transition hover:border-white/30 hover:text-white"
                >
                  Vazgeç
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-white/40">Hızlı İpuçları</h3>
            <ul className="mt-4 space-y-3 text-sm text-white/60">
              <li className="flex gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-indigo-400" />
                Rol ID doğru olduğunda satın alma otomatik rol atar.
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-indigo-400" />
                Süre alanına 0 yazarsanız rol kalıcı olur.
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-indigo-400" />
                Pasif ürünler listede görünür ama satın alınamaz.
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-indigo-400" />
                Rol adında en az 2 karakter yazınca eşleşmeler listelenir.
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-indigo-400" />
                Ürün açıklaması vitrinde görünür, kısa ve net yazın.
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-indigo-400" />
                Fiyat 0 veya negatif olamaz; papel cinsinden girin.
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-indigo-400" />
                Süreyi gün bazında yazın, 30 = 30 gün üyelik.
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-indigo-400" />
                Düzenleme modunda rol değiştirirseniz eski rol otomatik güncellenir.
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-500/10 via-white/5 to-transparent p-6">
            <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-white/40">Önizleme</h3>
            <div className="mt-4 rounded-xl border border-white/10 bg-[#0b0d12]/60 p-4">
              <p className="text-sm font-semibold text-white/80">{title || 'Ürün adı'}</p>
              <p className="mt-2 text-xs text-white/50">
                {description || 'Ürün açıklaması burada görünecek.'}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-white/50">
                <span className="rounded-full border border-white/10 px-2 py-1">
                  {price ? `${price} papel` : 'Fiyat belirlenmedi'}
                </span>
                <span className="rounded-full border border-white/10 px-2 py-1">
                  {durationDays === ''
                    ? 'Süre girilmedi'
                    : durationDays === '0'
                      ? 'Süresiz'
                      : `${durationDays} gün`}
                </span>
                <span className="rounded-full border border-white/10 px-2 py-1">
                  {itemStatus === 'active' ? 'Aktif' : 'Pasif'}
                </span>
                <span className="rounded-full border border-white/10 px-2 py-1">
                  {selectedRoleName
                    ? `Rol: ${selectedRoleName}`
                    : roleId
                      ? `Rol ID: ${roleId}`
                      : 'Rol seçilmedi'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminStoreProductCreatePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AdminStoreProductCreatePageContent />
    </Suspense>
  );
}
