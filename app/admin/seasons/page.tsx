"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Season = {
  id: string; slug: string; name: string; tagline: string; startMonth: number; startDay: number; endMonth: number; endDay: number;
  heroTitle: string; heroSubtitle: string; badgeText: string; accent: string; secondary: string; background: string; foreground: string; active: boolean; priority: number;
};

const emptyForm = { slug: "", name: "", tagline: "", startMonth: "", startDay: "", endMonth: "", endDay: "", heroTitle: "", heroSubtitle: "", badgeText: "ÉDITION", accent: "#c1651f", secondary: "#4a2f74", background: "#08090b", foreground: "#f6f1ea", priority: "50" };

export default function SeasonsPage() {
  const [seasons, setSeasons] = useState<Season[]>([]); const [form, setForm] = useState(emptyForm); const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState<string | null>(null); const [creating, setCreating] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  async function load() { const res = await fetch("/api/admin/seasons", { cache: "no-store" }); const data = await res.json(); if (!res.ok) throw new Error(data.error ?? "Chargement échoué"); setSeasons(data.seasons ?? []); }
  useEffect(() => { load().catch((e) => setError(e.message)); }, []);
  async function patch(body: Record<string, unknown>, id: string) { setBusy(id); setError(null); try { const res = await fetch("/api/admin/seasons", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...body }) }); const data = await res.json(); if (!res.ok) throw new Error(data.error ?? "Modification échouée"); setSeasons((items) => items.map((item) => item.id === id ? data.season : item)); } catch (e) { setError((e as Error).message); } finally { setBusy(null); } }
  async function editCopy(season: Season) { const value = window.prompt("Nouveau texte du hero", season.heroTitle); if (value && value !== season.heroTitle) await patch({ heroTitle: value }, season.id); }
  async function createSeason(e: FormEvent) { e.preventDefault(); setCreating(true); setError(null); try { const res = await fetch("/api/admin/seasons", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, startMonth: Number(form.startMonth), startDay: Number(form.startDay), endMonth: Number(form.endMonth), endDay: Number(form.endDay), priority: Number(form.priority) }) }); const data = await res.json(); if (!res.ok) throw new Error(data.error ?? "Création échouée"); setSeasons((items) => [...items, data.season]); setPreviewId(data.season.id); setForm(emptyForm); } catch (e) { setError((e as Error).message); } finally { setCreating(false); } }
  const preview = useMemo(() => seasons.find((season) => season.id === previewId) ?? seasons[0] ?? null, [previewId, seasons]);
  const field = (key: keyof typeof form, placeholder: string) => <input value={form[key]} onChange={(e) => setForm((v) => ({ ...v, [key]: e.target.value }))} className="rounded-xl border border-white/10 bg-ink-800 px-3 py-2.5 text-sm text-bone-50 outline-none focus:border-ember-500" placeholder={placeholder} />;
  return <main>
    <p className="text-sm text-bone-400 mb-6 max-w-3xl">Le moteur saisonnier bascule automatiquement selon les dates. Avant de modifier la boutique, sélectionne une saison pour voir son rendu, ses couleurs et son hero directement dans l&apos;Admin.</p>
    {error && <p className="mb-6 rounded-xl border border-red-400/30 bg-red-400/5 px-4 py-3 text-sm text-red-300">{error}</p>}

    {preview && <section className="mb-6 overflow-hidden rounded-3xl border border-white/10" style={{ background: preview.background, color: preview.foreground }}>
      <div className="p-4 sm:p-6 border-b border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div><p className="text-[11px] uppercase tracking-[0.28em]" style={{ color: preview.accent }}>Prévisualisation</p><h2 className="font-display text-2xl mt-1">{preview.name}</h2><p className="text-sm opacity-70 mt-1">Ce rendu est une simulation : aucun changement n&apos;est appliqué par le bouton ci-dessous.</p></div>
        <button type="button" onClick={() => setPreviewId(null)} className="self-start sm:self-auto rounded-full border border-white/10 px-4 py-2 text-xs opacity-80 hover:opacity-100">Fermer l&apos;aperçu</button>
      </div>
      <div className="p-5 sm:p-8" style={{ background: `radial-gradient(ellipse 70% 70% at 50% 0%, color-mix(in srgb, ${preview.accent} 27%, transparent), transparent 65%), radial-gradient(ellipse 45% 45% at 90% 20%, color-mix(in srgb, ${preview.secondary} 22%, transparent), transparent 60%)` }}>
        <div className="max-w-4xl mx-auto rounded-[2rem] border border-white/10 bg-black/10 p-5 sm:p-8 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-4 mb-12"><span className="font-display tracking-[0.22em] text-sm">BOO<span style={{ color: preview.accent }}>·</span>SHOP</span><span className="rounded-full border border-white/10 px-3 py-1.5 text-[11px]">{preview.badgeText}</span></div>
          <p className="text-xs uppercase tracking-[0.32em] mb-4" style={{ color: preview.accent }}>{preview.badgeText}</p>
          <h3 className="font-display text-4xl sm:text-6xl leading-[1.02] max-w-3xl">{preview.heroTitle}</h3>
          <p className="mt-5 max-w-2xl text-sm sm:text-base opacity-75 leading-relaxed">{preview.heroSubtitle}</p>
          <div className="mt-7 flex flex-wrap gap-2"><span className="rounded-full px-5 py-3 text-sm font-semibold" style={{ background: preview.accent, color: "#08090b" }}>Découvrir la saison</span><span className="rounded-full border border-white/10 px-5 py-3 text-sm">Voir la collection</span></div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-10"><div className="h-20 rounded-2xl border border-white/10" style={{ background: `linear-gradient(145deg, ${preview.accent}, ${preview.secondary})` }} /><div className="h-20 rounded-2xl border border-white/10" style={{ background: preview.background }} /><div className="h-20 rounded-2xl border border-white/10" style={{ background: preview.secondary }} /><div className="h-20 rounded-2xl border border-white/10" style={{ background: preview.foreground, borderColor: "rgba(0,0,0,.15)" }} /></div>
          <div className="mt-4 text-[11px] opacity-60">Palette : accent {preview.accent} · secondaire {preview.secondary} · fond {preview.background}</div>
        </div>
      </div>
    </section>}

    <div className="grid lg:grid-cols-2 gap-4">
      {seasons.map((season) => <article key={season.id} className={`rounded-2xl border bg-ink-900 p-5 overflow-hidden relative transition-colors ${previewId === season.id ? "border-ember-500/50" : "border-white/10"}`}><div className="absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg, ${season.accent}, ${season.secondary})` }} /><div className="flex items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.25em]" style={{ color: season.accent }}>{season.badgeText}</p><h2 className="font-display text-2xl text-bone-50 mt-2">{season.name}</h2><p className="text-sm text-bone-400 mt-1">{season.tagline}</p></div><button onClick={() => patch({ active: !season.active }, season.id)} disabled={busy === season.id} className={`rounded-full px-3 py-1.5 text-xs border ${season.active ? "border-emerald-400/30 text-emerald-300" : "border-white/10 text-bone-400"}`}>{season.active ? "Active" : "Désactivée"}</button></div><div className="mt-5 grid grid-cols-2 gap-3 text-xs"><div className="rounded-xl border border-white/5 bg-ink-800 p-3"><p className="text-bone-400">Période</p><p className="text-bone-50 mt-1">{String(season.startDay).padStart(2,"0")}/{String(season.startMonth).padStart(2,"0")} → {String(season.endDay).padStart(2,"0")}/{String(season.endMonth).padStart(2,"0")}</p></div><div className="rounded-xl border border-white/5 bg-ink-800 p-3"><p className="text-bone-400">Priorité</p><p className="text-bone-50 mt-1">{season.priority}</p></div></div><p className="mt-4 text-sm text-bone-200 leading-relaxed">{season.heroTitle}</p><p className="mt-2 text-sm text-bone-400 leading-relaxed">{season.heroSubtitle}</p><div className="mt-5 flex flex-wrap gap-2"><button onClick={() => setPreviewId(season.id)} className="rounded-full bg-ember-500 px-4 py-2 text-xs font-semibold text-ink-950 hover:bg-ember-400">Prévisualiser</button><button onClick={() => editCopy(season)} disabled={busy === season.id} className="rounded-full border border-white/10 px-4 py-2 text-xs text-bone-200 hover:border-ember-500/40 hover:text-ember-300">Modifier le hero</button></div></article>)}
    </div>

    <section className="mt-6 rounded-2xl border border-white/10 bg-ink-900 p-5 sm:p-6"><p className="text-xs uppercase tracking-[0.25em] text-ember-400">Nouvelle campagne</p><h2 className="font-display text-2xl text-bone-50 mt-2">Créer une saison</h2><form onSubmit={createSeason} className="mt-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{field("slug", "slug : black-friday")}{field("name", "Nom : Black Friday")}{field("tagline", "Accroche")}{field("startMonth", "Mois début : 11")}{field("startDay", "Jour début : 01")}{field("endMonth", "Mois fin : 12")}{field("endDay", "Jour fin : 05")}{field("badgeText", "ÉDITION BLACK FRIDAY")}{field("heroTitle", "Titre du hero")}{field("heroSubtitle", "Sous-titre")}{field("accent", "#c1651f")}{field("secondary", "#4a2f74")}{field("background", "#08090b")}{field("foreground", "#f6f1ea")}{field("priority", "50")}<div className="sm:col-span-2 lg:col-span-3 flex justify-end"><button type="submit" disabled={creating} className="rounded-full bg-ember-500 px-6 py-2.5 text-sm font-semibold text-ink-950 disabled:opacity-50">{creating ? "Création…" : "Créer la saison"}</button></div></form></section>
  </main>;
}
