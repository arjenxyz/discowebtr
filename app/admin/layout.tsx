import AdminShell from './AdminShell';

export const dynamic = 'force-dynamic';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // Admin kontrolü artık sayfa seviyesinde yapılıyor (multi-server support için)
  // Layout sadece shell component'i sağlıyor
  return <AdminShell>{children}</AdminShell>;
}