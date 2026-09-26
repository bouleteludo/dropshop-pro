import type { Metadata } from "next";
import { Cinzel, Inter } from "next/font/google";
import { Header } from "@/components/Header";
import { STORE } from "@/lib/store-config";
import { getActiveThemeId } from "@/lib/site-settings";
import { THEMES } from "@/lib/theme-config";
import "./globals.css";

const cinzel = Cinzel({ weight: ["500", "600", "700"], subsets: ["latin"], variable: "--font-display", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://boo-shop.vercel.app";

export async function generateMetadata(): Promise<Metadata> {
  const activeTheme = await getActiveThemeId();
  const theme = THEMES[activeTheme];
  return {
    metadataBase: new URL(siteUrl),
    title: { default: `BOO SHOP — ${theme.label}`, template: "%s · BOO SHOP" },
    description: theme.homeDescription.slice(0, 160),
    alternates: { canonical: "/" },
    openGraph: {
      title: `BOO SHOP — ${theme.label}`,
      description: theme.homeDescription,
      url: siteUrl,
      siteName: "BOO SHOP",
      locale: "fr_FR",
      type: "website",
    },
    twitter: { card: "summary_large_image" },
    robots: { index: true, follow: true },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const activeTheme = await getActiveThemeId();
  const theme = THEMES[activeTheme];
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "OnlineStore",
    name: STORE.name,
    url: siteUrl,
    email: STORE.contactEmail,
    description: theme.footerDescription,
  };

  return (
    <html lang="fr" className={`${cinzel.variable} ${inter.variable}`} data-theme={activeTheme}>
      <body className="min-h-screen bg-ink-950 text-bone-50 font-sans antialiased flex flex-col relative">
        {/* eslint-disable-next-line react/no-danger */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
        <div className="relative z-10 flex flex-col min-h-screen">
          <div className="seasonal-banner bg-ink-900 border-b border-ember-500/20 text-bone-200 text-center text-xs sm:text-sm tracking-wide py-2 px-4">
            {theme.banner}
          </div>
          <Header />
          <div className="flex-1">{children}</div>
          <footer className="seasonal-footer border-t border-white/5 mt-24">
            <div className="container py-12 grid gap-10 sm:grid-cols-3 text-sm">
              <div>
                <p className="font-display text-lg tracking-[0.18em] text-bone-50 mb-3">BOO<span className="text-ember-500">·</span>SHOP</p>
                <p className="text-bone-400 leading-relaxed">{theme.footerDescription}</p>
              </div>
              <div id="livraison">
                <p className="text-bone-50 font-medium mb-3">Réassurance</p>
                <ul className="text-bone-400 space-y-1.5">
                  <li>Paiement sécurisé par Stripe</li>
                  <li>Livraison estimée {STORE.deliveryEstimate}</li>
                  <li>Rétractation 14 jours (voir conditions)</li>
                </ul>
              </div>
              <div id="contact">
                <p className="text-bone-50 font-medium mb-3">Contact</p>
                <p className="text-bone-400 leading-relaxed">Une question ? Écrivez-nous à {STORE.contactEmail}.</p>
              </div>
            </div>
            <div className="border-t border-white/5 py-5 text-center text-xs text-bone-400/70">© {new Date().getFullYear()} BOO SHOP</div>
          </footer>
        </div>
      </body>
    </html>
  );
}
