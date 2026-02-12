export function refundButtonHtml(failureReason: string | null, refundUrl: string | null) {
  const labelMap: Record<string, string> = {
    invalid_role_id: 'Rol Bulunamadı — Destek İste',
    bot_missing_manage_roles: 'Bot Yetkisi Eksik — Destek',
    bot_role_hierarchy: 'Hiyerarşi Sorunu — Destek',
    role_assign_failed: '💰 İade İşlemini Başlat',
    insufficient_funds: 'Cüzdanı Yükle',
  };

  const label = (failureReason && labelMap[failureReason]) || '💰 İade İşlemini Başlat';

  if (!refundUrl) return `<span style="display:inline-block;padding:12px 18px;border-radius:8px;background:#444;color:#ddd">İade linki mevcut değil</span>`;
  return `<a href="${refundUrl}" style="display:inline-block;background:#5865F2;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700">${label}</a>`;
}
