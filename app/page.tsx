import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/ProductCard";
import { CharacterCard } from "@/components/CharacterCard";
import { CHRISTMAS_CHARACTERS, HALLOWEEN_NEW_CHARACTERS } from "@/lib/boo-characters";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const products = await prisma.product.findMany({
    where: { active: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="overflow-hidden bg-[#050908] text-white">
      <section className="boo-hero relative min-h-[calc(100vh-100px)]">
        <div className="hero-orb hero-orb-red" />
        <div className="hero-orb hero-orb-green" />
        <div className="hero-grid" />
        <div className="container relative z-10 grid min-h-[calc(100vh-100px)] items-center gap-12 py-16 lg:grid-cols-[1fr_.82fr] lg:py-24">
          <div className="max-w-3xl">
            <div className="hero-eyebrow inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[.045] px-4 py-2 text-[10px] font-semibold uppercase tracking-[.28em] text-white/65 backdrop-blur">
              <span className="status-dot" />
              BOO · objets · personnages · émotions
            </div>
            <h1 className="hero-title mt-7 font-display text-[clamp(3.8rem,9vw,8.8rem)] leading-[.82] tracking-[-.055em]">
              <span className="block text-white">Entre dans</span>
              <span className="block text-outline">l'univers</span>
              <span className="block text-amber-200">BOO.</span>
            </h1>
            <p className="mt-8 max-w-xl text-base leading-7 text-white/55 sm:text-lg">
              Des personnages à collectionner, des univers qui changent au fil des saisons et une boutique pensée comme une expérience.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="#collection" className="magnetic-button group rounded-full bg-white px-6 py-3.5 text-sm font-bold text-[#07100d]">
                Explorer la collection <span className="ml-2 inline-block transition-transform group-hover:translate-x-1">↗</span>
              </Link>
              <Link href="/personnages#noel" className="rounded-full border border-white/15 bg-white/[.03] px-6 py-3.5 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/[.07]">
                Rencontrer les personnages
              </Link>
            </div>
            <div className="mt-12 flex flex-wrap gap-x-8 gap-y-3 text-xs uppercase tracking-[.18em] text-white/35">
              <span><b className="text-white">24</b> personnages Noël</span>
              <span><b className="text-white">64</b> nouveaux Halloween</span>
              <span><b className="text-white">5</b> univers</span>
            </div>
          </div>

          <div className="hero-stage relative mx-auto w-full max-w-[600px]">
            <div className="stage-ring stage-ring-one" />
            <div className="stage-ring stage-ring-two" />
            <div className="stage-card relative overflow-hidden rounded-[42px] border border-white/10 bg-white/[.035] p-4 shadow-2xl backdrop-blur-xl">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_25%,rgba(251,191,36,.14),transparent_34%),radial-gradient(circle_at_15%_85%,rgba(168,85,247,.12),transparent_30%)]" />
              <div className="relative grid grid-cols-3 gap-3">
                {CHRISTMAS_CHARACTERS.slice(0, 9).map((character, index) => (
                  <div key={character.id} className={`stage-character stage-character-${index + 1}`}>
                    <CharacterCard character={character} />
                  </div>
                ))}
              </div>
              <div className="relative mt-4 flex items-center justify-between rounded-3xl border border-white/10 bg-black/20 px-5 py-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[.24em] text-white/35">Collection</p>
                  <p className="mt-1 font-display text-xl">Christmas 2026</p>
                </div>
                <span className="rounded-full border border-amber-200/20 bg-amber-200/10 px-3 py-1 text-xs text-amber-100">NEW</span>
              </div>
            </div>
          </div>
        </div>
        <div className="hero-scroll absolute bottom-7 left-1/2 z-10 -translate-x-1/2 text-[9px] uppercase tracking-[.35em] text-white/30">
          <span className="mr-3 inline-block h-7 w-px bg-white/20 align-middle" /> Scroll
        </div>
      </section>

      <section className="relative border-y border-white/[.07] bg-[#080d0b] py-5">
        <div className="container flex flex-wrap items-center justify-between gap-4 text-[10px] uppercase tracking-[.25em] text-white/35">
          <span>BOO COLLECTIONS</span><span className="hidden sm:block">Saison · caractère · surprise</span><span>Halloween / Christmas / Mystery</span>
        </div>
      </section>

      <section id="collection" className="container py-24 sm:py-32">
        <div className="mb-12 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="section-kicker">01 — La collection</p>
            <h2 className="section-title mt-3 max-w-3xl">Des personnages qui donnent une identité à chaque objet.</h2>
          </div>
          <Link href="/personnages" className="text-sm font-semibold text-amber-200 hover:text-white">Voir tous les personnages ↗</Link>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {CHRISTMAS_CHARACTERS.slice(0, 12).map((character) => <CharacterCard key={character.id} character={character} />)}
        </div>
      </section>

      <section className="relative overflow-hidden border-y border-purple-300/10 bg-[#0d0914] py-24 sm:py-32">
        <div className="purple-haze" />
        <div className="container relative z-10">
          <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
            <div>
              <p className="section-kicker text-purple-200/55">02 — L'autre côté de BOO</p>
              <h2 className="section-title mt-3">Halloween n'est jamais vraiment terminé.</h2>
              <p className="mt-6 max-w-xl leading-7 text-white/50">De nouveaux personnages prolongent les collections existantes avec une direction plus étrange, plus colorée et plus collectionnable.</p>
              <Link href="/personnages#halloween" className="mt-8 inline-flex rounded-full border border-purple-200/20 bg-purple-200/10 px-5 py-3 text-sm font-semibold text-purple-100 transition hover:bg-purple-200/15">Découvrir les nouveaux Halloween ↗</Link>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {HALLOWEEN_NEW_CHARACTERS.slice(0, 8).map((character) => <CharacterCard key={character.id} character={character} />)}
            </div>
          </div>
        </div>
      </section>

      {products.length > 0 && (
        <section className="container py-24 sm:py-32">
          <div className="mb-12">
            <p className="section-kicker">03 — La boutique</p>
            <h2 className="section-title mt-3">Les pièces disponibles maintenant.</h2>
          </div>
          <ul className="grid grid-cols-2 gap-5 lg:grid-cols-3">
            {products.slice(0, 9).map((product) => (
              <li key={product.id}>
                <ProductCard slug={product.slug ?? product.id} name={product.name} price={product.price} images={JSON.parse(product.images) as string[]} stock={product.stock} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="container pb-24 sm:pb-32">
        <div className="relative overflow-hidden rounded-[38px] border border-white/10 bg-white/[.035] px-7 py-12 sm:px-12 sm:py-16">
          <div className="cta-glow" />
          <div className="relative z-10 max-w-3xl">
            <p className="section-kicker">04 — L'expérience</p>
            <h2 className="mt-3 font-display text-4xl leading-none tracking-tight sm:text-6xl">Choisis ton personnage. Construis ton univers.</h2>
            <p className="mt-6 max-w-xl leading-7 text-white/50">BOO est pensé pour évoluer : nouvelles saisons, nouveaux personnages, nouvelles collections.</p>
            <Link href="/contact" className="mt-8 inline-flex rounded-full bg-white px-6 py-3.5 text-sm font-bold text-[#07100d] transition hover:-translate-y-0.5">Parler à BOO ↗</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
