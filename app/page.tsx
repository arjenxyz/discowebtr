'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabaseClient';

const NAV_LINKS = [
  { label: 'Paneller', href: '#paneller' },
  { label: 'Sistem', href: '#sistem' },
  { label: 'Özellikler', href: '#ozellikler' },
  { label: 'Senaryolar', href: '#senaryolar' },
  { label: 'SSS', href: '#sss' },
];

const CORE_FEATURES = [
  {
    title: 'Rol Mağazası ve İndirimler',
    description:
      'Sunucudaki mağaza verisini web ile eşitleyin. Üyelere özel indirimler ve dinamik kampanyalar sunun.',
  },
  {
    title: 'Promosyon Kodları ve Çekiliş',
    description:
      'Çekilişlerden çıkan kodları sunucu parasına çeviren otomatik promosyon sistemi.',
  },
  {
    title: 'AI Dedektiflik Sistemi',
    description:
      'Ban, mute, kick senaryoları ile adayları eğitin, doğruluk oranına göre yetkilendirin.',
  },
];

const PLATFORM_FEATURES = [
  'Role dayalı erişim kontrolü',
  'Sunucu ekonomisi ile tam entegrasyon',
  'Gerçek zamanlı log ve bildirim akışı',
  'Ölçülebilir aday performans metrikleri',
  'Esnek kampanya ve kupon yönetimi',
  'Takım içi onay mekanizmaları',
];

const PANEL_CARDS = [
  {
    title: 'Admin Paneli',
    description:
      'Bakım, log, bildirim ve mağaza akışlarını tek merkezden yönetin. Tüm sistem sağlığı aynı ekranda.',
    items: ['Bakım yönetimi', 'Yetki & rol doğrulama', 'Log kanalları', 'Bildirim yayınları'],
    cta: { label: 'Admin paneli', href: '/admin' },
  },
  {
    title: 'Üye Paneli',
    description:
      'Üyeler tek panelden bakiye, transfer, satın alma ve promosyon akışlarını takip eder.',
    items: ['Cüzdan & transfer', 'Mağaza & promosyonlar', 'İşlem geçmişi', 'Bildirimler'],
    cta: { label: 'Üye paneli', href: '/dashboard' },
  },
];

const SCENARIOS = [
  {
    title: 'Yetkili Adayı Seçimi',
    description:
      'Doğruluk oranı %80 üzerindeki adaylar başvuru açabilir. Zayıf alanlar için otomatik eğitim akışı.',
  },
  {
    title: 'Olay İnceleme',
    description:
      'AI destekli olay akışları, moderasyon kararlarının kalitesini ölçer ve geri bildirim üretir.',
  },
  {
    title: 'Ödül & Ekonomi',
    description:
      'Promosyon kodları, puan dönüşümleri ve rol ödülleri tek panelde yönetilir.',
  },
];

const FAQS = [
  {
    question: 'Sistem sadece panelde mi çalışıyor?',
    answer:
      'Operasyonel süreçler dashboard üzerinden yönetilir, ancak bu sayfa ürünün dış vitrinidir.',
  },
  {
    question: 'Sunucu mağazası ile eşleşme nasıl sağlanır?',
    answer:
      'Bot servisimiz mağaza, çekiliş ve ekonomi verilerini güvenli şekilde senkronize eder.',
  },
  {
    question: 'AI dedektiflik kurguları özelleştirilebilir mi?',
    answer:
      'Evet. Sunucu kurallarınıza uygun senaryolar ve başarı eşikleri belirlenir.',
  },
  {
    question: 'Yetkili alımları otomatik onaylanır mı?',
    answer:
      'Son onay sizdedir. Sistem sadece adayları puanlar ve önerir.',
  },
];

type PublicMetrics = {
  id: string;
  server_name: string;
  slug: string;
  store_revenue: number;
  active_promotions: number;
  eligible_candidates: number;
  ai_moderation_accuracy: number;
  ai_training_accuracy: number;
  processed_scenarios: number;
  approval_threshold: number;
  updated_at: string;
};

const FALLBACK_METRICS: PublicMetrics = {
  id: 'default',
  server_name: 'Disc Nexus',
  slug: 'default',
  store_revenue: 284600,
  active_promotions: 36,
  eligible_candidates: 128,
  ai_moderation_accuracy: 87.4,
  ai_training_accuracy: 91.2,
  processed_scenarios: 50000,
  approval_threshold: 80,
  updated_at: new Date().toISOString(),
};

export default function Home() {
  const CLIENT_ID = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
  const REDIRECT_URI = process.env.NEXT_PUBLIC_REDIRECT_URI;
  const loginUrl = CLIENT_ID && REDIRECT_URI
    ? `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(
        REDIRECT_URI,
      )}&response_type=code&scope=identify`
    : '#basla';

  const supabase = useMemo(() => getSupabaseClient(), []);
  const [metrics, setMetrics] = useState<PublicMetrics>(FALLBACK_METRICS);
  const [metricsReady, setMetricsReady] = useState(false);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let active = true;

    const syncMetrics = async () => {
      const { data } = await supabase
        .from('public_metrics')
        .select('*')
        .eq('slug', 'default')
        .single();

      if (active && data) {
        setMetrics(data as PublicMetrics);
        setMetricsReady(true);
      }
    };

    syncMetrics();

    const channel = supabase
      .channel('public_metrics_updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'public_metrics', filter: 'slug=eq.default' },
        (payload) => {
          if (!active) {
            return;
          }
          if (payload.new) {
            setMetrics(payload.new as PublicMetrics);
            setMetricsReady(true);
          }
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(
      value,
    );
  const formatPercent = (value: number) => `%${value.toFixed(1)}`;

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#0b0d12] text-white">
      <div className="absolute inset-0 -z-10">
        <div className="absolute -top-40 -left-28 h-[480px] w-[480px] rounded-full bg-indigo-500/20 blur-[180px]" />
        <div className="absolute top-20 right-[-160px] h-[420px] w-[420px] rounded-full bg-purple-500/10 blur-[180px]" />
        <div className="absolute bottom-0 left-1/2 h-[540px] w-[540px] -translate-x-1/2 rounded-full bg-sky-500/10 blur-[200px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.06),_transparent_55%)]" />
      </div>

      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-[#0b0d12]/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-6 md:px-10">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5">
              <div className="h-3 w-3 rounded-sm bg-gradient-to-br from-white to-indigo-300" />
            </div>
            <span className="text-xs font-semibold tracking-[0.3em] text-white/80">DISC NEXUS</span>
          </div>

          <nav className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-xs font-medium uppercase tracking-[0.2em] text-white/60 transition-colors hover:text-white"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="#basla"
              className="hidden rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-white/70 transition hover:border-white/30 hover:text-white md:inline-flex"
            >
              Demo İste
            </Link>
            <Link
              href={loginUrl}
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#0b0d12] transition hover:bg-white/90"
            >
              Discord ile Bağlan
              <span className="text-sm">→</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-24 px-6 pb-24 pt-28 md:px-10">
        <section className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white/70">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
              Admin ve üye panelleri tek akışta
            </div>
            <h1 className="text-4xl font-semibold leading-tight text-white md:text-6xl">
              Sunucu yönetimi, bakım ve ekonomi akışları için yeni nesil kontrol merkezi.
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-white/70">
              Admin panelinde operasyonu yönetin, üye panelinde deneyimi sadeleştirin.
              Bot ve web senkronizasyonu ile tüm süreci tek yerden izleyin.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                href={loginUrl}
                className="rounded-full bg-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_12px_32px_rgba(99,102,241,0.45)] transition hover:bg-indigo-400"
              >
                {metricsReady ? 'Hemen Başlayın' : 'Veri senkronize ediliyor...'}
              </Link>
              <Link
                href="#sistem"
                className="rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white/80 transition hover:border-white/30 hover:text-white"
              >
                Sistemi Keşfedin
              </Link>
            </div>
            <div className="flex flex-wrap gap-6 text-xs text-white/50">
              <div>
                <p className="text-lg font-semibold text-white">
                  %{metrics.approval_threshold}+
                </p>
                Yetkili uygunluk eşiği
              </div>
              <div>
                <p className="text-lg font-semibold text-white">24/7</p>
                Moderasyon akışı
              </div>
              <div>
                <p className="text-lg font-semibold text-white">
                  {metrics.processed_scenarios.toLocaleString('tr-TR')}+
                </p>
                İşlenen senaryo
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 rounded-[32px] bg-gradient-to-br from-indigo-500/20 via-transparent to-fuchsia-500/20 blur-2xl" />
            <div className="relative rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.45)]">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="text-sm font-semibold text-white">{metrics.server_name} Admin Paneli</p>
                  <p className="text-xs text-white/50">Gerçek zamanlı</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="text-xs text-white/60">Canlı</span>
                </div>
              </div>
              <div className="mt-6 grid gap-4">
                <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-4">
                  <p className="text-xs text-white/50">Rol mağazası geliri</p>
                  <p className="text-2xl font-semibold">
                    {formatCurrency(metrics.store_revenue)}
                  </p>
                  <div className="mt-3 h-2 w-full rounded-full bg-white/10">
                    <div className="h-2 w-3/4 rounded-full bg-indigo-400" />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs text-white/50">Aktif promosyon</p>
                    <p className="text-xl font-semibold">{metrics.active_promotions}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs text-white/50">Uygun aday</p>
                    <p className="text-xl font-semibold">{metrics.eligible_candidates}</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs text-white/50">AI senaryo doğruluğu</p>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span>Moderasyon senaryoları</span>
                    <span className="text-emerald-300">
                      {formatPercent(metrics.ai_moderation_accuracy)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span>Yetkili eğitimleri</span>
                    <span className="text-emerald-300">
                      {formatPercent(metrics.ai_training_accuracy)}
                    </span>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#0b0d12]/60 p-4">
                  <div className="flex items-center justify-between text-xs text-white/60">
                    <span>Üye paneli özeti</span>
                    <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2 py-0.5 text-[11px] text-emerald-200">
                      Açık
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/70">
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Cüzdan</span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Transfer</span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Mağaza</span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Bildirimler</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="paneller" className="grid gap-6">
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300">Paneller</p>
            <h2 className="text-3xl font-semibold">Admin ve üye deneyimi birbirini tamamlar.</h2>
            <p className="text-sm text-white/60">
              Operasyonel kontrol sizde, kullanıcı deneyimi sade ve hızlı. İki panel de aynı
              tasarım dili ve veri akışıyla çalışır.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {PANEL_CARDS.map((panel) => (
              <div
                key={panel.title}
                className="rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:border-white/20"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">{panel.title}</h3>
                  <span className="text-xs text-white/50">Canlı görünüm</span>
                </div>
                <p className="mt-3 text-sm text-white/60">{panel.description}</p>
                <ul className="mt-4 space-y-2 text-sm text-white/70">
                  {panel.items.map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href={panel.cta.href}
                  className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs font-semibold text-white/80 transition hover:border-white/30 hover:text-white"
                >
                  {panel.cta.label}
                  <span>→</span>
                </Link>
              </div>
            ))}
          </div>
        </section>

        <section id="sistem" className="grid gap-8 rounded-[28px] border border-white/10 bg-white/5 p-10 md:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300">Sistem</p>
            <h2 className="text-3xl font-semibold">Bot, web ve sunucu ekonomisi aynı akışta.</h2>
            <p className="text-sm text-white/60">
              Disc Nexus, Discord bot altyapınızla web arayüzünü birleştirir. Üyeleriniz mağaza
              ve promosyonlara erişirken, ekibiniz moderasyon senaryolarını ve yetkili sürecini
              tek panelden yönetir.
            </p>
            <ul className="space-y-3 text-sm text-white/70">
              {PLATFORM_FEATURES.map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#0b0d12]/60 p-6">
            <p className="text-xs text-white/60">Akış özeti</p>
            <div className="mt-4 space-y-4">
              {['Discord OAuth', 'Rol mağazası & kampanyalar', 'AI senaryoları', 'Yetkili alım süreci'].map(
                (item) => (
                  <div
                    key={item}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
                  >
                    <span>{item}</span>
                    <span className="text-emerald-300">Aktif</span>
                  </div>
                ),
              )}
            </div>
          </div>
        </section>

        <section id="ozellikler" className="grid gap-6">
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300">Özellikler</p>
            <h2 className="text-3xl font-semibold">Topluluğunuzu büyüten modüller.</h2>
            <p className="text-sm text-white/60">
              Üyelerin alışveriş deneyiminden yetkili seçimlerine kadar tüm süreçleri ölçülebilir hale getirir.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {CORE_FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:border-white/20"
              >
                <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
                <p className="mt-2 text-sm text-white/60">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="senaryolar" className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300">AI Senaryolar</p>
              <h2 className="text-3xl font-semibold">Yetkili adaylarını güvenle seçin.</h2>
              <p className="text-sm text-white/60">
                AI dedektiflik sistemi, moderasyon davranışlarını simüle eder. Adayların doğruluk
                skoruna göre başvuru haklarını otomatik belirler.
              </p>
            </div>
            <div className="grid gap-4">
              {SCENARIOS.map((scenario) => (
                <div key={scenario.title} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <h3 className="text-sm font-semibold">{scenario.title}</h3>
                  <p className="mt-2 text-sm text-white/60">{scenario.description}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <p className="text-xs text-white/60">AI dedektif paneli</p>
            <div className="mt-5 space-y-4">
              <div className="rounded-xl border border-white/10 bg-[#0b0d12]/60 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span>Senaryo: Spam flood</span>
                  <span className="text-emerald-300">Başarılı</span>
                </div>
                <div className="mt-3 h-2 w-full rounded-full bg-white/10">
                  <div className="h-2 w-[82%] rounded-full bg-emerald-400" />
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#0b0d12]/60 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span>Senaryo: Toxic davranış</span>
                  <span className="text-amber-300">Geliştiriliyor</span>
                </div>
                <div className="mt-3 h-2 w-full rounded-full bg-white/10">
                  <div className="h-2 w-[64%] rounded-full bg-amber-400" />
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#0b0d12]/60 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span>Senaryo: Şüpheli ticaret</span>
                  <span className="text-emerald-300">Başarılı</span>
                </div>
                <div className="mt-3 h-2 w-full rounded-full bg-white/10">
                  <div className="h-2 w-[91%] rounded-full bg-emerald-400" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="sss" className="grid gap-6 rounded-[28px] border border-white/10 bg-white/5 p-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300">SSS</p>
            <h2 className="text-2xl font-semibold">Sık sorulan sorular</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {FAQS.map((faq) => (
              <div key={faq.question} className="rounded-2xl border border-white/10 bg-[#0b0d12]/50 p-5">
                <h3 className="text-sm font-semibold">{faq.question}</h3>
                <p className="mt-2 text-sm text-white/60">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>

        <section
          id="basla"
          className="flex flex-col items-center justify-between gap-6 rounded-[28px] border border-white/10 bg-gradient-to-br from-indigo-500/20 to-white/5 p-8 text-center md:flex-row md:text-left"
        >
          <div>
            <h2 className="text-2xl font-semibold">Discord sunucunuzu profesyonel bir seviyeye taşıyalım.</h2>
            <p className="mt-2 text-sm text-white/70">
              Rol mağazası, promosyonlar ve AI dedektiflik için özel bir kurulum planı hazırlayalım.
            </p>
          </div>
          <Link
            href={loginUrl}
            className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#0b0d12] transition hover:bg-white/90"
          >
            Discord ile Bağlan
          </Link>
        </section>
      </main>

      <footer className="border-t border-white/5 pb-12 pt-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-4 px-6 text-xs text-white/50 md:flex-row md:px-10">
          <p>© 2026 Disc Nexus. Tüm hakları saklıdır.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-white">Gizlilik</a>
            <a href="#" className="hover:text-white">Şartlar</a>
            <a href="#" className="hover:text-white">İletişim</a>
          </div>
        </div>
      </footer>
    </div>
  );
}