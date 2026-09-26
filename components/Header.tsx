"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { CartBadge } from "@/components/CartBadge";

export function Header({ seasonName = "Saison" }: { seasonName?: string }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuId = useId();
  const nav = [
    { href: "/#collection", label: seasonName },
    { href: "/categorie/masques", label: "Masques" },
    { href: "/categorie/decoration", label: "Décoration" },
    { href: "/categorie/costumes", label: "Costumes" },
    { href: "/categorie/accessoires", label: "Accessoires" },
    { href: "/#livraison", label: "Livraison" },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const headerClass = scrolled
    ? "bg-ink-950/88 backdrop-blur-xl border-b border-white/5 shadow-[0_8px_30px_rgba(0,0,0,.18)]"
    : "bg-ink-950/45 backdrop-blur-md border-b border-white/5";

  return (
    <header className={`sticky top-0 z-40 transition-all duration-300 ${headerClass}`}>
      <nav className="container flex items-center justify-between py-3.5" aria-label="Navigation principale">
        <Link href="/" className="font-display text-lg sm:text-xl tracking-[0.22em] text-bone-50 hover:text-ember-300 transition-colors" aria-label="BOO SHOP — accueil">
          BOO<span className="text-ember-500">·</span>SHOP
        </Link>

        <ul className="hidden lg:flex items-center gap-6 xl:gap-7 text-sm" aria-label="Catégories et navigation">
          {nav.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="text-bone-200/75 hover:text-bone-50 transition-colors">
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <Link href="/cart" className="relative inline-flex items-center gap-2 rounded-full border border-white/10 hover:border-ember-500/50 text-bone-200 hover:text-ember-300 px-3.5 py-2 text-sm transition-colors" aria-label="Panier">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
              <path d="M3 6h18" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            <span className="hidden sm:inline">Panier</span>
            <CartBadge />
          </Link>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-bone-200 hover:border-ember-500/50 hover:text-ember-300 transition-colors"
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={open}
            aria-controls={menuId}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              {open ? <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></> : <><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></>}
            </svg>
          </button>
        </div>
      </nav>

      <div id={menuId} className={`lg:hidden overflow-hidden transition-[max-height,opacity] duration-300 ease-out border-t border-white/5 bg-ink-950/96 backdrop-blur-xl ${open ? "max-h-[32rem] opacity-100" : "max-h-0 opacity-0"}`}>
        <ul className="container py-3 flex flex-col gap-1" aria-label="Navigation mobile">
          {nav.map((item) => (
            <li key={item.href}>
              <Link href={item.href} onClick={() => setOpen(false)} className="block rounded-xl px-3 py-3.5 text-bone-200 hover:bg-white/[0.04] hover:text-ember-300 transition-colors">
                {item.label}
              </Link>
            </li>
          ))}
          <li>
            <Link href="/#contact" onClick={() => setOpen(false)} className="block rounded-xl px-3 py-3.5 text-bone-200 hover:bg-white/[0.04] hover:text-ember-300 transition-colors">
              Contact
            </Link>
          </li>
        </ul>
      </div>
    </header>
  );
}
