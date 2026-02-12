// ============================================
// SYSTEM NOTIFICATION TEMPLATES (CORPORATE EDITION)
// Optimized for "SaaS System Log" style with Header
// ============================================

export type ChangeItem = { 
  type: 'narrative' | 'tech'; 
  text: string; 
  dir?: 'up' | 'down' | 'same' 
};

// Helper: escape plain text for safety
const escText = (s: string) => String(s).replace(/\r/g, '').replace(/\n/g, '\n');

// ============================================
// VERSION 1: PLAIN TEXT (For Logs & Simple Clients)
// ============================================

export function renderEarnNotificationPlainText(
  changeGroups: Record<string, ChangeItem[]>,
  reason?: string
): string {
  // ... (Bu kısım aynı kalabilir, değişiklik HTML'de)
  const CATEGORY_META = [
    { key: 'general', label: 'GENEL EKONOMİ PARAMETRELERİ' },
    { key: 'tag', label: 'ETİKET (TAG) ÇARPANLARI' },
    { key: 'boost', label: 'TAKVİYE (BOOST) AVANTAJLARI' },
  ];

  const lines: string[] = [];

  lines.push('SİSTEM GÜNCELLEME RAPORU: v2.4.0');
  lines.push('==================================================');
  lines.push(`İşlem Tarihi: ${new Date().toLocaleDateString('tr-TR')} ${new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`);
  lines.push('Durum: Tamamlandı / Yayında');
  lines.push('');
  lines.push('Aşağıda listelenen ekonomi modülü yapılandırma ayarları, sistem yöneticisi tarafından güncellenmiştir.');
  lines.push('');

  for (const cat of CATEGORY_META) {
    const items = changeGroups[cat.key] ?? [];
    if (!items || items.length === 0) continue;

    lines.push(`[ ${cat.label} ]`);
    lines.push('-'.repeat(cat.label.length + 4));
    
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const next = items[i + 1];

      if (it.type === 'narrative' && next && next.type === 'tech') {
        const arrow = next.dir === 'up' ? '(+ Artış)' : next.dir === 'down' ? '(- Azalış)' : '(~ Değişim)';
        lines.push(`* ${escText(it.text)}`);
        lines.push(`  └─ Teknik Veri: ${escText(next.text)} ${arrow}`);
        i++;
      } else if (it.type === 'narrative') {
        lines.push(`* ${escText(it.text)}`);
      } else {
        const arrow = it.dir === 'up' ? '▲' : it.dir === 'down' ? '▼' : '●';
        lines.push(`  ${arrow} ${escText(it.text)}`);
      }
    }
    lines.push('');
  }

  lines.push('==================================================');
  lines.push('YÖNETİCİ NOTU:');
  lines.push(reason || 'Periyodik sistem bakımı ve oran optimizasyonu.');
  lines.push('');
  lines.push(`Log ID: ${Date.now().toString(36).toUpperCase()}`);
  lines.push('Bu rapor otomasyon sistemi tarafından oluşturulmuştur.');

  return lines.join('\n');
}


// ============================================
// VERSION 2: PROFESSIONAL HTML (SaaS / Stripe Style)
// ============================================

export function renderEarnNotificationHTML(
  changeGroups: Record<string, ChangeItem[]>, 
  reason?: string
): string {
  const CATEGORY_META: { key: string; label: string; color: string; icon: string }[] = [
    { key: 'general', label: 'GENEL EKONOMİ PARAMETRELERİ', color: '#3b82f6', icon: '📊' }, // Blue
    { key: 'tag', label: 'ETİKET (TAG) ÇARPANLARI', color: '#10b981', icon: '🏷️' },     // Emerald
    { key: 'boost', label: 'TAKVİYE (BOOST) AVANTAJLARI', color: '#8b5cf6', icon: '🚀' }, // Violet
  ];

  const esc = (s: string) => String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const parts: string[] = [];

  // --- CONTAINER (No Box, Just Content) ---
  parts.push('<div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif; color: #374151; line-height: 1.6; max-width: 600px;">');

    // --- [YENİ] HEADER KISMI (Avatar + Hitap) ---
    parts.push('<div style="margin-bottom: 24px; border-bottom: 1px solid #e5e7eb; padding-bottom: 20px;">');
      
      // Avatar ve Başlık Yan Yana
      parts.push('<div style="display: flex; align-items: flex-start; gap: 16px;">');
        
        // Sistem Avatarı (Gri Kutu içinde Dişli İkonu)
        parts.push('<div style="flex-shrink: 0; width: 48px; height: 48px; background-color: #f3f4f6; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px; border: 1px solid #e5e7eb;">⚙️</div>');
        
        // Başlık ve Hitap
        parts.push('<div>');
          parts.push('<h1 style="margin: 0 0 4px 0; font-size: 16px; font-weight: 700; color: #111827;">Sistem Yaması: Ekonomi Dengelemesi v2.4</h1>');
          parts.push('<p style="margin: 0; color: #6b7280; font-size: 13px; font-weight: 500;">Alıcı: <span style="color: #374151;">Tüm Topluluk Üyeleri</span></p>');
        parts.push('</div>');

      parts.push('</div>'); // End Flex

      // Giriş Açıklaması
      parts.push('<div style="margin-top: 16px;">');
        parts.push('<p style="margin: 0; color: #4b5563; font-size: 14px;">Sunucu içi enflasyon verileri ve kullanıcı etkileşim metrikleri analiz edilerek, ödül havuzunun optimizasyonu amacıyla aşağıdaki yapılandırma ayarları güncellenmiştir.</p>');
      parts.push('</div>');

    parts.push('</div>'); // End Header Area

  // --- CATEGORIES ---
  for (const cat of CATEGORY_META) {
    const items = changeGroups[cat.key] ?? [];
    if (!items || items.length === 0) continue;

    parts.push('<div style="margin-bottom: 28px;">');
    
    // Category Title
    parts.push('<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">');
    parts.push(`<span style="color: ${cat.color}; font-size: 14px;">${cat.icon}</span>`);
    parts.push(`<h2 style="margin: 0; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280;">${esc(cat.label)}</h2>`);
    parts.push('</div>');

    // Items Container
    parts.push('<div style="border-left: 2px solid #e5e7eb; padding-left: 16px; margin-left: 6px;">');
    
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const next = items[i + 1];

      if (it.type === 'narrative' && next && next.type === 'tech') {
        const dirColor = next.dir === 'up' ? '#059669' : next.dir === 'down' ? '#dc2626' : '#4b5563'; 
        const dirIcon = next.dir === 'up' ? '▲' : next.dir === 'down' ? '▼' : '●';

        parts.push('<div style="margin-bottom: 16px;">');
        parts.push(`<div style="font-size: 14px; color: #111827; font-weight: 500; margin-bottom: 4px;">${esc(it.text)}</div>`);
        parts.push(`<div style="font-family: 'Courier New', monospace; font-size: 13px; color: ${dirColor}; background: #f3f4f6; padding: 4px 8px; border-radius: 4px; display: inline-block;">`);
        parts.push(`<span style="margin-right: 6px;">${dirIcon}</span>${esc(next.text).replace(/->/g, '→')}`);
        parts.push('</div>');
        parts.push('</div>');
        i++; 
      } else if (it.type === 'narrative') {
        parts.push(`<div style="margin-bottom: 12px; font-size: 14px; color: #374151;">• ${esc(it.text)}</div>`);
      } else {
        const dirColor = it.dir === 'up' ? '#059669' : it.dir === 'down' ? '#dc2626' : '#4b5563';
        const dirIcon = it.dir === 'up' ? '▲' : it.dir === 'down' ? '▼' : '●';
        parts.push(`<div style="margin-bottom: 12px; font-family: 'Courier New', monospace; font-size: 13px; color: ${dirColor};">`);
        parts.push(`<span style="margin-right: 6px;">${dirIcon}</span>${esc(it.text).replace(/->/g, '→')}`);
        parts.push('</div>');
      }
    }
    parts.push('</div>'); 
    parts.push('</div>'); 
  }

  // --- FOOTER ---
  parts.push('<div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #e5e7eb; background-color: #f9fafb; padding: 16px; border-radius: 8px;">');
  parts.push(`<div style="font-size: 13px; color: #4b5563; margin-bottom: 8px;"><strong style="color: #111827;">📝</strong> ${esc(reason ?? "Sistem tarafından otomatik olarak oluşturuldu.")}</div>`);
  

  try {
    const meta = { generated_at: new Date().toISOString(), categories: Object.keys(changeGroups) };
    parts.push(`<script type="application/json" data-notif-meta>${JSON.stringify(meta)}</script>`);
  } catch {}

  parts.push('</div>');

  return parts.join('\n');
}

// Backwards-compatible default export
export function renderEarnNotification(changeGroups: Record<string, ChangeItem[]>, reason?: string) {
  return renderEarnNotificationHTML(changeGroups, reason);
}