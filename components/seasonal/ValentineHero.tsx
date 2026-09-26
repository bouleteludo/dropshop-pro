import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";

const PETALS = Array.from({ length: 18 }, (_, index) => ({
  left: `${(index * 37) % 98}%`,
  top: `-${6 + (index % 6) * 7}%`,
  size: `${8 + (index % 5) * 2}px`,
  duration: `${9 + (index % 7)}s`,
  delay: `${index * -0.8}s`,
}));

export function ValentineHero({ heroHref }: { heroHref: string }) {
  return (
    <section className="valentine-hero relative min-h-[720px] overflow-hidden border-b border-white/10">
      <div className="valentine-scene absolute inset-0" aria-hidden>
        <Image
          src="/themes/valentine/hero.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
      </div>
      <div className="valentine-overlay absolute inset-0" aria-hidden />
      <div className="valentine-petals absolute inset-0 pointer-events-none" aria-hidden>
        {PETALS.map((petal, index) => (
          <i
            key={index}
            style={{
              left: petal.left,
              top: petal.top,
              width: petal.size,
              height: `${Number.parseInt(petal.size, 10) * 1.35}px`,
              animationDuration: petal.duration,
              animationDelay: petal.delay,
            } as CSSProperties}
          />
        ))}
      </div>

      <div className="relative z-10 container min-h-[720px] flex items-end justify-start pb-16 sm:pb-20 lg:pb-24">
        <div className="valentine-copy max-w-xl rounded-3xl border border-[#e4aa9b]/30 bg-[#25060d]/74 p-6 sm:p-9 shadow-2xl backdrop-blur-md">
          <p className="text-xs sm:text-sm tracking-[0.32em] uppercase text-[#f0b9aa] mb-4">
            Collection Saint-Valentin — édition romantique
          </p>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl leading-[1.02] text-[#fff4ef] mb-5">
            Des attentions
            <span className="block text-[#f0b9aa]">qui comptent vraiment.</span>
          </h1>
          <p className="text-[#fff4ef]/85 text-base sm:text-lg leading-relaxed mb-7">
            Rouge profond, roses, bougies et détails précieux : une sélection pensée pour offrir un moment élégant, intime et mémorable.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href={heroHref} className="inline-flex items-center justify-center rounded-full bg-[#a30f2d] hover:bg-[#c1163a] border border-[#dba692] text-white font-semibold px-7 py-3.5 transition-all">
              Voir le produit vedette
            </Link>
            <Link href="#collection" className="inline-flex items-center justify-center rounded-full border border-[#e9b8a8]/45 bg-black/15 hover:bg-black/30 text-[#fff4ef] px-7 py-3.5 transition-colors">
              Découvrir la collection
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
