import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";

const PETALS = Array.from({ length: 16 }, (_, index) => ({
  left: `${(index * 43) % 101}%`,
  top: `-${6 + (index % 5) * 8}%`,
  size: `${7 + (index % 4) * 2}px`,
  duration: `${10 + (index % 7)}s`,
  delay: `${index * -0.75}s`,
}));

export function EasterHero({ heroHref }: { heroHref: string }) {
  return (
    <section className="easter-hero relative min-h-[720px] overflow-hidden border-b border-white/10">
      <div className="easter-scene absolute inset-0" aria-hidden>
        <Image
          src="/themes/paques/hero.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
      </div>
      <div className="easter-overlay absolute inset-0" aria-hidden />
      <div className="easter-petals absolute inset-0 pointer-events-none" aria-hidden>
        {PETALS.map((petal, index) => (
          <i
            key={index}
            style={{
              left: petal.left,
              top: petal.top,
              width: petal.size,
              height: `${Number.parseInt(petal.size, 10) * 0.72}px`,
              animationDuration: petal.duration,
              animationDelay: petal.delay,
            } as CSSProperties}
          />
        ))}
      </div>

      <div className="relative z-10 container min-h-[720px] flex items-end justify-start pb-16 sm:pb-20 lg:pb-24">
        <div className="easter-copy max-w-xl rounded-3xl border border-[#c8b37a]/35 bg-[#243126]/78 p-6 sm:p-9 shadow-2xl backdrop-blur-md">
          <p className="text-xs sm:text-sm tracking-[0.32em] uppercase text-[#e8d79d] mb-4">
            Collection de Pâques — édition printanière
          </p>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl leading-[1.02] text-[#fffaf0] mb-5">
            Pâques en douceur
            <span className="block text-[#e8d79d]">chez BOO SHOP.</span>
          </h1>
          <p className="text-[#fffaf0]/85 text-base sm:text-lg leading-relaxed mb-7">
            Ivoire, vert mousse et or vieilli : une sélection lumineuse inspirée des fleurs, des cadeaux et des détails raffinés du printemps.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href={heroHref} className="inline-flex items-center justify-center rounded-full bg-[#667a4f] hover:bg-[#788d5b] border border-[#c8b37a] text-white font-semibold px-7 py-3.5 transition-all">
              Voir le produit vedette
            </Link>
            <Link href="#collection" className="inline-flex items-center justify-center rounded-full border border-[#e8d79d]/45 bg-black/15 hover:bg-black/25 text-[#fffaf0] px-7 py-3.5 transition-colors">
              Découvrir la collection
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
