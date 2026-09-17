import type { Metadata } from "next";
import { Creepster } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const creepster = Creepster({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-spooky",
});

export const metadata: Metadata = {
  title: "Boo Shop 🎃",
  description: "Boutique éphémère Halloween — alimentée par CJ Dropshipping",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={creepster.variable}>
      <body className="min-h-screen bg-night-950 text-orange-50">
        <div className="bg-pumpkin-600 text-night-950 text-center text-sm font-semibold py-1.5 flicker">
          🎃 ÉDITION HALLOWEEN — la boutique disparaît le 1er novembre 👻
        </div>
        <header className="border-b border-pumpkin-500/20">
          <nav className="max-w-5xl mx-auto flex items-center p-4">
            <Link href="/" className="font-spooky text-3xl text-pumpkin-500 tracking-wide drop-shadow-[0_0_8px_rgba(255,117,24,0.6)]">
              Boo Shop 🎃
            </Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
