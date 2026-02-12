'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LuTrash2, LuTriangle, LuCheck, LuCircle, LuLoader } from 'react-icons/lu';

type CleanupResult = {
  logChannelsDeleted: number;
  tablesCleared: number;
  totalTables: number;
  walletsReset: number;
  ledgerEntries: number;
  errors: string[];
};

export default function ClearDataPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [accessAllowed, setAccessAllowed] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [result, setResult] = useState<CleanupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const response = await fetch('/api/developer/check-access', { credentials: 'include', cache: 'no-store' });
        if (response.ok) {
          setAccessAllowed(true);
        } else {
          router.push('/developer');
        }
      } catch {
        router.push('/developer');
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [router]);

  const handleClearData = async () => {
    if (confirmText !== 'TÜM VERİLERİ SİL') {
      setError('Lütfen onay metnini doğru girin');
      return;
    }

    setClearing(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/developer/clear-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data.results);
      } else {
        setError(data.error || 'Veri temizleme işlemi başarısız oldu');
      }
    } catch {
      setError('Bir hata oluştu');
    } finally {
      setClearing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0d12] text-white flex items-center justify-center">
        <div className="flex items-center gap-3">
          <LuLoader className="h-6 w-6 animate-spin" />
          <span>Yükleniyor...</span>
        </div>
      </div>
    );
  }

  if (!accessAllowed) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0b0d12] text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Veri Temizleme</h1>
          <p className="text-gray-400">
            Bu işlem geri alınamaz. Tüm sistem verilerini temizler.
          </p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-start gap-4 mb-6">
            <div className="flex-shrink-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-900/50">
                <LuTriangle className="h-6 w-6 text-red-400" />
              </div>
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-2 text-red-400">
                Tehlikeli İşlem
              </h2>
              <p className="text-gray-300 mb-4">
                Bu işlem aşağıdaki verileri kalıcı olarak silecektir:
              </p>
              <ul className="space-y-2 text-gray-300 mb-4">
                <li className="flex items-center gap-2">
                  <LuTrash2 className="h-4 w-4 text-red-400" />
                  Tüm Discord sunucularındaki log kanalları
                </li>
                <li className="flex items-center gap-2">
                  <LuTrash2 className="h-4 w-4 text-red-400" />
                  Tüm audit logları
                </li>
                <li className="flex items-center gap-2">
                  <LuTrash2 className="h-4 w-4 text-red-400" />
                  Tüm mağaza ürünleri ve siparişler
                </li>
                <li className="flex items-center gap-2">
                  <LuTrash2 className="h-4 w-4 text-red-400" />
                  Tüm indirimler ve promosyonlar
                </li>
                <li className="flex items-center gap-2">
                  <LuTrash2 className="h-4 w-4 text-red-400" />
                  Tüm bildirimler ve geçmiş
                </li>
                <li className="flex items-center gap-2">
                  <LuTrash2 className="h-4 w-4 text-red-400" />
                  Tüm cüzdan işlemleri (bakiyeler sıfırlanacak)
                </li>
              </ul>
              <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
                <p className="text-blue-300 font-medium mb-2">Korunan Veriler:</p>
                <ul className="text-blue-200 text-sm space-y-1">
                  <li>• Kullanıcı bilgileri (members tablosu)</li>
                  <li>• Sunucu bilgileri (servers tablosu)</li>
                  <li>• Kullanıcı-sunucu ilişkileri</li>
                </ul>
              </div>
            </div>
          </div>

          {!result && (
            <div className="border-t border-gray-700 pt-6">
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Onay için <span className="text-red-400 font-bold">TÜM VERİLERİ SİL</span> yazın:
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  placeholder="TÜM VERİLERİ SİL"
                  disabled={clearing}
                />
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg">
                  <div className="flex items-center gap-2">
                    <LuCircle className="h-5 w-5 text-red-400" />
                    <span className="text-red-300">{error}</span>
                  </div>
                </div>
              )}

              <button
                onClick={handleClearData}
                disabled={clearing || confirmText !== 'TÜM VERİLERİ SİL'}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
              >
                {clearing ? (
                  <>
                    <LuLoader className="h-5 w-5 animate-spin" />
                    Veri Temizleniyor...
                  </>
                ) : (
                  <>
                    <LuTrash2 className="h-5 w-5" />
                    Tüm Verileri Temizle
                  </>
                )}
              </button>
            </div>
          )}

          {result && (
            <div className="border-t border-gray-700 pt-6">
              <div className="flex items-center gap-3 mb-4">
                <LuCheck className="h-6 w-6 text-green-400" />
                <h3 className="text-xl font-semibold text-green-400">Temizleme Tamamlandı</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-400">{result.logChannelsDeleted}</div>
                  <div className="text-sm text-gray-400">Silinen Log Kanalı</div>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-400">{result.tablesCleared}/{result.totalTables}</div>
                  <div className="text-sm text-gray-400">Temizlenen Tablo</div>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-purple-400">{result.walletsReset}</div>
                  <div className="text-sm text-gray-400">Sıfırlanan Cüzdan</div>
                </div>
              </div>

              {result.ledgerEntries > 0 && (
                <div className="mb-4 p-3 bg-blue-900/20 border border-blue-700/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <LuCheck className="h-5 w-5 text-blue-400" />
                    <span className="text-blue-300">
                      {result.ledgerEntries} adet cüzdan hareketi kaydı eklendi
                    </span>
                  </div>
                </div>
              )}

              {result.errors.length > 0 && (
                <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-400 mb-2">Uyarılar:</h4>
                  <ul className="space-y-1 text-yellow-300 text-sm">
                    {result.errors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-6 p-4 bg-green-900/20 border border-green-700/50 rounded-lg">
                <p className="text-green-300">
                  Veri temizleme işlemi başarıyla tamamlandı. Sistem yeniden başlatılabilir.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}