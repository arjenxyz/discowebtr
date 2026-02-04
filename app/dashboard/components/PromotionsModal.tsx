'use client';

import { useState, useEffect, useRef } from 'react';

type PromotionsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onApply: (code: string) => Promise<void>;
  loading?: boolean;
  error?: string | null;
  success?: string | null;
};

export default function PromotionsModal({ isOpen, onClose, onApply, loading, error, success }: PromotionsModalProps) {
  const [code, setCode] = useState('');
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const isLoading = localLoading || loading;

  useEffect(() => {
    if (isOpen) {
      setLocalError(null);
      setCode('');
      setTimeout(() => inputRef.current?.focus(), 0);
      // disable body scroll when modal is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const validate = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return 'Lütfen bir kod girin.';
    if (trimmed.length < 3) return 'Kod çok kısa.';
    if (trimmed.length > 100) return 'Kod çok uzun.';
    return null;
  };

  const handleSubmit = async () => {
    const validation = validate(code);
    if (validation) {
      setLocalError(validation);
      return;
    }

    setLocalLoading(true);
    setLocalError(null);
    try {
      await onApply(code.trim());
      setCode('');
    } catch {
      // caller sets error state
    } finally {
      setLocalLoading(false);
    }
  };

  const isSubmitDisabled = isLoading || Boolean(validate(code));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md px-6 pointer-events-auto" aria-hidden={!isOpen}>
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0b0d12] p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-lg font-semibold text-white">Promosyon Kodu Ekle</p>
            <p className="text-xs text-white/50">Promosyon kodunu girip hesabınıza ekleyin.</p>
          </div>
        </div>

        <div className="mt-5">
          <input
            ref={inputRef}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="PROMO2026"
            className="w-full rounded-xl border border-white/10 bg-[#0b0d12]/70 px-4 py-2 text-sm text-white/80 focus:border-indigo-400 focus:outline-none"
          />
          {(localError || error || success) && (
            <p className={`mt-2 text-xs ${(localError || error) ? 'text-rose-300' : 'text-emerald-300'}`}>{localError ?? error ?? success}</p>
          )}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 px-4 py-2 text-xs text-white transition hover:border-white/30"
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitDisabled}
            className="rounded-full bg-indigo-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? 'Kontrol ediliyor...' : 'Kodu Ekle'}
          </button>
        </div>
      </div>
    </div>
  );
} 