/**
 * Client for the CJdropshipping API v2 (https://developers.cjdropshipping.com/).
 *
 * NOTE: this was written from CJ's publicly documented API shape without being able to
 * re-fetch their live docs from this environment (the CJ docs domain is blocked by the
 * network egress proxy here). Endpoint paths and field names below match CJ's v2 API as
 * documented, but CJ has been known to tweak field names between versions — if a call
 * starts failing, check https://developers.cjdropshipping.com/ for the current shape of
 * that specific endpoint and adjust the types/paths in this file accordingly.
 */

const CJ_API_BASE_URL = process.env.CJ_API_BASE_URL ?? "https://developers.cjdropshipping.com/api2.0/v1";
const CJ_API_KEY = process.env.CJ_API_KEY;

type CjEnvelope<T> = {
  code: number;
  result: boolean;
  message: string;
  data: T;
};

type AccessTokenData = {
  accessToken: string;
  accessTokenExpiryDate: string;
  refreshToken: string;
  refreshTokenExpiryDate: string;
};

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

async function fetchAccessToken(): Promise<string> {
  if (!CJ_API_KEY) {
    throw new Error("CJ_API_KEY is not set. Add it to your .env file (see .env.example).");
  }

  const res = await fetch(`${CJ_API_BASE_URL}/authentication/getAccessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey: CJ_API_KEY }),
  });

  const body = (await res.json()) as CjEnvelope<AccessTokenData>;
  if (!res.ok || !body.result) {
    throw new Error(`CJ getAccessToken failed: ${body.message ?? res.statusText}`);
  }

  const expiresAt = new Date(body.data.accessTokenExpiryDate).getTime();
  cachedToken = { accessToken: body.data.accessToken, expiresAt };
  return body.data.accessToken;
}

async function getAccessToken(): Promise<string> {
  // Reuse the cached token until shortly before it expires — CJ rate-limits
  // getAccessToken to roughly one call/second per key, so requesting a fresh
  // token on every request is both wasteful and likely to get throttled.
  const bufferMs = 60_000;
  if (cachedToken && cachedToken.expiresAt - bufferMs > Date.now()) {
    return cachedToken.accessToken;
  }
  return fetchAccessToken();
}

async function cjRequest<T>(
  path: string,
  options: { method?: string; query?: Record<string, string | number | undefined>; body?: unknown } = {},
): Promise<T> {
  const token = await getAccessToken();

  const url = new URL(`${CJ_API_BASE_URL}${path}`);
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const res = await fetch(url, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      "CJ-Access-Token": token,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const body = (await res.json()) as CjEnvelope<T>;

  if (res.status === 401) {
    // Token likely expired server-side ahead of our local expiry — refresh once and retry.
    cachedToken = null;
    return cjRequest<T>(path, options);
  }

  if (!res.ok || !body.result) {
    throw new Error(`CJ API error on ${path}: ${body.message ?? res.statusText}`);
  }

  return body.data;
}

export type CjProductSummary = {
  pid: string;
  productName: string;
  productNameEn?: string;
  productImage: string;
  sellPrice: string;
  categoryName?: string;
};

export type CjProductListResult = {
  list: CjProductSummary[];
  total: number;
  pageNum: number;
  pageSize: number;
};

export async function searchCjProducts(params: {
  keyword?: string;
  categoryId?: string;
  pageNum?: number;
  pageSize?: number;
}): Promise<CjProductListResult> {
  return cjRequest<CjProductListResult>("/product/list", {
    query: {
      productNameEn: params.keyword,
      categoryId: params.categoryId,
      pageNum: params.pageNum ?? 1,
      pageSize: params.pageSize ?? 20,
    },
  });
}

export type CjProductVariant = {
  vid: string;
  variantSku: string;
  variantSellPrice: string;
  variantStandard?: string;
  variantImage?: string;
};

export type CjProductDetail = {
  pid: string;
  productName: string;
  productNameEn?: string;
  description?: string;
  productImageSet: string[];
  sellPrice: string;
  categoryName?: string;
  variants: CjProductVariant[];
};

export async function getCjProductDetail(pid: string): Promise<CjProductDetail> {
  return cjRequest<CjProductDetail>("/product/query", { query: { pid } });
}

export type CjStockEntry = {
  vid: string;
  storageNum: number;
  countryCode?: string;
};

export async function getCjVariantStock(vid: string): Promise<CjStockEntry[]> {
  return cjRequest<CjStockEntry[]>("/product/stock/queryByVid", { query: { vid } });
}

export type CjOrderPayload = {
  orderNumber: string;
  shippingAddress: {
    name: string;
    countryCode: string;
    province: string;
    city: string;
    address: string;
    zip: string;
    phone: string;
  };
  products: { vid: string; quantity: number }[];
};

export type CjOrderResult = {
  orderId: string;
  cjOrderNum: string;
};

export async function createCjOrder(payload: CjOrderPayload): Promise<CjOrderResult> {
  return cjRequest<CjOrderResult>("/shopping/order/createOrderV2", {
    method: "POST",
    body: payload,
  });
}
