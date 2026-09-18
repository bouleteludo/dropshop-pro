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

    // Idempotency — Stripe can retry the same event more than once.
    const existing = await prisma.order.findUnique({ where: { stripeSessionId: session.id } });
    if (existing) {
      return NextResponse.json({ received: true });
    }

    const items = JSON.parse(session.metadata?.items ?? "[]") as { productId: string; quantity: number }[];
    const products = await prisma.product.findMany({
      where: { id: { in: items.map((i) => i.productId) } },
    });

    const shipping = session.collected_information?.shipping_details ?? session.customer_details;
    const addressParts = [
      shipping?.address?.line1,
      shipping?.address?.line2,
      shipping?.address?.postal_code,
      shipping?.address?.city,
      shipping?.address?.country,
    ].filter(Boolean);

    const orderItems = items
      .map((item) => {
        const product = products.find((p) => p.id === item.productId);
        if (!product) return null;
        return { productId: product.id, quantity: item.quantity, unitPrice: product.price };
      })
      .filter((i): i is NonNullable<typeof i> => i !== null);

    await prisma.$transaction([
      prisma.order.create({
        data: {
          customerName: session.customer_details?.name ?? "Client",
          customerEmail: session.customer_details?.email ?? "",
          address: addressParts.join(", "),
          status: "PAID",
          stripeSessionId: session.id,
          total: (session.amount_total ?? 0) / 100,
          items: { create: orderItems },
        },
      }),
      ...orderItems.map((item) =>
        prisma.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        }),
      ),
    ]);
  }

  return NextResponse.json({ received: true });
}
