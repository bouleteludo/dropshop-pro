"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Draft = {
  shippingCustomerName: string;
  shippingAddress: string;
  shippingAddress2?: string;
  shippingZip: string;
  shippingCity: string;
  shippingCountryCode: string;
  shippingPhone: string;
  products: { name: string; sku: string; quantity: number }[];
};

type Feedback =
  | { kind: "sent"; text: string }
  | { kind: "simulation"; draft: Draft }
  | { kind: "error"; text: string };

// Envoi d'une commande payée à CJ. Jamais automatique : le propriétaire clique, confirme,
// et CJ crée la commande sans la payer (à régler depuis le compte CJ).
export function SendToCjButton({ orderId, status, cjOrderId }: { orderId: string; status: string; cjOrderId: string | null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState("");
  const [needsPhone, setNeedsPhone] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  if (status === "SENT_TO_CJ" || cjOrderId) {
    return <p className="text-xs text-emerald-400">Déjà envoyée à CJ{cjOrderId ? ` (n° ${cjOrderId})` : ""}. Aucun renvoi possible.</p>;
  }
  if (status !== "PAID") return null;

  async function run(dryRun: boolean) {
    if (loading) return;
    if (!dryRun && !window.confirm("Envoyer cette commande à CJ ?\n\nCJ va créer la commande chez le fournisseur (sans la payer : tu la règles depuis ton compte CJ). Cet envoi ne peut pas être refait.")) return;
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/cj`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun, ...(phone.trim() ? { phone: phone.trim() } : {}) }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
        cjOrderId?: string;
        dryRun?: boolean;
        draft?: Draft;
      };
      if (!res.ok) {
        if (data.code === "MISSING_PHONE" || data.code === "INVALID_PHONE") setNeedsPhone(true);
        setFeedback({ kind: "error", text: data.error ?? `Erreur ${res.status}` });
        // The order may have been recorded or changed meanwhile: show the current state.
        if (data.code === "ALREADY_SENT" || data.code === "CONFLICT" || data.code === "RECORD_FAILED") router.refresh();
        return;
      }
      if (data.dryRun && data.draft) {
        setFeedback({ kind: "simulation", draft: data.draft });
        return;
      }
      setFeedback({ kind: "sent", text: `Commande envoyée à CJ (n° ${data.cjOrderId ?? "?"}). Pense à la régler depuis ton compte CJ.` });
      router.refresh();
    } catch {
      setFeedback({ kind: "error", text: "Impossible de joindre le serveur. Vérifie dans ton compte CJ avant de réessayer." });
    } finally {
      setLoading(false);
    }
  }

  const button = "rounded-lg px-3 py-1.5 text-sm disabled:opacity-50";
  return (
    <div className="space-y-2">
      {needsPhone && (
        <label className="block text-xs text-bone-400">
          Téléphone du client (exigé par CJ)
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+33 6 12 34 56 78"
            maxLength={40}
            className="mt-1 block w-full md:w-56 bg-ink-900 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-bone-50"
          />
        </label>
      )}
      <div className="flex flex-wrap gap-2 md:justify-end">
        <button type="button" onClick={() => run(true)} disabled={loading} className={`${button} border border-white/10 text-bone-50`}>
          Simuler l’envoi
        </button>
        <button type="button" onClick={() => run(false)} disabled={loading} className={`${button} bg-ember-300 text-ink-900 font-medium`}>
          {loading ? "Envoi…" : "Envoyer à CJ"}
        </button>
      </div>
      {feedback?.kind === "sent" && <p role="status" className="text-xs text-emerald-400">{feedback.text}</p>}
      {feedback?.kind === "error" && <p role="alert" className="text-xs text-red-400">{feedback.text}</p>}
      {feedback?.kind === "simulation" && (
        <div role="status" className="rounded-xl bg-ink-800 p-3 text-xs text-bone-400 md:text-left">
          <p className="text-bone-50">Simulation : rien n’a été envoyé à CJ.</p>
          <p className="mt-1">
            {feedback.draft.shippingCustomerName}, {feedback.draft.shippingAddress}
            {feedback.draft.shippingAddress2 ? `, ${feedback.draft.shippingAddress2}` : ""}, {feedback.draft.shippingZip} {feedback.draft.shippingCity} ({feedback.draft.shippingCountryCode}) — tél. {feedback.draft.shippingPhone}
          </p>
          <ul className="mt-1">
            {feedback.draft.products.map((p) => (
              <li key={p.sku}>{p.quantity} × {p.name} ({p.sku})</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
