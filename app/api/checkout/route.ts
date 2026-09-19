import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

// Creates a Stripe Checkout session for the current cart. Prices are always
// re-read from the database here — the client only sends product ids and
// quantities, never prices, so a tampered request can't check out at a
// different amount.
export async function POST(req: NextRequest) {
  let body: { items?: { productId: string; quantity: number }[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  const rawItems = Array.isArray(body.items) ? body.items : [];
  if (rawItems.length === 0) {
    return NextResponse.json({ error: "Panier vide" }, { status: 400 });
  }

  // Merge duplicate product lines and reject malformed quantities before
  // anything is sent to Stripe. The browser never supplies prices.
  const quantities = new Map<string, number>();
  for (const item of rawItems) {
    if (typeof item.productId !== "string" || !item.productId) {
      return NextResponse.json({ error: "Produit invalide" }, { status: 400 });
    }
    if (!Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 20) {
      return NextResponse.json({ error: "Quantité invalide (1 à 20 par produit)" }, { status: 400 });
    }
    quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
  }
  const items = [...quantities.entries()].map(([productId, quantity]) => ({ productId, quantity }));

  const products = await prisma.product.findMany({
    where: { id: { in: items.map((i) => i.productId) }, active: true },
  });
  if (products.length !== items.length) {
    return NextResponse.json({ error: "Un ou plusieurs produits ne sont plus disponibles" }, { status: 400 });
  }

  const lineItems: {
    quantity: number;
    price_data: {
      currency: string;
      unit_amount: number;
      product_data: { name: string; images: string[] };
    };
  }[] = [];

  for (const item of items) {
    const product = products.find((p) => p.id === item.productId)!;
    if (product.stock < item.quantity) {
      return NextResponse.json({ error: `Stock insuffisant pour "${product.name}"` }, { status: 400 });
    }
    let images: string[] = [];
    try {
      images = (JSON.parse(product.images) as string[]).filter(Boolean).slice(0, 1);
    } catch {
      // No usable image — Stripe just shows the line item without one.
    }
    lineItems.push({
      quantity: item.quantity,
      price_data: {
        currency: "eur",
        unit_amount: Math.round(product.price * 100),
        product_data: { name: product.name, images },
      },
    });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://boo-shop.vercel.app";

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      shipping_address_collection: { allowed_countries: ["FR", "BE", "CH", "LU", "MC"] },
      // Generic tier names on purpose — fulfillment goes through CJ's own carrier
      // choice (not a contracted French carrier), so naming a specific brand
      // (Colissimo, Chronopost...) here would be misleading. Estimates reflect
      // realistic dropshipping lead times, not next-day domestic delivery.
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: { amount: 490, currency: "eur" },
            display_name: "Livraison standard",
            delivery_estimate: {
              minimum: { unit: "business_day", value: 9 },
              maximum: { unit: "business_day", value: 18 },
            },
          },
        },
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: { amount: 990, currency: "eur" },
            display_name: "Livraison express",
            delivery_estimate: {
              minimum: { unit: "business_day", value: 5 },
              maximum: { unit: "business_day", value: 10 },
            },
          },
        },
      ],
      success_url: `${siteUrl}/commande/succes?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/cart`,
      metadata: {
        items: JSON.stringify(items),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe Checkout session creation failed", error);
    return NextResponse.json(
      { error: "Impossible de démarrer le paiement. Réessaie dans quelques instants." },
      { status: 500 },
    );
  }
}
