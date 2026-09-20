import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CharacterCard } from "@/components/CharacterCard";
import { BOO_CHARACTERS, COLLECTIONS, type CollectionSlug } from "@/lib/boo-characters";
type Props={params:Promise<{slug:string}>};
export async function generateStaticParams(){return COLLECTIONS.map(c=>({slug:c.slug}));}
export async function generateMetadata({params}:Props):Promise<Metadata>{const {slug}=await params;const c=COLLECTIONS.find(x=>x.slug===slug);return c?{title:c.label,description:c.description}:{};}
export default async function CollectionPage({params}:Props){const {slug}=await params;const c=COLLECTIONS.find(x=>x.slug===slug);if(!c)notFound();const chars=BOO_CHARACTERS.filter(x=>x.collection===slug as CollectionSlug);return <main className="min-h-screen bg-[#071210] py-12 sm:py-20 text-white"><div className="container"><Link href="/personnages" className="text-sm text-white/45 hover:text-white">← Tous les personnages</Link><div className="mt-8 rounded-[32px] border border-white/10 bg-white/[.03] p-7 sm:p-12"><p className="text-xs uppercase tracking-[.35em] text-amber-200/65">{c.emoji} Collection BOO</p><h1 className="mt-3 font-display text-4xl sm:text-6xl">{c.label}</h1><p className="mt-4 max-w-2xl text-white/55">{c.description}</p></div><div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">{chars.map(x=><CharacterCard key={x.id} character={x}/>)}</div></div></main>}