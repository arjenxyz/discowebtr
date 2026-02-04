'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { siteConfig } from '@/config/site';
import { LuBot, LuExternalLink, LuArrowLeft, LuFileText, LuChevronDown, LuShieldCheck, LuList, LuMail, LuUser } from 'react-icons/lu';
import Image from 'next/image';

// Extend window interface for gtag
declare global {
  interface Window {
    gtag?: (command: string, targetId: string, config?: Record<string, unknown>) => void;
  }
}

interface DiscordUser {
  id: string;
  username: string;
  avatar: string | null;
  discriminator: string;
}

export default function BotInvitePage() {
  const router = useRouter();
  const [user] = useState<DiscordUser | null>(() => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('discordUser');
      if (storedUser) {
        try {
          return JSON.parse(storedUser);
        } catch (error) {
          console.error('Failed to parse discord user data:', error);
          return null;
        }
      }
    }
    return null;
  });
  const [avatarError, setAvatarError] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const [isProcessingAgreement, setIsProcessingAgreement] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const modalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!showAgreementModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') declineAgreement();
    };
    document.addEventListener('keydown', onKey);
    setTimeout(() => modalRef.current?.focus(), 50);
    return () => document.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAgreementModal]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);
    // Track page view
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'page_view', {
        page_title: 'Bot Invite Page',
        page_location: window.location.href
      });
    }
  }, []);

  const proceedWithInvite = () => {
    setIsInviting(true);
    const inviteUrl = siteConfig.bot.inviteUrl;
    window.open(inviteUrl, '_blank');

    // Reset button state and show success message
    setTimeout(() => {
      setIsInviting(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }, 1000);
  };

  const handleInvite = () => {
    // If user already accepted agreement, proceed
    if (typeof window !== 'undefined') {
      const accepted = localStorage.getItem('discord_agreement_accepted');
      if (accepted === 'true') {
        proceedWithInvite();
        return;
      }
    }

    // Otherwise, show agreement modal
    setShowAgreementModal(true);

    // Track button click for analytics (defer actual invite until accepted)
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'click', {
        event_category: 'engagement',
        event_label: 'bot_invite_button_open_agreement'
      });
    }
  };

  const acceptAgreement = () => {
    setIsProcessingAgreement(true);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('discord_agreement_accepted', 'true');
      }
      // proceed to invite
      proceedWithInvite();
    } finally {
      setIsProcessingAgreement(false);
      setShowAgreementModal(false);
    }
  };

  const declineAgreement = () => {
    // Redirect to home and close modal
    setShowAgreementModal(false);
    router.push('/');

    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'click', {
        event_category: 'engagement',
        event_label: 'bot_invite_declined_agreement'
      });
    }
  };

  const handleGoBack = () => {
    router.back();
  };

  const handleDocumentation = () => {
    // Track documentation click
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'click', {
        event_category: 'engagement',
        event_label: 'documentation_button'
      });
    }

    window.open('https://docs.example.com', '_blank');
  };

  const getAvatarUrl = (user: DiscordUser) => {
    if (user.avatar) {
      return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`;
    }
    const defaultAvatarNumber = parseInt(user.discriminator) % 5;
    return `https://cdn.discordapp.com/embed/avatars/${defaultAvatarNumber}.png`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b0d12] via-[#0f1117] to-[#0b0d12] text-white relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-48 h-48 sm:w-64 sm:h-64 md:w-80 md:h-80 lg:w-96 lg:h-96 bg-blue-500/5 rounded-full blur-2xl sm:blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 sm:w-64 sm:h-64 md:w-80 md:h-80 lg:w-96 lg:h-96 bg-purple-500/5 rounded-full blur-2xl sm:blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="flex items-center justify-center min-h-screen px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8 lg:py-12 relative z-10">
        <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl space-y-4 sm:space-y-6 md:space-y-8 animate-fadeIn">
          {/* Success Message */}
          {showSuccess && (
            <div className="fixed top-3 right-3 sm:top-4 sm:right-4 md:top-6 md:right-6 bg-green-500/20 border border-green-500/50 rounded-lg p-3 sm:p-4 backdrop-blur-sm animate-slideInRight shadow-lg shadow-green-500/20 z-50">
              <div className="flex items-center gap-2 sm:gap-3">
                <p className="text-xs sm:text-sm font-medium text-green-400">Davet bağlantısı açıldı!</p>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="text-center">
            {(!hydrated || !user) && (
              <div className="mx-auto mb-4 sm:mb-6 flex h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 items-center justify-center rounded-full bg-blue-600/20 border border-blue-500/30 shadow-lg shadow-blue-500/20 animate-pulse">
                <LuBot className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-blue-400" />
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 sm:p-4 md:p-6 lg:p-8 backdrop-blur-sm space-y-3 sm:space-y-4 md:space-y-6 shadow-2xl hover:border-white/20 transition-all duration-300">
            <div className="text-white/90 leading-relaxed space-y-4 sm:space-y-5 md:space-y-6">
              {hydrated && user && (
                <div className="text-center animate-scaleIn mb-3 sm:mb-4">
                  <div className="mx-auto mb-3 sm:mb-4 flex h-14 w-14 sm:h-16 sm:w-16 md:h-20 md:w-20 items-center justify-center rounded-full border-2 sm:border-3 md:border-4 border-blue-500/30 overflow-hidden shadow-lg shadow-blue-500/20 ring-2 sm:ring-3 md:ring-4 ring-blue-500/10 transition-transform hover:scale-105">
                    <Image
                      src={avatarError ? getAvatarUrl(user) : getAvatarUrl(user)}
                      alt={`${user.username} avatar`}
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                      unoptimized
                      onError={() => setAvatarError(true)}
                    />
                  </div>
                  <h2 className="text-base sm:text-lg md:text-xl font-semibold text-white bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                    {user.username}
                  </h2>
                </div>
              )}

              <div className="bg-white/5 border border-white/10 rounded-lg p-4 sm:p-5 md:p-6 hover:bg-white/10 transition-all duration-300 animate-slideInLeft">
                <div className="flex items-start gap-2 sm:gap-3">
                  <p className="text-sm sm:text-base leading-relaxed">
                    Platform verilerine erişim yetkinizin doğrulanabilmesi için botun, üyesi olduğunuz bir sunucuda aktif durumda bulunması şarttır. Mevcut kayıtlarımızda hesabınızla eşleşen bir sunucu konfigürasyonuna rastlanmamıştır.
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg p-4 sm:p-5 md:p-6 space-y-3 sm:space-y-4 hover:from-blue-500/15 hover:to-purple-500/15 transition-all duration-300 animate-slideInRight">
                <h3 className="text-blue-400 font-semibold text-base sm:text-lg border-b border-blue-500/30 pb-2 flex items-center justify-between gap-2 cursor-pointer md:cursor-default" onClick={() => setIsExpanded(!isExpanded)}>
                  Nasıl İlerleyebilirsiniz?
                  <LuChevronDown className={`h-4 w-4 sm:h-5 sm:w-5 transition-transform ${isExpanded ? 'rotate-180' : ''} md:hidden`} />
                </h3>
                <div className={`space-y-2 sm:space-y-3 ${isExpanded ? 'block' : 'hidden'} md:block`}>
                  <div className="flex items-start gap-2 sm:gap-3 group">
                    <div className="mt-0.5 sm:mt-1 h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-blue-400 flex-shrink-0 group-hover:scale-150 transition-transform" />
                    <p className="text-xs sm:text-sm leading-relaxed">
                      Hizmetlerimizi kullanmaya başlamak için botu ilgili sunucuya eklemeniz ve kurulumu tamamlamanız gerekmektedir.
                    </p>
                  </div>
                  <div className="flex items-start gap-2 sm:gap-3 group">
                    <div className="mt-0.5 sm:mt-1 h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-blue-400 flex-shrink-0 group-hover:scale-150 transition-transform" />
                    <p className="text-xs sm:text-sm leading-relaxed">
                      Gerekli izinlerin teknik gerekçelerini ve kurulum rehberini incelemek için aşağıdaki <strong className="text-blue-400">Dokümantasyon</strong> butonunu kullanabilirsiniz.
                    </p>
                  </div>
                  <div className="flex items-start gap-2 sm:gap-3 group">
                    <div className="mt-0.5 sm:mt-1 h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-blue-400 flex-shrink-0 group-hover:scale-150 transition-transform" />
                    <p className="text-xs sm:text-sm leading-relaxed">
                      İşlem sonrası tekrar giriş yaparak panelinizi aktifleştirebilirsiniz.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-3 sm:pt-4">
              <button
                onClick={handleInvite}
                disabled={isInviting}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 px-3 sm:px-4 py-2.5 sm:py-3 font-medium text-sm sm:text-base text-white transition-all duration-200 hover:from-blue-700 hover:to-blue-600 hover:shadow-lg hover:shadow-blue-500/25 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 relative overflow-hidden group"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-blue-400/0 via-blue-400/20 to-blue-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                {isInviting ? (
                  <>
                    <div className="h-3 w-3 sm:h-4 sm:w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span className="text-xs sm:text-sm">Açılıyor...</span>
                  </>
                ) : (
                  <>
                    <LuExternalLink className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="text-xs sm:text-sm">Botu Sunucuya Ekle</span>
                  </>
                )}
              </button>
              
              <button
                onClick={handleDocumentation}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/5 px-3 sm:px-4 py-2.5 sm:py-3 font-medium text-sm sm:text-base text-white transition-all duration-200 hover:bg-white/10 hover:border-white/30 hover:scale-105 active:scale-95 relative overflow-hidden group"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                <LuFileText className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="text-xs sm:text-sm">Dokümantasyon</span>
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center animate-fadeIn">
            <button
              onClick={handleGoBack}
              className="inline-flex items-center gap-1.5 sm:gap-2 text-white/60 hover:text-white transition-all duration-200 hover:gap-2 sm:hover:gap-3 group text-sm sm:text-base"
            >
              <LuArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 group-hover:-translate-x-1 transition-transform" />
              Geri Dön
            </button>
          </div>
        </div>
      </div>

      {/* Agreement Modal */}
      {showAgreementModal && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="discord-agreement-title-bot"
            tabIndex={-1}
            ref={modalRef}
            className="w-full max-w-2xl mx-4 bg-white/10 border border-white/20 rounded-lg p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-start gap-4">
              <div className="text-blue-400 mt-1">
                <LuShieldCheck className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 id="discord-agreement-title-bot" className="text-lg font-semibold text-white">Kullanıcı Sözleşmesi ve Veri Kullanımı</h3>
                <p className="text-sm text-white/70 mt-2">Kısaca: Hesabınız doğrulanacak ve hizmetimize erişim için gerekli temel bilgiler toplanacaktır.</p>
              </div>
            </div>

              <div className="mt-4 space-y-3 text-sm text-white/70">
                <p>Bu hizmet, Discord hesabınız ve sunucu verilerinizle entegre çalışmak için aşağıdaki bilgileri kullanacaktır:</p>
                <ul className="ml-0 mt-2 grid gap-2 text-sm">
                  <li className="flex items-start gap-2"><LuUser className="mt-1 text-white/60"/> <span>Discord kullanıcı kimliğiniz, takma adınız ve avatar bilgileri (hesap tanımlama için).</span></li>
                  <li className="flex items-start gap-2"><LuList className="mt-1 text-white/60"/> <span>Sunucularınızın listesi ve hangi sunucularda yönetici olduğunuz — hangi sunucularda işlem yapabileceğinizi göstermek için.</span></li>
                  <li className="flex items-start gap-2"><LuShieldCheck className="mt-1 text-white/60"/> <span>Sunucu üyelik durumunuz ve rolleriniz (yetki kontrolleri için).</span></li>
                  <li className="flex items-start gap-2"><LuList className="mt-1 text-white/60"/> <span>Sunucuya katılma bilgisi — bazı özellikler için sunucu erişimi gerekebilir.</span></li>
                  <li className="flex items-start gap-2"><LuMail className="mt-1 text-white/60"/> <span>E-posta adresiniz — hesap doğrulama, önemli bildirimler ve destek için kullanılır.</span></li>
                  <li className="flex items-start gap-2"><LuShieldCheck className="mt-1 text-white/60"/> <span>Panel içi işlemleriniz; ör. cüzdan bakiyesi, işlemler ve satın alma geçmişi.</span></li>
                </ul>

                <p className="mt-2">Bu veriler yalnızca hizmet sağlamak, hesap doğrulaması ve talep ettiğiniz özellikleri çalıştırmak için kullanılacaktır. Discord OAuth sırasında talep edilecek scope'lar (ör: identify, email, guilds, guilds.join) sadece gerekli işlemler için kullanılacaktır. Ayrıntılı gizlilik politikamız için lütfen <a href="/privacy" className="text-blue-400 underline">Gizlilik</a> sayfasını ziyaret edin.</p>

                <div className="mt-2 text-sm text-white/60">Kabul etmezseniz, giriş işlemi tamamlanmayacak ve ana sayfaya yönlendirileceksiniz.</div>

                <label className="mt-3 inline-flex items-center gap-2 text-sm text-white/80">
                  <input type="checkbox" checked={dontShowAgain} onChange={(e) => setDontShowAgain(e.target.checked)} className="h-4 w-4 rounded border-white/10 bg-black/10" />
                  <span>Bir daha gösterme</span>
                </label>
              </div>

            <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
              <button onClick={declineAgreement} className="sm:w-auto w-full rounded-md px-4 py-3 bg-white/5 border border-white/10 text-sm text-white/80 hover:bg-white/10" aria-label="Kabul etmiyorum">
                Kabul Etmiyorum — Ana Sayfaya Dön
              </button>
              <button onClick={acceptAgreement} disabled={isProcessingAgreement} className="sm:w-auto w-full rounded-md px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white text-sm font-medium hover:from-blue-700 hover:to-blue-600 disabled:opacity-50 flex items-center justify-center gap-2" aria-label="Kabul ediyorum ve devam et">
                {isProcessingAgreement ? 'İşleniyor...' : 'Kabul Ediyorum'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideInDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out;
        }

        .animate-slideInDown {
          animation: slideInDown 0.6s ease-out;
        }

        .animate-slideInLeft {
          animation: slideInLeft 0.6s ease-out;
        }

        .animate-slideInRight {
          animation: slideInRight 0.6s ease-out;
        }

        .animate-scaleIn {
          animation: scaleIn 0.6s ease-out;
        }

        .delay-1000 {
          animation-delay: 1s;
        }
      `}</style>
    </div>
  );
}