export function absoluteUrl(path: string) {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://boo-shop.vercel.app").replace(/\/$/, "");
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalized, `${base}/`).toString();
}
