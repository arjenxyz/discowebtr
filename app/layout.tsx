import type { Metadata } from "next";
import { Inter } from "next/font/google";
// BU SATIR OLMAZSA HER ŞEY BEYAZ GÖRÜNÜR:
import "./globals.css"; 

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DiscoWeb - Discord Yönetim Paneli",
  description: "Özel Discord sunucuları için geliştirilmiş, yapay zeka destekli gelişmiş yönetim platformu.",
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