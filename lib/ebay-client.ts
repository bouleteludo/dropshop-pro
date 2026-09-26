export type EbayItem = {
  itemId: string;
  title: string;
  itemWebUrl?: string;
  image?: { imageUrl?: string };
  price?: { value?: string; currency?: string };
  condition?: string;
  seller?: { username?: string; feedbackPercentage?: string };
  buyingOptions?: string[];
};

type EbaySearchResponse = {
  total: number;
  itemSummaries?: EbayItem[];
};

const PROD_API = "https://api.ebay.com";
const SANDBOX_API = "https://api.sandbox.ebay.com";
const TOKEN_PATH = "/identity/v1/oauth2/token";

let cached: { token: string; expiresAt: number; env: string } | null = null;

function envName() {
  return (process.env.EBAY_ENVIRONMENT ?? "production").toLowerCase() === "sandbox" ? "sandbox" : "production";
}

async function getEbayToken() {
  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("EBAY_CLIENT_ID et EBAY_CLIENT_SECRET ne sont pas configurés.");
  }

  const environment = envName();
  if (cached && cached.env === environment && cached.expiresAt > Date.now() + 60_000) return cached.token;

  const base = environment === "sandbox" ? SANDBOX_API : PROD_API;
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(`${base}${TOKEN_PATH}`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "client_credentials", scope: "https://api.ebay.com/oauth/api_scope" }),
  });
  const body = (await res.json()) as { access_token?: string; expires_in?: number; error_description?: string };
  if (!res.ok || !body.access_token) {
    throw new Error(body.error_description ?? `eBay OAuth a échoué (${res.status})`);
  }
  cached = { token: body.access_token, expiresAt: Date.now() + (body.expires_in ?? 7200) * 1000, env: environment };
  return body.access_token;
}

export async function searchEbayItems(query: string, limit = 20, marketplace = process.env.EBAY_MARKETPLACE_ID ?? "EBAY_FR") {
  const token = await getEbayToken();
  const base = envName() === "sandbox" ? SANDBOX_API : PROD_API;
  const url = new URL(`${base}/buy/browse/v1/item_summary/search`);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", String(Math.min(50, Math.max(1, limit))));

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-EBAY-C-MARKETPLACE-ID": marketplace,
      "X-EBAY-C-ENDUSERCTX": "affiliateCampaignId=boo-shop;affiliateReferenceId=research",
    },
    next: { revalidate: 300 },
  });
  const body = (await res.json()) as EbaySearchResponse & { errors?: { message?: string }[] };
  if (!res.ok) throw new Error(body.errors?.map((e) => e.message).filter(Boolean).join("; ") || `eBay a répondu ${res.status}`);
  return { total: body.total ?? 0, items: body.itemSummaries ?? [] };
}
