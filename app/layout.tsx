import type { Metadata } from "next";
import { Inter } from "next/font/google";
// BU SATIR OLMAZSA HER ŞEY BEYAZ GÖRÜNÜR:
import "./globals.css"; 
import CartProvider from "../lib/cart";
import CartDrawer from "../components/CartDrawer";
import ThemeBootstrap from "./components/ThemeBootstrap";
import DeveloperHideGuard from "./components/DeveloperHideGuard";

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
      <body className={inter.className}>
        {/* ThemeBootstrap applies persisted theme on client mount; removed pre-hydration inline script
          to prevent React hydration mismatches. This may cause a very short FOUC but avoids warnings. */}
        <ThemeBootstrap />
        <DeveloperHideGuard />
        <CartProvider>
          {children}
          <CartDrawer />
        </CartProvider>
      </body>
    </html>
  );
}