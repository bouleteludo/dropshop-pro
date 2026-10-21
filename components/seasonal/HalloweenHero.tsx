import Image from "next/image";
import Link from "next/link";

export function HalloweenHero({ heroHref }: { heroHref: string }) {
  return (
    <section className="halloween-hero relative min-h-[720px] overflow-hidden border-b border-white/10">
      <div className="halloween-scene absolute inset-0" aria-hidden>
        <Image
          src="/themes/halloween/hero.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
      </div>
      <div className="halloween-overlay absolute inset-0" aria-hidden />
      <div className="relative z-10 container min-h-[720px] flex items-end justify-start pb-16 sm:pb-20 lg:pb-24">
        <div className="halloween-copy max-w-xl rounded-3xl border border-ember-500/30 bg-ink-950/75 p-6 sm:p-9 shadow-2xl backdrop-blur-md">
          <p className="text-xs sm:text-sm tracking-[0.32em] uppercase text-ember-400 mb-4">
            Collection Halloween — édition limitée
          </p>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl leading-[1.02] text-bone-50 mb-5">
            Une nuit
            <span className="block text-ember-400">plus magique chez BOO SHOP.</span>
          </h1>
          <p className="text-bone-200/85 text-base sm:text-lg leading-relaxed mb-7">
            Lanternes, citrouilles, pleine lune et boutique gothique : l’univers Halloween BOO SHOP reste sombre, élégant et immédiatement reconnaissable.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href={heroHref} className="inline-flex items-center justify-center rounded-full bg-ember-500 hover:bg-ember-400 text-ink-950 font-semibold px-7 py-3.5 transition-all">
              Voir le produit vedette
            </Link>
            <Link href="#collection" className="inline-flex items-center justify-center rounded-full border border-white/20 bg-black/20 hover:bg-black/30 text-bone-50 px-7 py-3.5 transition-colors">
              Découvrir la collection
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
