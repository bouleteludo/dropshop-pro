export const STORE = {
  name: "BOO SHOP",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://boo-shop.vercel.app",
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "contact@boo-shop.fr",
  shippingPrice: Number(process.env.NEXT_PUBLIC_SHIPPING_PRICE_EUR ?? "4.90"),
  freeShippingThreshold: Number(process.env.NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD_EUR ?? "49"),
  deliveryEstimate: process.env.NEXT_PUBLIC_DELIVERY_ESTIMATE ?? "selon le produit et la destination",
};

export function getShipping(subtotal: number) {
  if (subtotal <= 0) return 0;
  if (subtotal >= STORE.freeShippingThreshold) return 0;
  return STORE.shippingPrice;
}
