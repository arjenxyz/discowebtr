'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import DashboardHeader from './components/DashboardHeader';
import type { Section } from './types';
import OverviewSection from './components/OverviewSection';
import ProfileSection from './components/ProfileSection';
import StoreSection from './components/StoreSection';
import StoreTrackingSection from './components/StoreTrackingSection';
import TransactionsSection from './components/TransactionsSection';
import SettingsSection from './components/SettingsSection';
import NotificationDetailModal from './components/NotificationDetailModal';
import NotificationsModal from './components/NotificationsModal';
import TransferModal from './components/TransferModal';
import type {
  MemberProfile,
  Notification,
  Order,
  OverviewStats,
  PurchaseFeedback,
  StoreItem,
} from './types';

export default function DashboardPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [items, setItems] = useState<StoreItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [storeLoading, setStoreLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [purchaseLoadingId, setPurchaseLoadingId] = useState<string | null>(null);
  const [purchaseFeedback, setPurchaseFeedback] = useState<PurchaseFeedback>({});
  const purchaseFeedbackTimers = useRef<Record<string, ReturnType<typeof setTimeout> | undefined>>({});
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletLoading, setWalletLoading] = useState(true);
  const [overviewStats, setOverviewStats] = useState<OverviewStats | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'overview' | 'store' | 'transactions' | 'tracking' | 'notifications' | 'profile' | 'settings'>(
    'overview',
  );
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsModalOpen, setNotificationsModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeNotification, setActiveNotification] = useState<Notification | null>(null);
  const notificationsMenuRef = useRef<HTMLDivElement | null>(null);
  const settingsMenuRef = useRef<HTMLDivElement | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoSuccess, setPromoSuccess] = useState<string | null>(null);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferRecipientId, setTransferRecipientId] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [transferSuccess, setTransferSuccess] = useState<string | null>(null);
  const [maintenanceFlags, setMaintenanceFlags] = useState<Record<string, { is_active: boolean; reason: string | null; updated_by?: string | null }> | null>(null);
  const [maintenanceLoading, setMaintenanceLoading] = useState(true);
  const [maintenanceUpdaters, setMaintenanceUpdaters] = useState<Record<string, { id: string; name: string; avatarUrl: string }>>({});

  const effectiveSection = unauthorized && activeSection !== 'store' ? 'overview' : activeSection;

  useEffect(() => {
    let isMounted = true;

    const loadMaintenance = async () => {
      if (isMounted) {
        setMaintenanceLoading(true);
      }
      const response = await fetch('/api/maintenance', { cache: 'no-store' });
      if (response.ok) {
        const data = (await response.json()) as {
          flags: Record<string, { is_active: boolean; reason: string | null; updated_by?: string | null }>;
          updaterProfiles?: Record<string, { id: string; name: string; avatarUrl: string }>;
        };
        if (isMounted) {
          setMaintenanceFlags(data.flags ?? {});
          setMaintenanceUpdaters(data.updaterProfiles ?? {});
        }
      } else {
        if (isMounted) {
          setMaintenanceFlags({});
          setMaintenanceUpdaters({});
        }
      }
      if (isMounted) {
        setMaintenanceLoading(false);
      }
    };

    loadMaintenance();

    return () => {
      isMounted = false;
    };
  }, []);

  const isSiteMaintenance = Boolean(maintenanceFlags?.site?.is_active);
  const siteReason = maintenanceFlags?.site?.reason;
  const isStoreMaintenance = Boolean(maintenanceFlags?.store?.is_active);
  const storeReason = maintenanceFlags?.store?.reason;
  const isTransactionsMaintenance = Boolean(maintenanceFlags?.transactions?.is_active);
  const transactionsReason = maintenanceFlags?.transactions?.reason;
  const isTrackingMaintenance = Boolean(maintenanceFlags?.tracking?.is_active);
  const trackingReason = maintenanceFlags?.tracking?.reason;
  const isPromotionsMaintenance = Boolean(
    maintenanceFlags?.promotions?.is_active || maintenanceFlags?.discounts?.is_active,
  );
  const promotionsReason =
    maintenanceFlags?.promotions?.reason ?? maintenanceFlags?.discounts?.reason ?? null;
  const isTransfersMaintenance = Boolean(maintenanceFlags?.transfers?.is_active);
  const transfersReason = maintenanceFlags?.transfers?.reason;
  const siteUpdater = maintenanceFlags?.site?.updated_by ? maintenanceUpdaters[maintenanceFlags.site.updated_by] : null;
  const storeUpdater = maintenanceFlags?.store?.updated_by ? maintenanceUpdaters[maintenanceFlags.store.updated_by] : null;
  const transactionsUpdater = maintenanceFlags?.transactions?.updated_by
    ? maintenanceUpdaters[maintenanceFlags.transactions.updated_by]
    : null;
  const trackingUpdater = maintenanceFlags?.tracking?.updated_by
    ? maintenanceUpdaters[maintenanceFlags.tracking.updated_by]
    : null;
  const promotionsUpdater = maintenanceFlags?.promotions?.updated_by
    ? maintenanceUpdaters[maintenanceFlags.promotions.updated_by]
    : maintenanceFlags?.discounts?.updated_by
      ? maintenanceUpdaters[maintenanceFlags.discounts.updated_by]
      : null;

  useEffect(() => {
    if (!maintenanceLoading && isSiteMaintenance) {
      router.replace('/maintenance');
    }
  }, [isSiteMaintenance, maintenanceLoading, router]);

  useEffect(() => {
    const load = async () => {
      const response = await fetch('/api/notifications');
      if (response.ok) {
        const data = (await response.json()) as Notification[];
        setNotifications(data);
      }
      setLoading(false);
    };

    load();
  }, []);

  useEffect(() => {
    if (!notificationsOpen) {
      return undefined;
    }

    const handleClick = (event: MouseEvent) => {
      if (!notificationsMenuRef.current) {
        return;
      }
      if (!notificationsMenuRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
    };
  }, [notificationsOpen]);

  useEffect(() => {
    if (!settingsOpen) {
      return undefined;
    }

    const handleClick = (event: MouseEvent) => {
      if (!settingsMenuRef.current) {
        return;
      }
      if (!settingsMenuRef.current.contains(event.target as Node)) {
        setSettingsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
    };
  }, [settingsOpen]);

  useEffect(() => {
    const loadProfile = async () => {
      const response = await fetch('/api/member/profile');
      if (response.status === 401) {
        setUnauthorized(true);
        setProfileLoading(false);
        return;
      }
      if (!response.ok) {
        setProfileError('Profil bilgileri alınamadı.');
        setProfileLoading(false);
        return;
      }
      const data = (await response.json()) as MemberProfile;
      setProfile(data);
      setProfileLoading(false);
    };

    loadProfile();
  }, []);

  useEffect(() => {
    const loadPromotions = async () => {
      const response = await fetch('/api/member/store');
      if (response.ok) {
        const data = (await response.json()) as { items: StoreItem[] };
        setItems(data.items ?? []);
      }
      setStoreLoading(false);
    };

    loadPromotions();
  }, []);

  useEffect(() => {
    const loadWallet = async () => {
      const response = await fetch('/api/member/wallet');
      if (response.ok) {
        const data = (await response.json()) as { balance: number };
        setWalletBalance(Number(data.balance ?? 0));
      }
      setWalletLoading(false);
    };

    loadWallet();
  }, []);

  useEffect(() => {
    const loadOverview = async () => {
      const response = await fetch('/api/member/overview');
      if (response.ok) {
        const data = (await response.json()) as OverviewStats;
        setOverviewStats(data);
      }
      setOverviewLoading(false);
    };

    loadOverview();
  }, []);

  useEffect(() => {
    const loadOrders = async () => {
      const response = await fetch('/api/member/transactions');
      if (response.ok) {
        const data = (await response.json()) as { orders: Order[] };
        setOrders(data.orders ?? []);
      }
      setOrdersLoading(false);
    };

    loadOrders();
  }, []);

  const loginUrl = useMemo(() => {
    const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID ?? '';
    const redirectUri = process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI ?? '';
    return `https://discord.com/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri,
    )}&response_type=code&scope=identify%20guilds%20guilds.members.read`;
  }, []);

  const moneyFormatter = useMemo(
    () => new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }),
    [],
  );

  const orderStats = useMemo(() => {
    const paidTotal = orders
      .filter((order) => order.status === 'paid')
      .reduce((sum, order) => sum + order.amount, 0);
    const pendingCount = orders.filter((order) => order.status === 'pending').length;
    const refundedCount = orders.filter((order) => order.status === 'refunded').length;
    const failedCount = orders.filter((order) => order.status === 'failed').length;
    return {
      paidTotal,
      pendingCount,
      refundedCount,
      failedCount,
      totalCount: orders.length,
    };
  }, [orders]);

  const handleTransfer = async () => {
    if (isSiteMaintenance || isTransfersMaintenance) {
      setTransferError(transfersReason ?? 'Papel gönderme bakımdadır.');
      return;
    }

    setTransferError(null);
    setTransferSuccess(null);

    const amountValue = Number(transferAmount);
    if (!transferRecipientId.trim()) {
      setTransferError('Alıcı ID zorunlu.');
      return;
    }
    if (Number.isNaN(amountValue) || amountValue <= 0) {
      setTransferError('Geçerli bir miktar girin.');
      return;
    }

    setTransferLoading(true);
    const response = await fetch('/api/member/transfer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientId: transferRecipientId.trim(), amount: amountValue }),
    });
    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
      senderBalance?: number;
      taxAmount?: number;
    };

    if (!response.ok) {
      if (data.error === 'invalid_amount') {
        setTransferError('Geçersiz miktar.');
      } else if (data.error === 'self_transfer') {
        setTransferError('Kendinize transfer yapamazsınız.');
      } else if (data.error === 'insufficient_funds') {
        setTransferError('Yetersiz bakiye.');
      } else if (data.error === 'daily_limit_exceeded') {
        setTransferError('Günlük transfer limiti aşıldı.');
      } else if (data.error === 'invalid_payload') {
        setTransferError('Eksik bilgi gönderildi.');
      } else if (data.error === 'unauthorized') {
        setTransferError('Oturum gerekli.');
      } else {
        setTransferError('Transfer başarısız.');
      }
      setTransferLoading(false);
      return;
    }

    if (typeof data.senderBalance === 'number') {
      setWalletBalance(data.senderBalance);
    }
    setTransferSuccess(`Transfer tamamlandı. Kesinti: ${Number(data.taxAmount ?? 0).toFixed(2)} papel.`);
    setTransferRecipientId('');
    setTransferAmount('');
    setTransferLoading(false);
  };

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.is_read).length,
    [notifications],
  );

  const markNotificationRead = async (id: string) => {
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setNotifications((prev) => prev.map((item) => (item.id === id ? { ...item, is_read: true } : item)));
  };

  const handleOpenNotification = (item: Notification) => {
    setActiveNotification(item);
    if (!item.is_read) {
      void markNotificationRead(item.id);
    }
  };

  const renderPapelAmount = (value: number) => (
    <span className="inline-flex items-center gap-2">
      <Image src="/papel.gif" alt="papel" width={18} height={18} className="h-4 w-4" />
      <span className="text-white">{moneyFormatter.format(value)}</span>
      <span className="text-xs text-white/40">papel</span>
    </span>
  );

  const setTemporaryPurchaseFeedback = (itemId: string, status: 'success' | 'error', message: string) => {
    setPurchaseFeedback((prev) => ({ ...prev, [itemId]: { status, message } }));
    const timers = purchaseFeedbackTimers.current;
    if (timers[itemId]) {
      clearTimeout(timers[itemId]);
    }
    timers[itemId] = setTimeout(() => {
      setPurchaseFeedback((prev) => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
    }, 5000);
  };

  const formatRoleColor = (color: number) =>
    color ? `#${color.toString(16).padStart(6, '0')}` : '#64748b';

  const reloadOrders = async () => {
    setOrdersLoading(true);
    const response = await fetch('/api/member/transactions');
    if (response.ok) {
      const data = (await response.json()) as { orders: Order[] };
      setOrders(data.orders ?? []);
    }
    setOrdersLoading(false);
  };

  const handlePurchase = async (itemId: string) => {
    if (isSiteMaintenance || isStoreMaintenance) {
      setTemporaryPurchaseFeedback(itemId, 'error', storeReason ?? 'Mağaza şu anda bakımdadır.');
      return;
    }

    if (unauthorized) {
      setTemporaryPurchaseFeedback(itemId, 'error', 'Giriş yapmalısınız');
      return;
    }

    setPurchaseLoadingId(itemId);

    const response = await fetch('/api/member/purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (data.error === 'insufficient_funds') {
        setTemporaryPurchaseFeedback(itemId, 'error', 'Yetersiz bakiye');
      } else {
        setTemporaryPurchaseFeedback(itemId, 'error', 'Satın alma başarısız');
      }
      setPurchaseLoadingId(null);
      return;
    }

    const data = (await response.json().catch(() => ({}))) as { balance?: number };
    if (typeof data.balance === 'number') {
      setWalletBalance(Number(data.balance));
    }
    await reloadOrders();
    setPurchaseLoadingId(null);
    setTemporaryPurchaseFeedback(itemId, 'success', 'Satın alma başarılı');
  };

  const handleRefund = async (orderId: string) => {
    if (isSiteMaintenance || isTransactionsMaintenance) {
      await reloadOrders();
      return;
    }

    const response = await fetch('/api/member/refund', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId }),
    });

    const data = (await response.json().catch(() => ({}))) as { balance?: number };
    if (response.ok && typeof data.balance === 'number') {
      setWalletBalance(Number(data.balance));
      await reloadOrders();
      return;
    }

    await reloadOrders();
  };

  const handleApplyPromo = async () => {
    if (isSiteMaintenance || isPromotionsMaintenance) {
      setPromoError(promotionsReason ?? 'Promosyon/indirim kodları bakımdadır.');
      return;
    }

    setPromoError(null);
    setPromoSuccess(null);

    if (unauthorized) {
      setPromoError('Promosyon kodu için giriş yapmalısınız.');
      return;
    }

    if (!promoCode.trim()) {
      setPromoError('Lütfen bir promosyon kodu girin.');
      return;
    }

    setPromoLoading(true);
    const response = await fetch('/api/member/promotion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: promoCode.trim() }),
    });

    const data = (await response.json().catch(() => ({}))) as {
      amount?: number;
      balance?: number;
      error?: string;
    };
    if (!response.ok) {
      if (data.error === 'invalid_code') {
        setPromoError('Kod bulunamadı veya pasif.');
      } else if (data.error === 'expired') {
        setPromoError('Kodun süresi dolmuş.');
      } else if (data.error === 'limit_reached') {
        setPromoError('Bu promosyon kodunun limiti doldu.');
      } else {
        setPromoError('Kod doğrulanamadı.');
      }
      setPromoLoading(false);
      return;
    }

    if (typeof data.balance === 'number') {
      setWalletBalance(Number(data.balance));
    }
    setPromoSuccess(`Kod doğrulandı. ${Number(data.amount ?? 0).toFixed(2)} papel hesabınıza eklendi.`);
    setPromoLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0b0d12] text-white">
      <div className="min-h-screen">
        <DashboardHeader
          unauthorized={unauthorized}
          walletLoading={walletLoading}
          walletBalance={walletBalance}
          loginUrl={loginUrl}
          navigation={{
            activeSection: effectiveSection,
            onNavigate: setActiveSection,
          }}
          profile={
            profile
              ? {
                  name: profile.nickname ?? profile.displayName ?? profile.username,
                  username: profile.username,
                  avatarUrl: profile.avatarUrl ?? null,
                }
              : null
          }
          profileLoading={profileLoading}
          notifications={{
            open: notificationsOpen,
            unreadCount,
            loading,
            items: notifications,
            onToggle: () => setNotificationsOpen((prev) => !prev),
            onOpenModal: () => {
              setNotificationsOpen(false);
              setNotificationsModalOpen(true);
            },
            onOpenNotification: (item) => {
              handleOpenNotification(item);
              setNotificationsOpen(false);
            },
            menuRef: notificationsMenuRef,
          }}
          settings={{
            open: settingsOpen,
            onToggle: () => setSettingsOpen((prev) => !prev),
            onOpenSettings: () => {
              setActiveSection('settings');
              setSettingsOpen(false);
            },
            onOpenTransfer: () => {
              if (isSiteMaintenance || isTransfersMaintenance) {
                setTransferError(transfersReason ?? 'Papel gönderme bakımdadır.');
                setTransferSuccess(null);
                setTransferModalOpen(true);
                setSettingsOpen(false);
                return;
              }
              setTransferModalOpen(true);
              setSettingsOpen(false);
              setTransferError(null);
              setTransferSuccess(null);
            },
            logoutHref: '/api/auth/logout',
            menuRef: settingsMenuRef,
          }}
        />

        <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 pb-10 pt-24">
            {!maintenanceLoading && isSiteMaintenance && (
              <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6">
                <p className="text-sm font-semibold text-amber-200">Site bakımda</p>
                <p className="mt-2 text-sm text-amber-100/80">
                  {siteReason ?? 'Sistem geçici olarak bakıma alınmıştır. Lütfen daha sonra tekrar deneyin.'}
                </p>
                {siteUpdater && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-amber-100/70">
                    <img
                      src={siteUpdater.avatarUrl}
                      alt="avatar"
                      className="h-5 w-5 rounded-full border border-amber-200/40"
                    />
                    <span>Yetkili: {siteUpdater.name}</span>
                  </div>
                )}
              </section>
            )}
            {unauthorized && (
              <section className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6">
                <p className="text-sm font-semibold text-rose-200">Oturumunuz sonlandı</p>
                <p className="mt-2 text-sm text-rose-100/80">Lütfen tekrar giriş yapın.</p>
                <Link
                  href={loginUrl}
                  className="mt-4 inline-flex rounded-full border border-rose-300/40 px-4 py-2 text-sm text-rose-100 transition hover:border-rose-200"
                >
                  Discord ile tekrar giriş
                </Link>
              </section>
            )}
            {!isSiteMaintenance && effectiveSection === 'overview' && (
              <OverviewSection
                overviewLoading={overviewLoading}
                overviewStats={overviewStats}
                profileLoading={profileLoading}
                profileError={profileError}
                unauthorized={unauthorized}
                profile={profile}
                orderStats={orderStats}
                renderPapelAmount={renderPapelAmount}
                formatRoleColor={formatRoleColor}
              />
            )}

            {!isSiteMaintenance && effectiveSection === 'profile' && (
              <ProfileSection
                profileLoading={profileLoading}
                profileError={profileError}
                unauthorized={unauthorized}
                profile={profile}
                formatRoleColor={formatRoleColor}
              />
            )}

            {effectiveSection === 'store' && !isSiteMaintenance && isStoreMaintenance && (
              <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-sm text-amber-100/80">
                {storeReason ?? 'Mağaza geçici olarak bakımdadır.'}
                {storeUpdater && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-amber-100/70">
                    <img
                      src={storeUpdater.avatarUrl}
                      alt="avatar"
                      className="h-5 w-5 rounded-full border border-amber-200/40"
                    />
                    <span>Yetkili: {storeUpdater.name}</span>
                  </div>
                )}
              </section>
            )}
            {effectiveSection === 'store' && !isSiteMaintenance && !isStoreMaintenance && (
              <StoreSection
                storeLoading={storeLoading}
                items={items}
                purchaseLoadingId={purchaseLoadingId}
                purchaseFeedback={purchaseFeedback}
                onPurchase={handlePurchase}
                renderPapelAmount={renderPapelAmount}
              />
            )}

            {effectiveSection === 'transactions' && !isSiteMaintenance && isTransactionsMaintenance && (
              <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-sm text-amber-100/80">
                {transactionsReason ?? 'İşlemler şu anda bakımdadır.'}
                {transactionsUpdater && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-amber-100/70">
                    <img
                      src={transactionsUpdater.avatarUrl}
                      alt="avatar"
                      className="h-5 w-5 rounded-full border border-amber-200/40"
                    />
                    <span>Yetkili: {transactionsUpdater.name}</span>
                  </div>
                )}
              </section>
            )}
            {effectiveSection === 'transactions' && !isSiteMaintenance && !isTransactionsMaintenance && (
              <TransactionsSection
                ordersLoading={ordersLoading}
                orders={orders}
                orderStats={orderStats}
                onRefund={handleRefund}
                renderPapelAmount={renderPapelAmount}
              />
            )}

            {effectiveSection === 'tracking' && !isSiteMaintenance && isTrackingMaintenance && (
              <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-sm text-amber-100/80">
                {trackingReason ?? 'Mağaza takip şu anda bakımdadır.'}
                {trackingUpdater && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-amber-100/70">
                    <img
                      src={trackingUpdater.avatarUrl}
                      alt="avatar"
                      className="h-5 w-5 rounded-full border border-amber-200/40"
                    />
                    <span>Yetkili: {trackingUpdater.name}</span>
                  </div>
                )}
              </section>
            )}
            {effectiveSection === 'tracking' && !isSiteMaintenance && !isTrackingMaintenance && (
              <StoreTrackingSection
                ordersLoading={ordersLoading}
                orders={orders}
              />
            )}


            {effectiveSection === 'settings' && !isSiteMaintenance && isPromotionsMaintenance && (
              <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-sm text-amber-100/80">
                {promotionsReason ?? 'Promosyon ve indirim kodları şu anda bakımdadır.'}
                {promotionsUpdater && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-amber-100/70">
                    <img
                      src={promotionsUpdater.avatarUrl}
                      alt="avatar"
                      className="h-5 w-5 rounded-full border border-amber-200/40"
                    />
                    <span>Yetkili: {promotionsUpdater.name}</span>
                  </div>
                )}
              </section>
            )}
            {effectiveSection === 'settings' && !isSiteMaintenance && !isPromotionsMaintenance && (
              <SettingsSection
                promoCode={promoCode}
                promoError={promoError}
                promoSuccess={promoSuccess}
                promoLoading={promoLoading}
                onPromoChange={setPromoCode}
                onApplyPromo={handleApplyPromo}
              />
            )}
          </main>
        </div>
      <NotificationsModal
        open={notificationsModalOpen}
        loading={loading}
        notifications={notifications}
        activeNotification={activeNotification}
        onClose={() => {
          setNotificationsModalOpen(false);
          setActiveNotification(null);
        }}
        onOpenNotification={handleOpenNotification}
      />
      <NotificationDetailModal
        notification={activeNotification}
        onClose={() => setActiveNotification(null)}
      />
      <TransferModal
        open={transferModalOpen}
        recipientId={transferRecipientId}
        amount={transferAmount}
        loading={transferLoading}
        error={transferError}
        success={transferSuccess}
        onRecipientChange={setTransferRecipientId}
        onAmountChange={setTransferAmount}
        onClose={() => {
          setTransferModalOpen(false);
          setTransferError(null);
          setTransferSuccess(null);
        }}
        onSubmit={handleTransfer}
      />
    </div>
  );
}
