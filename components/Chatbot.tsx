"use client";

import { FormEvent, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };

const starters = [
  "Je cherche un cadeau de Noël original",
  "Quelle collection Halloween me conseilles-tu ?",
  "Explique-moi les personnages Neon Glow",
];

export function Chatbot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Bienvenue chez BOO 🎁 Je peux t'aider à trouver une collection ou un personnage." },
  ]);
  const [loading, setLoading] = useState(false);

  async function send(text?: string) {
    const value = (text ?? input).trim();
    if (!value || loading) return;
    const next = [...messages, { role: "user" as const, content: value }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.slice(-12) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Le chat est momentanément indisponible.");
      setMessages((current) => [...current, { role: "assistant", content: data.message }]);
    } catch (error) {
      setMessages((current) => [...current, { role: "assistant", content: (error as Error).message }]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: FormEvent) { e.preventDefault(); void send(); }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ouvrir l'assistant BOO"
        className="fixed bottom-5 right-5 z-50 inline-flex h-16 w-16 items-center justify-center rounded-full border border-amber-200/60 bg-gradient-to-br from-red-500 to-amber-300 text-3xl shadow-2xl shadow-red-900/30 transition hover:scale-105"
      >
        🎁
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-stretch justify-center bg-black/70 p-0 backdrop-blur-sm sm:p-5">
          <div className="relative flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-none border border-white/10 bg-[#081312] shadow-2xl sm:h-[calc(100vh-40px)] sm:rounded-[30px]">
            <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-red-950/70 via-[#0d2a20] to-[#3a2a07] px-5 py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-amber-200/70">BOO assistant</p>
                <h2 className="mt-1 text-xl font-semibold text-white">Le comptoir magique 🎅</h2>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-full border border-white/10 px-3 py-2 text-sm text-white/70 hover:text-white">Fermer</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-8">
              <div className="mx-auto flex max-w-3xl flex-col gap-3">
                {messages.map((m, i) => (
                  <div key={`${m.role}-${i}`} className={`max-w-[85%] rounded-3xl px-4 py-3 text-sm leading-relaxed ${m.role === "user" ? "ml-auto bg-amber-100 text-[#172018]" : "bg-white/7 text-white/80 border border-white/8"}`}>
                    {m.content}
                  </div>
                ))}
                {messages.length === 1 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {starters.map((s) => <button key={s} type="button" onClick={() => void send(s)} className="rounded-full border border-amber-200/20 bg-white/5 px-3 py-2 text-xs text-white/70 hover:bg-white/10">{s}</button>)}
                  </div>
                )}
                {loading && <div className="w-fit rounded-3xl border border-white/8 bg-white/7 px-4 py-3 text-sm text-white/45">BOO réfléchit…</div>}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="border-t border-white/10 bg-black/20 p-4">
              <div className="mx-auto flex max-w-3xl gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Pose ta question…"
                  className="min-w-0 flex-1 rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-amber-200/50"
                />
                <button disabled={loading} className="rounded-full bg-amber-200 px-5 py-3 text-sm font-semibold text-[#152017] disabled:opacity-50">Envoyer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}