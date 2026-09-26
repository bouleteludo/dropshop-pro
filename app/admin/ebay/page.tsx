import { prisma } from "@/lib/prisma";
import EbayManager from "@/components/admin/EbayManager";

export const dynamic = "force-dynamic";

export default async function EbayPage() {
  const products = await prisma.product.findMany({ where: { active: true }, orderBy: { updatedAt: "desc" }, select: { id: true, name: true, sku: true, price: true, stock: true, ebayStatus: true, ebayListingId: true } });
  return <EbayManager products={products} />;
}
