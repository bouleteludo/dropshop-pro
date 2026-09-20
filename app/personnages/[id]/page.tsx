import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BOO_CHARACTERS, getCharacter } from "@/lib/boo-characters";
import { CharacterAvatar } from "@/components/CharacterAvatar";

type Props = { params: Promise<{ id: string }> };

export async function generateStaticParams() {
  return BOO_CHARACTERS.map((c) => ({ id: c.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const c = getCharacter(id);
  if (!c) return {};
  return { title: c.name, description: `${c.name} — ${c.collectionLabel} BOO.` };
}

export default async function CharacterPage({ params }: Props) {
  const { id } = await params;
  const c = getCharacter(id);
  if (!c) notFound();
  return (
    <main className="min-h-screen bg-[#071210] text-white py-10 sm:py-16">
      <div className="container">
        <Link href="/personnages" className="text-sm text-white/45 hover:text-white">← Tous les personnages</Link>
        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_1.1fr] items-center">
          <div className="mx-auto w-full max-w-md"><CharacterAvatar character={c} /></div>
          <div>
            <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">{c.collectionLabel}</span>
            <h1 className="mt-4 font-display text-4xl sm:text-6xl">{c.name}</h1>
            <p className="mt-4 text-lg text-white/65">{c.tagline}</p>
            <div className="mt-8 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><p className="text-xs text-white/35">Style</p><p className="mt-1 font-medium">Personnage sensoriel BOO</p></div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><p className="text-xs text-white/35">Statut</p><p className="mt-1 font-medium">{c.isNew ? "Nouveau design" : "Déjà dans l'univers BOO"}</p></div>
            </div>
            <p className="mt-8 max-w-xl leading-relaxed text-white/60">Ce personnage est présenté comme une identité visuelle de collection. Les spécifications de matière, dimensions, conformité et fabrication seront définies avec le fabricant avant commercialisation.</p>
            <Link href="/personnages" className="mt-8 inline-flex rounded-full bg-amber-200 px-6 py-3 font-semibold text-[#102017]">Découvrir la collection</Link>
          </div>
        </div>
      </div>
    </main>
  );
}