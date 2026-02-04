import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sunucudan Ayrıldınız',
  description: 'Seçili sunucudan ayrıldığınız için erişim kısıtlandı.',
};

export default function ServerLeftLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}