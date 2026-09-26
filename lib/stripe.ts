import Stripe from "stripe";

let client: Stripe | null = null;

// Lazy singleton — reading STRIPE_SECRET_KEY only when a route actually needs
// Stripe, not at module import time, so the build doesn't fail before the key
// is configured in Vercel.
export function getStripe(): Stripe {
  if (!client) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) throw new Error("STRIPE_SECRET_KEY is not set");
    client = new Stripe(secretKey);
  }
  return client;
}
