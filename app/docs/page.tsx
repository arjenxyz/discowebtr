'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  LuBook,
  LuSettings,
  LuUsers,
  LuShoppingCart,
  LuChartBar,
  LuShield,
  LuMessageSquare,
  LuChevronDown,
  LuChevronRight,
  LuExternalLink,
  LuBot,
  LuGlobe
} from 'react-icons/lu';

interface DocSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
  subsections?: DocSubsection[];
  accessLevel?: 'user' | 'admin' | 'all'; // Yeni özellik
}

interface DocSubsection {
  id: string;
  title: string;
  content: React.ReactNode;
  accessLevel?: 'user' | 'admin' | 'all'; // Yeni özellik
}

export default function DocsPage() {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['getting-started']));
  // Şimdilik mock - gerçek uygulamada auth context'ten alınacak
  const [userRole] = useState<'user' | 'admin'>('user'); // Test için 'user' olarak ayarlandı

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  // Kullanıcının erişebileceği bölümleri filtrele
  const getAccessibleSections = (sections: DocSection[]) => {
    return sections.filter(section => {
      const level = section.accessLevel || 'all';
      if (level === 'all') return true;
      if (level === 'user' && userRole === 'user') return true;
      if (level === 'admin' && userRole === 'admin') return true;
      return false;
    }).map(section => ({
      ...section,
      subsections: section.subsections?.filter(sub => {
        const level = sub.accessLevel || 'all';
        if (level === 'all') return true;
        if (level === 'user' && userRole === 'user') return true;
        if (level === 'admin' && userRole === 'admin') return true;
        return false;
      })
    }));
  };

  const docSections: DocSection[] = [
    {
      id: 'getting-started',
      title: 'Başlarken',
      icon: <LuBook className="w-5 h-5" />,
      accessLevel: 'all',
      content: (
        <div className="space-y-4">
          <p className="text-gray-300">
            DiscoWeb, Discord sunucularınız için kapsamlı bir yönetim ve ekonomi sistemidir.
            Bu dokümantasyon, sistemin temel özelliklerini ve kullanımını açıklamaktadır.
          </p>
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
            <h4 className="font-semibold text-blue-400 mb-2">⚡ Hızlı Başlangıç</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-gray-300">
              <li>Discord hesabınızla giriş yapın</li>
              <li>Sunucu seçin</li>
              <li>Kuralları kabul edin</li>
              <li>Profilinizi oluşturun</li>
              <li>Mağazadan alışveriş yapın</li>
            </ol>
          </div>
        </div>
      ),
      subsections: [
        {
          id: 'user-registration',
          title: 'Üye Kaydı',
          accessLevel: 'all',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Sunucuya katılmak ve sistem özelliklerinden faydalanmak için üye kaydı yapmanız gerekir.
              </p>
              <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                <h5 className="font-semibold text-green-400 mb-2">📝 Kayıt Adımları</h5>
                <ol className="list-decimal list-inside space-y-1 text-sm text-gray-300">
                  <li>Web sitesine gidin</li>
                  <li>Discord ile giriş yapın</li>
                  <li>Sunucu seçin</li>
                  <li>Kuralları okuyup kabul edin</li>
                  <li>Verify rolü alın</li>
                  <li>Profil bilgilerinizi doldurun</li>
                </ol>
              </div>
            </div>
          )
        },
        {
          id: 'bot-invite',
          title: 'Bot Davet Etme',
          accessLevel: 'admin',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Botu sunucunuza davet etmek için aşağıdaki linki kullanın:
              </p>
              <a
                href="https://discord.com/api/oauth2/authorize?client_id=1465696408656023698&permissions=8&scope=bot%20applications.commands"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                <LuBot className="w-4 h-4" />
                Botu Davet Et
                <LuExternalLink className="w-4 h-4" />
              </a>
              <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
                <h5 className="font-semibold text-yellow-400 mb-2">⚠️ Gerekli İzinler</h5>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Administrator - Tam yönetim erişimi</li>
                  <li>• Manage Channels - Kanal oluşturma/düzenleme</li>
                  <li>• Manage Roles - Rol yönetimi</li>
                  <li>• View Audit Log - Denetim kaydı görüntüleme</li>
                  <li>• Send Messages - Mesaj gönderme</li>
                  <li>• Embed Links - Embed mesajları gönderme</li>
                </ul>
              </div>
            </div>
          )
        },
        {
          id: 'web-login',
          title: 'Web Paneli Girişi',
          accessLevel: 'admin',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Web paneline erişmek için Discord hesabınızla giriş yapmanız gerekir.
              </p>
              <ol className="list-decimal list-inside space-y-2 text-gray-300">
                <li>Web sitesine gidin: <code className="bg-gray-800 px-2 py-1 rounded text-sm">discnexus.vercel.app</code></li>
                <li>&quot;Discord ile Giriş&quot; butonuna tıklayın</li>
                <li>Discord yetkilendirme ekranında izinleri onaylayın</li>
                <li>Sunucu seçin ve yönetim paneline erişin</li>
              </ol>
              <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                <h5 className="font-semibold text-green-400 mb-2">✅ Giriş Gereksinimleri</h5>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Discord hesabınızın olması</li>
                  <li>• Botun bulunduğu sunucuda üye olmak</li>
                  <li>• Sunucuda admin yetkisine sahip olmak</li>
                </ul>
              </div>
            </div>
          )
        }
      ]
    },
    {
      id: 'setup',
      title: 'Kurulum ve Yapılandırma',
      icon: <LuSettings className="w-5 h-5" />,
      accessLevel: 'admin',
      content: (
        <div className="space-y-4">
          <p className="text-gray-300">
            Botun düzgün çalışması için gerekli ayarları yapın.
          </p>
        </div>
      ),
      subsections: [
        {
          id: 'slash-commands',
          title: 'Slash Komutları',
          accessLevel: 'admin',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Botun temel komutlarını kullanarak sunucuyu yapılandırın.
              </p>
              <div className="bg-gray-800 rounded-lg p-4 font-mono text-sm">
                <div className="text-green-400 mb-2">/setup</div>
                <p className="text-gray-300 mb-4">Sunucu için temel ayarları yapar.</p>

                <div className="text-blue-400 mb-2">Parametreler:</div>
                <ul className="text-gray-300 space-y-1 mb-4">
                  <li><code>web_admin_rol</code> - Web paneli yönetecek admin rolü (zorunlu)</li>
                  <li><code>web_verify_rol</code> - Web&apos;e kayıt olan kullanıcılara verilecek rol (zorunlu)</li>
                </ul>

                <div className="text-yellow-400 mb-2">Örnek:</div>
                <code className="text-gray-300">/setup web_admin_rol:@Admin web_verify_rol:@Üye</code>
              </div>
            </div>
          )
        },
        {
          id: 'log-channels',
          title: 'Log Kanalları',
          accessLevel: 'admin',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Sistem olaylarını takip etmek için log kanallarını ayarlayın.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h5 className="font-semibold text-blue-400 mb-2">📋 Ana Log</h5>
                  <p className="text-sm text-gray-300">Genel sistem olayları</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h5 className="font-semibold text-green-400 mb-2">🔐 Auth Log</h5>
                  <p className="text-sm text-gray-300">Giriş/çıkış olayları</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h5 className="font-semibold text-purple-400 mb-2">👑 Roles Log</h5>
                  <p className="text-sm text-gray-300">Rol değişiklikleri</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h5 className="font-semibold text-red-400 mb-2">⚙️ System Log</h5>
                  <p className="text-sm text-gray-300">Sistem hataları</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h5 className="font-semibold text-orange-400 mb-2">🛒 Store Log</h5>
                  <p className="text-sm text-gray-300">Mağaza işlemleri</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h5 className="font-semibold text-cyan-400 mb-2">💰 Wallet Log</h5>
                  <p className="text-sm text-gray-300">Cüzdan işlemleri</p>
                </div>
              </div>
            </div>
          )
        },
        {
          id: 'permissions',
          title: 'İzinler ve Roller',
          accessLevel: 'admin',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Botun düzgün çalışması için gerekli roller ve izinleri ayarlayın.
              </p>
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                <h5 className="font-semibold text-red-400 mb-2">⚠️ Kritik Roller</h5>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li><strong>Admin Rolü:</strong> Web paneli erişimi ve bot yönetimi</li>
                  <li><strong>Verify Rolü:</strong> Web kaydı onaylanmış kullanıcılar</li>
                  <li><strong>Bot Rolü:</strong> Botun rolü en üstte olmalı</li>
                </ul>
              </div>
            </div>
          )
        }
      ]
    },
    {
      id: 'user-management',
      title: 'Kullanıcı Yönetimi',
      icon: <LuUsers className="w-5 h-5" />,
      accessLevel: 'all',
      content: (
        <div className="space-y-4">
          <p className="text-gray-300">
            Kullanıcıların kayıt, profil ve para yönetimi.
          </p>
        </div>
      ),
      subsections: [
        {
          id: 'registration',
          title: 'Kayıt Sistemi',
          accessLevel: 'all',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Kullanıcıların web paneli üzerinden kayıt olması.
              </p>
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                <h5 className="font-semibold text-blue-400 mb-2">📝 Kayıt Adımları</h5>
                <ol className="list-decimal list-inside space-y-1 text-sm text-gray-300">
                  <li>Web paneline Discord ile giriş</li>
                  <li>Sunucu seçimi</li>
                  <li>Kuralları kabul etme</li>
                  <li>Verify rolü alma</li>
                  <li>Profil oluşturma</li>
                </ol>
              </div>
            </div>
          )
        },
        {
          id: 'economy',
          title: 'Ekonomi Sistemi',
          accessLevel: 'all',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Ses ve mesaj aktivitelerine göre para kazanma sistemi.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                  <h5 className="font-semibold text-green-400 mb-2">🎤 Ses Kazanç</h5>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>• Dakika başı: 0.2 Disc</li>
                    <li>• Minimum süre: 5 dakika</li>
                    <li>• AFK kanallarında kazanılmaz</li>
                  </ul>
                </div>
                <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                  <h5 className="font-semibold text-blue-400 mb-2">💬 Mesaj Kazanç</h5>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>• Mesaj başı: 0.2 Disc</li>
                    <li>• Spam koruması aktif</li>
                    <li>• Komut mesajları kazanmaz</li>
                  </ul>
                </div>
              </div>
            </div>
          )
        }
      ]
    },
    {
      id: 'store',
      title: 'Mağaza Sistemi',
      icon: <LuShoppingCart className="w-5 h-5" />,
      accessLevel: 'all',
      content: (
        <div className="space-y-4">
          <p className="text-gray-300">
            Rol satışı ve promosyon yönetimi.
          </p>
        </div>
      ),
      subsections: [
        {
          id: 'products',
          title: 'Ürün Yönetimi',
          accessLevel: 'admin',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Mağaza ürünlerini ekleme ve düzenleme.
              </p>
              <div className="bg-gray-800 rounded-lg p-4">
                <h5 className="font-semibold text-white mb-2">Ürün Özellikleri</h5>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li><strong>Başlık:</strong> Ürün adı</li>
                  <li><strong>Açıklama:</strong> Detaylı açıklama</li>
                  <li><strong>Fiyat:</strong> Disc cinsinden</li>
                  <li><strong>Süre:</strong> Rol süresi (gün)</li>
                  <li><strong>Rol:</strong> Verilecek Discord rolü</li>
                  <li><strong>Durum:</strong> Aktif/Pasif</li>
                </ul>
              </div>
            </div>
          )
        },
        {
          id: 'orders',
          title: 'Sipariş Yönetimi',
          accessLevel: 'admin',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Siparişlerin takibi ve yönetimi.
              </p>
              <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
                <h5 className="font-semibold text-yellow-400 mb-2">📋 Sipariş Durumları</h5>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li><strong>Paid:</strong> Ödeme tamamlandı</li>
                  <li><strong>Pending:</strong> İşleniyor</li>
                  <li><strong>Refunded:</strong> İade edildi</li>
                  <li><strong>Failed:</strong> Başarısız</li>
                </ul>
              </div>
            </div>
          )
        }
      ]
    },
    {
      id: 'analytics',
      title: 'İstatistikler ve Analiz',
      icon: <LuChartBar className="w-5 h-5" />,
      accessLevel: 'admin',
      content: (
        <div className="space-y-4">
          <p className="text-gray-300">
            Sunucu aktivitelerinin detaylı analizi.
          </p>
        </div>
      ),
      subsections: [
        {
          id: 'user-stats',
          title: 'Kullanıcı İstatistikleri',
          accessLevel: 'all',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Her kullanıcının aktivite verileri.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-400">💬</div>
                  <div className="text-sm text-gray-300">Toplam Mesaj</div>
                </div>
                <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-400">🎤</div>
                  <div className="text-sm text-gray-300">Ses Dakikası</div>
                </div>
                <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-400">💰</div>
                  <div className="text-sm text-gray-300">Toplam Kazanç</div>
                </div>
              </div>
            </div>
          )
        },
        {
          id: 'server-stats',
          title: 'Sunucu İstatistikleri',
          accessLevel: 'admin',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Genel sunucu aktivite özeti.
              </p>
              <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
                <h5 className="font-semibold text-purple-400 mb-2">📊 Günlük Raporlar</h5>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Günlük mesaj sayısı</li>
                  <li>• Toplam ses aktivitesi</li>
                  <li>• Yeni üye sayısı</li>
                  <li>• Mağaza satışları</li>
                </ul>
              </div>
            </div>
          )
        }
      ]
    },
    {
      id: 'security',
      title: 'Güvenlik ve Moderasyon',
      icon: <LuShield className="w-5 h-5" />,
      accessLevel: 'admin',
      content: (
        <div className="space-y-4">
          <p className="text-gray-300">
            Sistem güvenliği ve şüpheli aktivitelerin takibi.
          </p>
        </div>
      ),
      subsections: [
        {
          id: 'suspicious-activity',
          title: 'Şüpheli Aktiviteler',
          accessLevel: 'admin',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Otomatik şüpheli aktivite tespiti.
              </p>
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                <h5 className="font-semibold text-red-400 mb-2">🚨 Tespit Edilen Aktiviteler</h5>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Spam mesajları</li>
                  <li>• Hızlı rol değişiklikleri</li>
                  <li>• Şüpheli para transferleri</li>
                  <li>• Bot hesapları</li>
                </ul>
              </div>
            </div>
          )
        },
        {
          id: 'audit-logs',
          title: 'Denetim Kayıtları',
          accessLevel: 'admin',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Tüm sistem olaylarının detaylı kayıtları.
              </p>
              <div className="bg-gray-800 rounded-lg p-4">
                <h5 className="font-semibold text-white mb-2">Log Kategorileri</h5>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>• Sistem hataları</div>
                  <div>• Kullanıcı işlemleri</div>
                  <div>• Rol değişiklikleri</div>
                  <div>• Mağaza işlemleri</div>
                  <div>• Para transferleri</div>
                  <div>• Admin işlemleri</div>
                </div>
              </div>
            </div>
          )
        }
      ]
    },
    {
      id: 'api',
      title: 'API ve Entegrasyon',
      icon: <LuGlobe className="w-5 h-5" />,
      accessLevel: 'admin',
      content: (
        <div className="space-y-4">
          <p className="text-gray-300">
            Harici sistemlerle entegrasyon ve API kullanımı.
          </p>
        </div>
      ),
      subsections: [
        {
          id: 'webhooks',
          title: 'Webhook Entegrasyonu',
          accessLevel: 'admin',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Discord webhook&apos;ları ile harici servisler.
              </p>
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                <h5 className="font-semibold text-blue-400 mb-2">🔗 Webhook Özellikleri</h5>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Otomatik log gönderimi</li>
                  <li>• Özel embed mesajları</li>
                  <li>• Gerçek zamanlı bildirimler</li>
                  <li>• Güvenli token yönetimi</li>
                </ul>
              </div>
            </div>
          )
        },
        {
          id: 'rest-api',
          title: 'REST API',
          accessLevel: 'admin',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Sistem verilerine programatik erişim.
              </p>
              <div className="bg-gray-800 rounded-lg p-4 font-mono text-sm">
                <div className="text-green-400 mb-2">GET /api/member/profile</div>
                <p className="text-gray-300 mb-4">Kullanıcı profili bilgilerini alır.</p>

                <div className="text-blue-400 mb-2">Headers:</div>
                <code className="text-gray-300 block mb-4">
                  Authorization: Bearer {'<token>'}
                </code>

                <div className="text-yellow-400 mb-2">Response:</div>
                <pre className="text-gray-300 text-xs bg-gray-900 p-2 rounded overflow-x-auto">
{`{
  "id": "user_id",
  "balance": 150.50,
  "totalMessages": 1250,
  "totalVoiceMinutes": 480
}`}
                </pre>
              </div>
            </div>
          )
        }
      ]
    },
    {
      id: 'troubleshooting',
      title: 'Sorun Giderme',
      icon: <LuMessageSquare className="w-5 h-5" />,
      accessLevel: 'all',
      content: (
        <div className="space-y-4">
          <p className="text-gray-300">
            Sık karşılaşılan sorunlar ve çözümleri.
          </p>
        </div>
      ),
      subsections: [
        {
          id: 'common-issues',
          title: 'Sık Karşılaşılan Sorunlar',
          accessLevel: 'all',
          content: (
            <div className="space-y-4">
              <div className="space-y-4">
                <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                  <h5 className="font-semibold text-red-400 mb-2">❌ Bot Cevap Vermiyor</h5>
                  <p className="text-sm text-gray-300 mb-2">Çözüm:</p>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>• Botun online olduğundan emin olun</li>
                    <li>• İzinlerin doğru verildiğini kontrol edin</li>
                    <li>• Slash komutlarını yeniden yükleyin</li>
                  </ul>
                </div>

                <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
                  <h5 className="font-semibold text-yellow-400 mb-2">⚠️ Kazanç Gelmiyor</h5>
                  <p className="text-sm text-gray-300 mb-2">Çözüm:</p>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>• Kullanıcının kayıtlı olduğunu kontrol edin</li>
                    <li>• Ses kanalında 5+ dakika bekleyin</li>
                    <li>• Spam koruması aktif olmayacak</li>
                  </ul>
                </div>

                <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                  <h5 className="font-semibold text-blue-400 mb-2">🔄 Reset Sistemi</h5>
                  <p className="text-sm text-gray-300 mb-2">Tam temizlik için:</p>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>• <code>/reset</code> komutunu kullanın</li>
                    <li>• Tüm veriler silinir</li>
                    <li>• Yeniden kurulum gerekir</li>
                  </ul>
                </div>
              </div>
            </div>
          )
        },
        {
          id: 'support',
          title: 'Destek ve Yardım',
          accessLevel: 'all',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Sorunlarınız için destek kanallarımız.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <a
                  href="https://discord.gg/discnexus"
                  className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg transition-colors text-center"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <LuMessageSquare className="w-6 h-6 mx-auto mb-2" />
                  <div className="font-semibold">Discord Destek</div>
                  <div className="text-sm opacity-90">Anında yardım</div>
                </a>
                <a
                  href="https://github.com/discnexus/docs"
                  className="bg-gray-600 hover:bg-gray-700 text-white p-4 rounded-lg transition-colors text-center"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <LuBook className="w-6 h-6 mx-auto mb-2" />
                  <div className="font-semibold">GitHub Issues</div>
                  <div className="text-sm opacity-90">Hata raporları</div>
                </a>
                <Link
                  href="/contact"
                  className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-lg transition-colors text-center"
                >
                  <LuMessageSquare className="w-6 h-6 mx-auto mb-2" />
                  <div className="font-semibold">İletişim</div>
                  <div className="text-sm opacity-90">Genel sorular</div>
                </Link>
              </div>
            </div>
          )
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#0b0d12] text-white">
      {/* Header */}
      <div className="bg-[#1a1d23] border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <LuBook className="w-8 h-8 text-blue-400" />
            <div>
              <h1 className="text-2xl font-bold">Veri Merkezi Dokümantasyonu</h1>
              <p className="text-gray-400">Kapsamlı kullanım kılavuzu</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <div className="sticky top-8">
              <div className="bg-[#1a1d23] rounded-lg p-4 border border-white/10 mb-6">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                  <LuBook className="w-4 h-4" />
                  İçindekiler
                </h3>
                <nav className="space-y-1">
                  {getAccessibleSections(docSections).map((section) => (
                    <div key={section.id}>
                      <button
                        onClick={() => toggleSection(section.id)}
                        className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors text-left text-sm"
                      >
                        {section.icon}
                        <span className="font-medium">{section.title}</span>
                        {expandedSections.has(section.id) ? (
                          <LuChevronDown className="w-4 h-4 ml-auto" />
                        ) : (
                          <LuChevronRight className="w-4 h-4 ml-auto" />
                        )}
                      </button>
                      {expandedSections.has(section.id) && section.subsections && section.subsections.length > 0 && (
                        <div className="ml-4 space-y-1 mt-1">
                          {section.subsections.map((subsection) => (
                            <a
                              key={subsection.id}
                              href={`#${subsection.id}`}
                              className="block p-2 rounded-lg hover:bg-white/5 transition-colors text-xs text-gray-400 hover:text-white pl-6"
                            >
                              {subsection.title}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </nav>
              </div>

              {/* Quick Links */}
              <div className="bg-[#1a1d23] rounded-lg p-4 border border-white/10">
                <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                  <LuGlobe className="w-4 h-4" />
                  Hızlı Bağlantılar
                </h4>
                <div className="space-y-2">
                  <Link
                    href="/dashboard"
                    className="block p-2 rounded-lg hover:bg-white/5 transition-colors text-sm text-gray-400 hover:text-white"
                  >
                    🏠 Dashboard
                  </Link>
                  <Link
                    href="/contact"
                    className="block p-2 rounded-lg hover:bg-white/5 transition-colors text-sm text-gray-400 hover:text-white"
                  >
                    📞 İletişim
                  </Link>
                  <a
                    href="https://discord.gg/invite-link"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-2 rounded-lg hover:bg-white/5 transition-colors text-sm text-gray-400 hover:text-white"
                  >
                    💬 Destek Sunucusu
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 order-1 lg:order-2 space-y-6">
            {getAccessibleSections(docSections).map((section) => (
              <div key={section.id} className={expandedSections.has(section.id) ? '' : 'hidden'}>
                {/* Ana Bölüm */}
                <div className="bg-[#1a1d23] rounded-lg p-6 border border-white/10 shadow-lg">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-blue-600/20 rounded-lg">
                      {section.icon}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">{section.title}</h2>
                      <div className="w-12 h-1 bg-blue-500 rounded-full mt-1"></div>
                    </div>
                  </div>
                  <div className="prose prose-invert max-w-none">
                    {section.content}
                  </div>
                </div>

                {/* Alt Bölümler */}
                {section.subsections && section.subsections.length > 0 && (
                  <div className="space-y-4 mt-6">
                    {section.subsections.map((subsection) => (
                      <div key={subsection.id} id={subsection.id} className="bg-[#1a1d23] rounded-lg p-6 border border-white/10 shadow-lg">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-sm">
                              {subsection.title.charAt(0)}
                            </span>
                          </div>
                          <h3 className="text-xl font-semibold text-white">{subsection.title}</h3>
                        </div>
                        <div className="prose prose-invert max-w-none">
                          {subsection.content}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}