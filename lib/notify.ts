import { STORE } from "@/lib/store-config";

// Tells the shop owner by e-mail that a new order has been paid, through Resend's REST
// API (https://resend.com/docs/api-reference/emails/send-email) — no SDK.
// It is opt-in: without OWNER_NOTIFY_EMAIL and RESEND_API_KEY it does nothing and never
// fails. When Resend does fail it throws, and the caller (the Stripe webhook) must catch
// it: an e-mail problem must never break an order.

export type PaidOrderSummary = {
  id: string;
  total: number;
  items: { name: string; quantity: number }[];
};

// Resend's shared test sender: works without a verified domain, but only delivers to the
// e-mail address of the Resend account itself.
const DEFAULT_SENDER = "BOO SHOP <onboarding@resend.dev>";

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const euros = (amount: number) => `${amount.toFixed(2).replace(".", ",")} €`;

export async function notifyOwnerOfPaidOrder(order: PaidOrderSummary): Promise<"sent" | "skipped"> {
  const to = process.env.OWNER_NOTIFY_EMAIL?.trim();
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!to || !apiKey) return "skipped";

  const adminUrl = `${STORE.siteUrl.replace(/\/$/, "")}/admin/orders`;
  const lines = order.items.map((item) => `${item.quantity} × ${item.name}`);
  // Deliberately no customer name, e-mail or address: the order is read in the admin.
  const text = [
    `Nouvelle commande payée sur ${STORE.name}.`,
    "",
    `Commande : ${order.id}`,
    "Articles :",
    ...lines.map((line) => `- ${line}`),
    `Total : ${euros(order.total)}`,
    "",
    `À traiter dans l’admin : ${adminUrl}`,
    "Rien n’est envoyé à CJ automatiquement : vérifie la commande puis clique sur « Envoyer à CJ ».",
  ].join("\n");
  const html = [
    `<p>Nouvelle commande payée sur ${escapeHtml(STORE.name)}.</p>`,
    `<p><strong>Commande :</strong> ${escapeHtml(order.id)}</p>`,
    `<ul>${lines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>`,
    `<p><strong>Total :</strong> ${escapeHtml(euros(order.total))}</p>`,
    `<p><a href="${escapeHtml(adminUrl)}">Ouvrir les commandes dans l’admin</a></p>`,
    "<p>Rien n’est envoyé à CJ automatiquement : vérifie la commande puis clique sur « Envoyer à CJ ».</p>",
  ].join("");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.OWNER_NOTIFY_FROM?.trim() || DEFAULT_SENDER,
      to: [to],
      subject: `Nouvelle commande payée : ${euros(order.total)}`,
      text,
      html,
    }),
    // Do not keep the Stripe webhook waiting on a slow mail provider.
    signal: AbortSignal.timeout(5000),
  });
  // Status only: Resend's error body is not relayed.
  if (!response.ok) throw new Error(`Resend a répondu ${response.status}`);
  return "sent";
}
