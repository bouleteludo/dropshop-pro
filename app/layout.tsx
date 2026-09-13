import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "DropShop Pro",
  description: "Boutique en ligne alimentée par CJ Dropshipping",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-white text-gray-900">
        <header className="border-b">
          <nav className="max-w-5xl mx-auto flex items-center justify-between p-4">
            <Link href="/" className="font-bold text-lg">
              DropShop Pro
            </Link>
            <Link href="/admin/import" className="text-sm text-gray-500 hover:text-gray-900">
              Admin — Importer des produits
            </Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
