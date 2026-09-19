import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

// Stripe needs the raw request body to verify the webhook signature — Next.js
// route handlers must opt out of any body parsing/caching for that to work.
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET is not set" }, { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const body = await req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    return NextResponse.json({ error: `Signature invalide : ${(error as Error).message}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    if (session.payment_status !== "paid") {
      return NextResponse.json({ received: true });
    }

    // Idempotency — Stripe can retry the same event more than once.
    const existing = await prisma.order.findUnique({ where: { stripeSessionId: session.id } });
    if (existing) {
      return NextResponse.json({ received: true });
    }

    let items: { productId: string; quantity: number }[];
    try {
      items = JSON.parse(session.metadata?.items ?? "[]");
    } catch {
      return NextResponse.json({ error: "Métadonnées de commande invalides" }, { status: 400 });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Commande vide" }, { status: 400 });
    }

    const products = await prisma.product.findMany({ where: { id: { in: items.map((i) => i.productId) } } });
    if (products.length !== items.length) {
      // A product referenced by this checkout no longer exists (deleted since
      // the session was created) — surface it rather than silently dropping items.
      return NextResponse.json({ error: "Un ou plusieurs produits de la commande sont introuvables" }, { status: 500 });
    }

    const shipping = session.collected_information?.shipping_details ?? session.customer_details;
    const addressParts = [
      shipping?.address?.line1,
      shipping?.address?.line2,
      shipping?.address?.postal_code,
      shipping?.address?.city,
      shipping?.address?.country,
    ].filter(Boolean);

    try {
      await prisma.$transaction(async (tx) => {
        // Reserve/decrement stock atomically. If another order consumed the
        // stock between Checkout creation and this webhook firing, fail
        // instead of letting inventory go negative.
        for (const item of items) {
          if (!Number.isSafeInteger(item.quantity) || item.quantity < 1) {
            throw new Error("Quantité invalide");
          }
          const result = await tx.product.updateMany({
            where: { id: item.productId, stock: { gte: item.quantity } },
            data: { stock: { decrement: item.quantity } },
          });
          if (result.count !== 1) {
            throw new Error(`Stock insuffisant pour le produit ${item.productId}`);
          }
        }

        await tx.order.create({
          data: {
            customerName: session.customer_details?.name ?? shipping?.name ?? "Client",
            customerEmail: session.customer_details?.email ?? "",
            address: addressParts.join(", "),
            status: "PAID",
            stripeSessionId: session.id,
            total: (session.amount_total ?? 0) / 100,
            items: {
              create: items.map((item) => {
                const product = products.find((p) => p.id === item.productId)!;
                return { productId: product.id, quantity: item.quantity, unitPrice: product.price };
              }),
            },
          },
        });
      });
    } catch (error) {
      // Stripe retries webhooks on a non-2xx response, so this surfaces the
      // failure (e.g. oversold stock) for manual handling rather than
      // silently losing a paid order.
      console.error("Stripe order creation failed", error);
      return NextResponse.json({ error: (error as Error).message }, { status: 409 });
    }
  }

  return NextResponse.json({ received: true });
}
