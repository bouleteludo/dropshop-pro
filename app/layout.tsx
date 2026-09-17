import type { Metadata } from "next";
import { Cinzel, Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const cinzel = Cinzel({
  weight: ["500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-display",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const siteUrl = "https://booshop.example.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Boo Shop — Halloween Edition",
    template: "%s · Boo Shop",
  },
  description:
    "Boo Shop réunit une sélection d'objets Halloween pour cette saison uniquement — décoration, masques et accessoires, livrés chez vous.",
  openGraph: {
    title: "Boo Shop — Halloween Edition",
    description:
      "Une sélection d'objets Halloween pour cette saison uniquement — décoration, masques et accessoires.",
    url: siteUrl,
    siteName: "Boo Shop",
    locale: "fr_FR",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${cinzel.variable} ${inter.variable}`}>
      <body className="min-h-screen bg-ink-950 text-bone-50 font-sans antialiased flex flex-col">
        <div className="bg-ink-900 border-b border-ember-500/20 text-bone-200 text-center text-xs sm:text-sm tracking-wide py-2 px-4">
          Édition Halloween — collection disponible jusqu&apos;au 1<sup>er</sup> novembre
        </div>

        <header className="border-b border-white/5 sticky top-0 z-20 bg-ink-950/85 backdrop-blur">
          <nav className="max-w-6xl mx-auto flex items-center justify-between px-5 sm:px-8 py-4">
            <Link href="/" className="font-display text-xl sm:text-2xl tracking-[0.15em] text-bone-50">
              BOO SHOP
            </Link>
            <Link
              href="/#collection"
              className="text-sm text-bone-200/70 hover:text-ember-400 transition-colors"
            >
              La collection
            </Link>
          </nav>
        </header>

        <div className="flex-1">{children}</div>

        <footer className="border-t border-white/5 mt-24">
          <div className="max-w-6xl mx-auto px-5 sm:px-8 py-10 grid gap-8 sm:grid-cols-3 text-sm">
            <div>
              <p className="font-display text-lg tracking-[0.1em] text-bone-50 mb-2">BOO SHOP</p>
              <p className="text-bone-400">
                Une collection éphémère pour Halloween — disponible pour un temps limité.
              </p>
            </div>
            <div>
              <p className="text-bone-50 font-medium mb-2">Réassurance</p>
              <ul className="text-bone-400 space-y-1">
                <li>Paiement sécurisé</li>
                <li>Livraison suivie</li>
                <li>Retours sous 14 jours</li>
              </ul>
            </div>
            <div>
              <p className="text-bone-50 font-medium mb-2">Contact</p>
              <p className="text-bone-400">Une question ? Écrivez-nous, nous répondons sous 48h.</p>
            </div>
          </div>
          <div className="border-t border-white/5 py-4 text-center text-xs text-bone-400/70">
            © {new Date().getFullYear()} Boo Shop. Tous droits réservés.
          </div>
        </footer>
      </body>
    </html>
  );
}
