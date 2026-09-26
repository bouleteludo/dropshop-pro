import { prisma } from "@/lib/prisma";

const PROD_API = "https://api.ebay.com";
const SANDBOX_API = "https://api.sandbox.ebay.com";

function configValue(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} n'est pas configuré.`);
  return value;
}

function baseUrl() { return (process.env.EBAY_ENVIRONMENT ?? "production").toLowerCase() === "sandbox" ? SANDBOX_API : PROD_API; }

async function ebayCall(path: string, init: RequestInit) {
  const token = configValue("EBAY_USER_ACCESS_TOKEN");
  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Content-Language": "fr-FR",
      "Accept-Language": "fr-FR",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let body: unknown = undefined;
  try { body = text ? JSON.parse(text) : undefined; } catch { body = text; }
  if (!res.ok) {
    const message = typeof body === "object" && body && "errors" in body ? JSON.stringify((body as { errors?: unknown }).errors) : `eBay ${res.status}`;
    throw new Error(message);
  }
  return body as Record<string, unknown> | undefined;
}

export async function publishProductToEbay(productId: string) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new Error("Produit introuvable.");
  const images = JSON.parse(product.images) as string[];
  const imageUrls = images.filter((url) => /^https:\/\//i.test(url)).slice(0, 12);
  if (!imageUrls.length) throw new Error("eBay exige au moins une image HTTPS pour publier l'annonce.");
  if (product.stock <= 0) throw new Error("Le produit doit avoir du stock pour publier l'annonce.");

  const sku = product.sku.slice(0, 50);
  const brand = product.brand?.trim() || "BOO SHOP";
  await ebayCall(`/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`, {
    method: "PUT",
    body: JSON.stringify({
      availability: { shipToLocationAvailability: { quantity: product.stock } },
      condition: "NEW",
      product: {
        title: product.name.slice(0, 80),
        description: product.description.slice(0, 4000),
        brand,
        aspects: { Brand: [brand] },
        imageUrls,
      },
    }),
  });

  const marketplaceId = process.env.EBAY_MARKETPLACE_ID ?? "EBAY_FR";
  const offerPayload = {
    sku,
    marketplaceId,
    format: "FIXED_PRICE",
    availableQuantity: product.stock,
    categoryId: configValue("EBAY_CATEGORY_ID"),
    listingDescription: product.description.slice(0, 4000),
    listingDuration: process.env.EBAY_LISTING_DURATION ?? "GTC",
    merchantLocationKey: configValue("EBAY_MERCHANT_LOCATION_KEY"),
    pricingSummary: { price: { currency: "EUR", value: product.price.toFixed(2) } },
    listingPolicies: {
      fulfillmentPolicyId: configValue("EBAY_FULFILLMENT_POLICY_ID"),
      paymentPolicyId: configValue("EBAY_PAYMENT_POLICY_ID"),
      returnPolicyId: configValue("EBAY_RETURN_POLICY_ID"),
    },
  };

  let offerId = product.ebayOfferId;
  if (offerId) {
    await ebayCall(`/sell/inventory/v1/offer/${encodeURIComponent(offerId)}`, { method: "PUT", body: JSON.stringify(offerPayload) });
  } else {
    const created = await ebayCall("/sell/inventory/v1/offer", { method: "POST", body: JSON.stringify(offerPayload) });
    offerId = typeof created?.offerId === "string" ? created.offerId : null;
    if (!offerId) throw new Error("eBay n'a pas renvoyé d'offerId après la création.");
  }

  if (product.ebayOfferId && product.ebayListingId) {
    return prisma.product.update({ where: { id: product.id }, data: { ebayStatus: "PUBLISHED", ebayPublishedAt: new Date() } });
  }

  const published = await ebayCall(`/sell/inventory/v1/offer/${encodeURIComponent(offerId)}/publish`, { method: "POST", body: undefined });
  const listingId = typeof published?.listingId === "string" ? published.listingId : undefined;
  return prisma.product.update({ where: { id: product.id }, data: { ebayOfferId: offerId, ebayListingId: listingId, ebayStatus: "PUBLISHED", ebayPublishedAt: new Date() } });
}
