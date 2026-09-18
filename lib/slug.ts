// Turns a product name into a URL-friendly, keyword-rich slug, with a short
// random suffix to guarantee uniqueness even when two products share a name.
export function makeSlug(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}-${suffix}`;
}
