import { prisma } from "@/lib/prisma";
import { absoluteUrl } from "@/lib/seo";
import { parseProductImages } from "@/lib/product-images";

function xml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

export async function buildMerchantXml() {
  const products = await prisma.product.findMany({ where: { active: true }, orderBy: { updatedAt: "desc" } });
  const rows = products.map((product) => {
    const images = parseProductImages(product.images);
    const availability = product.stock > 0 ? "in_stock" : "out_of_stock";
    const link = absoluteUrl(`/products/${product.slug ?? product.id}`);
    const imageLink = images[0] ? `<g:image_link>${xml(images[0])}</g:image_link>` : "";
    const brand = product.brand?.trim() || "BOO SHOP";
    const category = product.category?.trim();
    return `\n    <item>\n      <g:id>${xml(product.sku)}</g:id>\n      <g:title>${xml(product.name.slice(0, 150))}</g:title>\n      <g:description>${xml(product.description.slice(0, 5000))}</g:description>\n      <g:link>${xml(link)}</g:link>\n      ${imageLink}\n      <g:availability>${availability}</g:availability>\n      <g:price>${product.price.toFixed(2)} EUR</g:price>\n      <g:condition>new</g:condition>\n      <g:brand>${xml(brand.slice(0, 70))}</g:brand>\n      <g:identifier_exists>no</g:identifier_exists>\n      ${category ? `<g:product_type>${xml(category.slice(0, 150))}</g:product_type>` : ""}\n    </item>`;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n  <channel>\n    <title>BOO SHOP</title>\n    <link>${xml(absoluteUrl("/"))}</link>\n    <description>Catalogue produits BOO SHOP</description>${rows}\n  </channel>\n</rss>`;
}
