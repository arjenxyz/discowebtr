const SECURITY_ITEMS = [
  {
    title: 'Rol Hiyerarşisi',
    detail: 'Bot rolü, atanacak tüm rollerin üzerinde olmalıdır.',
  },
  {
    title: 'Webhook Kontrolleri',
    detail: 'Webhook URL’leri sadece admin ekibi tarafından yönetilmelidir.',
  },
  {
    title: 'Service Role Key',
    detail: 'Key yalnızca sunucu tarafında tutulur, client tarafında kullanılmaz.',
  },
  {
    title: 'Şüpheli Olay İzleme',
    detail: 'Yetkisiz istekler ayrı log kanalına düşer.',
  },
];

export default function AdminSecurityPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300">Admin</p>
        <h1 className="mt-2 text-2xl font-semibold">Güvenlik Merkezi</h1>
        <p className="mt-2 text-sm text-white/60">
          Panel güvenliği, rol politikaları ve log izleme ayarları burada yönetilir.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {SECURITY_ITEMS.map((item) => (
          <div key={item.title} className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-lg font-semibold">{item.title}</h2>
            <p className="mt-2 text-sm text-white/60">{item.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}