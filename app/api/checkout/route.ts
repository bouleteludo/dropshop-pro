import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

// Creates a Stripe Checkout session for the current cart. Prices are always
// re-read from the database here — the client only sends product ids and
// quantities, never prices, so a tampered request can't check out at a
// different amount.
export async function POST(req: NextRequest) {
  const { items } = (await req.json()) as {
    items?: { productId: string; quantity: number }[];
  };

  if (!items || items.length === 0) {
    return NextResponse.json({ error: "Panier vide" }, { status: 400 });
  }

  const productIds = items.map((i) => i.productId);
  const products = await prisma.product.findMany({ where: { id: { in: productIds }, active: true } });

  const lineItems: {
    quantity: number;
    price_data: {
      currency: string;
      unit_amount: number;
      product_data: { name: string; images: string[] };
    };
  }[] = [];

  for (const item of items) {
    const product = products.find((p) => p.id === item.productId);
    if (!product) {
      return NextResponse.json({ error: `Produit introuvable : ${item.productId}` }, { status: 400 });
    }
    if (product.stock < item.quantity) {
      return NextResponse.json({ error: `Stock insuffisant pour "${product.name}"` }, { status: 400 });
    }
    const images = (JSON.parse(product.images) as string[]).slice(0, 1);
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
      success_url: `${siteUrl}/commande/succes?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/cart`,
      metadata: {
        items: JSON.stringify(items),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
