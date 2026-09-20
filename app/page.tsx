import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/ProductCard";
import { CharacterCard } from "@/components/CharacterCard";
import { CHRISTMAS_CHARACTERS, HALLOWEEN_NEW_CHARACTERS } from "@/lib/boo-characters";
export const dynamic = "force-dynamic";
export default async function HomePage() {
  const products = await prisma.product.findMany({ where:{active:true}, orderBy:{createdAt:"desc"} });
  return <main className="bg-[#071210] text-white overflow-hidden">
    <section className="min-h-[720px] bg-[radial-gradient(circle_at_15%_20%,rgba(215,25,32,.34),transparent_35%),radial-gradient(circle_at_85%_10%,rgba(31,107,69,.34),transparent_35%),linear-gradient(145deg,#071210,#10271d,#2a130f)]">
      <div className="container grid min-h-[720px] items-center gap-10 py-20 lg:grid-cols-[1.05fr_.95fr]">
        <div><span className="inline-flex rounded-full border border-amber-200/20 bg-white/5 px-4 py-2 text-xs uppercase tracking-[.24em] text-amber-100/80">🎄 BOO CHRISTMAS · nouvelle saison</span>
          <h1 className="mt-6 max-w-4xl font-display text-5xl leading-[.94] sm:text-7xl lg:text-8xl">Noël arrive chez <span className="text-amber-200">BOO.</span></h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/65">Une nouvelle famille de personnages sensoriels, des boîtes collector et une expérience pensée pour Noël, tout en conservant ton univers Halloween.</p>
          <div className="mt-8 flex flex-wrap gap-3"><Link href="/personnages#noel" className="rounded-full bg-white px-6 py-3 font-semibold text-[#102017]">Découvrir les 24 personnages</Link><Link href="/personnages#halloween" className="rounded-full border border-white/15 px-6 py-3">Nouveaux Halloween</Link></div>
          <div className="mt-10 grid max-w-xl grid-cols-3 gap-3"><div className="rounded-2xl border border-white/10 bg-white/5 p-4"><b className="text-2xl text-amber-200">24</b><small className="block text-white/45">personnages Noël</small></div><div className="rounded-2xl border border-white/10 bg-white/5 p-4"><b className="text-2xl text-purple-200">64</b><small className="block text-white/45">nouveaux Halloween</small></div><div className="rounded-2xl border border-white/10 bg-white/5 p-4"><b className="text-2xl text-emerald-200">5</b><small className="block text-white/45">collections</small></div></div>
        </div>
        <div className="grid grid-cols-3 gap-3 rounded-[38px] border border-white/10 bg-white/[.04] p-4 backdrop-blur">{CHRISTMAS_CHARACTERS.slice(0,9).map(c=><CharacterCard key={c.id} character={c}/>)}</div>
      </div>
    </section>
    <section id="noel" className="container py-20 sm:py-28"><div className="mb-10"><p className="text-xs uppercase tracking-[.35em] text-red-200/65">La collection</p><h2 className="mt-2 font-display text-3xl sm:text-5xl">🎄 24 personnages Noël</h2><p className="mt-3 text-white/50">Une vraie famille collectionnable pour décliner produits, boîtes et cartes.</p></div><div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">{CHRISTMAS_CHARACTERS.slice(0,12).map(c=><CharacterCard key={c.id} character={c}/>)}</div></section>
    <section id="halloween" className="border-y border-purple-300/10 bg-gradient-to-br from-[#0d0914] via-[#160d20] to-[#071210] py-20 sm:py-28"><div className="container"><div className="mb-10"><p className="text-xs uppercase tracking-[.35em] text-purple-200/60">Extension</p><h2 className="mt-2 font-display text-3xl sm:text-5xl">🎃 64 nouveaux Halloween</h2><p className="mt-3 text-white/50">16 nouveaux personnages dans chacune des 4 collections existantes.</p></div><div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">{HALLOWEEN_NEW_CHARACTERS.slice(0,16).map(c=><CharacterCard key={c.id} character={c}/>)}</div></div></section>
    {products.length>0&&<section id="collection" className="container py-20 sm:py-28"><h2 className="mb-10 font-display text-3xl sm:text-5xl">🛍️ Produits disponibles</h2><ul className="grid grid-cols-2 gap-4 lg:grid-cols-3">{products.slice(0,9).map(p=><li key={p.id}><ProductCard slug={p.slug??p.id} name={p.name} price={p.price} images={JSON.parse(p.images) as string[]} stock={p.stock}/></li>)}</ul></section>}
  </main>;
}