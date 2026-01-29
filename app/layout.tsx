import type { Metadata } from "next";
import { Inter } from "next/font/google";
// BU SATIR OLMAZSA HER ŞEY BEYAZ GÖRÜNÜR:
import "./globals.css"; 

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Yönetim Paneli",
  description: "Resmi Topluluk Sistemi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className={inter.className}>{children}</body>
    </html>
  );
}