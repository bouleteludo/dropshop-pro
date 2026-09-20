"use client";

import { FormEvent, useState } from "react";

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.get("email"), message: form.get("message") }) });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Erreur"); return; }
    setSent(true); e.currentTarget.reset();
  }

  return (
    <main className="min-h-[70vh] bg-[#071210] py-12 sm:py-20 text-white">
      <div className="container max-w-3xl">
        <p className="text-xs uppercase tracking-[0.35em] text-amber-200/65">BOO support</p>
        <h1 className="mt-3 font-display text-4xl sm:text-6xl">Contact</h1>
        <p className="mt-4 text-white/55">Une question sur les collections, un projet fournisseur ou une idée de personnage ?</p>
        <form onSubmit={submit} className="mt-10 space-y-5 rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
          <div><label className="mb-2 block text-sm text-white/70">Votre email</label><input name="email" type="email" required className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-amber-200/40" /></div>
          <div><label className="mb-2 block text-sm text-white/70">Message</label><textarea name="message" required rows={7} className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-amber-200/40" /></div>
          {error && <p className="text-sm text-red-300">{error}</p>}
          {sent && <p className="text-sm text-emerald-300">Votre demande a été enregistrée. La connexion à un service d'email peut être ajoutée ensuite.</p>}
          <button className="rounded-full bg-amber-200 px-6 py-3 font-semibold text-[#102017]">Envoyer</button>
        </form>
      </div>
    </main>
  );
}