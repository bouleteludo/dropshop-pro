import type { Metadata } from "next";
import { Cinzel, Inter } from "next/font/google";
import { Header } from "@/components/Header";
import "./globals.css";

const cinzel = Cinzel({
  weight: ["500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://boo-shop.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Boo Shop — Objets Halloween premium, édition limitée",
    template: "%s · Boo Shop",
  },
  description:
    "Décoration, masques et accessoires Halloween sélectionnés pour adultes. Livraison suivie, retours sous 14 jours. Collection disponible jusqu'au 1er novembre.",
  openGraph: {
    title: "Boo Shop — Objets Halloween premium",
    description: "Une collection Halloween sombre et élégante, disponible jusqu'au 1er novembre.",
    url: siteUrl,
    siteName: "Boo Shop",
    locale: "fr_FR",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${cinzel.variable} ${inter.variable}`}>
      <body className="min-h-screen bg-ink-950 text-bone-50 font-sans antialiased flex flex-col relative">
        <div className="relative z-10 flex flex-col min-h-screen">
          <div className="bg-ink-900 border-b border-ember-500/20 text-bone-200 text-center text-xs sm:text-sm tracking-wide py-2 px-4">
            Édition Halloween — collection disponible jusqu&apos;au 1<sup>er</sup> novembre
          </div>

          <Header />

          <div className="flex-1">{children}</div>

          <footer className="border-t border-white/5 mt-24">
            <div className="container py-12 grid gap-10 sm:grid-cols-3 text-sm">
              <div>
                <p className="font-display text-lg tracking-[0.18em] text-bone-50 mb-3">
                  BOO<span className="text-ember-500">·</span>SHOP
                </p>
                <p className="text-bone-400 leading-relaxed">
                  Une collection éphémère pour Halloween — pensée pour durer, pas pour finir à la
                  poubelle le 1<sup>er</sup> novembre.
                </p>
              </div>
              <div id="livraison">
                <p className="text-bone-50 font-medium mb-3">Réassurance</p>
                <ul className="text-bone-400 space-y-1.5">
                  <li>Paiement sécurisé</li>
                  <li>Livraison suivie</li>
                  <li>Retours sous 14 jours</li>
                </ul>
              </div>
              <div id="contact">
                <p className="text-bone-50 font-medium mb-3">Contact</p>
                <p className="text-bone-400 leading-relaxed">
                  Une question ? Écrivez-nous, nous répondons sous 48h.
                </p>
              </div>
            </div>
            <div className="border-t border-white/5 py-5 text-center text-xs text-bone-400/70">
              © {new Date().getFullYear()} Boo Shop. Tous droits réservés.
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
