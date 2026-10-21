import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";

const SNOW = Array.from({ length: 22 }, (_, index) => ({
  left: `${(index * 47) % 101}%`,
  top: `-${8 + (index % 7) * 5}%`,
  size: `${2 + (index % 4)}px`,
  duration: `${8 + (index % 8)}s`,
  delay: `${index * -0.65}s`,
}));

export function ChristmasHero({ heroHref }: { heroHref: string }) {
  return (
    <section className="christmas-hero relative min-h-[720px] overflow-hidden border-b border-white/10">
      <div className="christmas-scene absolute inset-0" aria-hidden>
        <Image
          src="/themes/noel/hero.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
      </div>
      <div className="christmas-overlay absolute inset-0" aria-hidden />
      <div className="christmas-snow absolute inset-0 pointer-events-none" aria-hidden>
        {SNOW.map((flake, index) => (
          <i
            key={index}
            style={{
              left: flake.left,
              top: flake.top,
              width: flake.size,
              height: flake.size,
              animationDuration: flake.duration,
              animationDelay: flake.delay,
            } as CSSProperties}
          />
        ))}
      </div>
      <div className="christmas-gift gift-one" aria-hidden>🎁</div>
      <div className="christmas-gift gift-two" aria-hidden>🎁</div>
      <div className="christmas-gift gift-three" aria-hidden>🎁</div>

      <div className="relative z-10 container min-h-[720px] flex items-end justify-end pb-16 sm:pb-20 lg:pb-24">
        <div className="christmas-copy max-w-xl rounded-3xl border border-[#f3d47a]/30 bg-[#031b12]/72 p-6 sm:p-9 shadow-2xl backdrop-blur-md">
          <p className="text-xs sm:text-sm tracking-[0.32em] uppercase text-[#f3d47a] mb-4">
            Collection de Noël — édition saisonnière
          </p>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl leading-[1.02] text-[#fffaf0] mb-5">
            La magie de Noël
            <span className="block text-[#f3d47a]">s’installe chez BOO SHOP.</span>
          </h1>
          <p className="text-[#fffaf0]/85 text-base sm:text-lg leading-relaxed mb-7">
            Cadeaux, lumières dorées, neige et ambiance de village de Noël : une sélection pensée pour créer un vrai moment de fête.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href={heroHref} className="inline-flex items-center justify-center rounded-full bg-[#b31325] hover:bg-[#cf2335] border border-[#d8b84f] text-white font-semibold px-7 py-3.5 transition-all">
              Voir le produit vedette
            </Link>
            <Link href="#collection" className="inline-flex items-center justify-center rounded-full border border-[#f3d47a]/45 bg-black/15 hover:bg-black/30 text-[#fffaf0] px-7 py-3.5 transition-colors">
              Découvrir la collection
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
