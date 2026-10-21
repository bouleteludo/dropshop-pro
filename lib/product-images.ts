export function parseProductImages(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is string => typeof value === "string" && /^https?:\/\//i.test(value)).slice(0, 12);
  } catch {
    return [];
  }
}
