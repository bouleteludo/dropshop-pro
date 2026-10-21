import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";

const SPARKLES = Array.from({ length: 14 }, (_, index) => ({
  left: `${(index * 41) % 100}%`,
  top: `${14 + (index % 6) * 10}%`,
  size: `${4 + (index % 3) * 2}px`,
  duration: `${4 + (index % 4)}s`,
  delay: `${index * -0.7}s`,
}));

export function SummerHero({ heroHref }: { heroHref: string }) {
  return (
    <section className="summer-hero relative min-h-[720px] overflow-hidden border-b border-white/10">
      <div className="summer-scene absolute inset-0" aria-hidden>
        <Image
          src="/themes/ete/hero.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
      </div>
      <div className="summer-overlay absolute inset-0" aria-hidden />
      <div className="summer-sparkles absolute inset-0 pointer-events-none" aria-hidden>
        {SPARKLES.map((sparkle, index) => (
          <i
            key={index}
            style={{
              left: sparkle.left,
              top: sparkle.top,
              width: sparkle.size,
              height: sparkle.size,
              animationDuration: sparkle.duration,
              animationDelay: sparkle.delay,
            } as CSSProperties}
          />
        ))}
      </div>
      <div className="summer-float summer-shell" aria-hidden>🐚</div>
      <div className="summer-float summer-star" aria-hidden>⭐</div>
      <div className="summer-float summer-sun" aria-hidden>☀️</div>

      <div className="relative z-10 container min-h-[720px] flex items-end justify-start pb-16 sm:pb-20 lg:pb-24">
        <div className="summer-copy max-w-xl rounded-3xl border border-[#e2c487]/35 bg-[#08273a]/72 p-6 sm:p-9 shadow-2xl backdrop-blur-md">
          <p className="text-xs sm:text-sm tracking-[0.32em] uppercase text-[#f5d98b] mb-4">
            Collection été — golden hour
          </p>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl leading-[1.02] text-[#fff6ea] mb-5">
            L’été s’invite
            <span className="block text-[#f5d98b]">chez BOO SHOP.</span>
          </h1>
          <p className="text-[#fff6ea]/85 text-base sm:text-lg leading-relaxed mb-7">
            Sable chaud, bleu pétrole et lumière dorée : une sélection solaire et premium, pensée pour les découvertes estivales et les cadeaux de saison.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href={heroHref} className="inline-flex items-center justify-center rounded-full bg-[#d89137] hover:bg-[#e0a14f] border border-[#f1d08b] text-[#08273a] font-semibold px-7 py-3.5 transition-all">
              Voir le produit vedette
            </Link>
            <Link href="#collection" className="inline-flex items-center justify-center rounded-full border border-[#f5d98b]/45 bg-black/15 hover:bg-black/25 text-[#fff6ea] px-7 py-3.5 transition-colors">
              Découvrir la collection
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
