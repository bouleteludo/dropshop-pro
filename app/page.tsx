import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const products = await prisma.product.findMany({
    where: { active: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="max-w-5xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Nos produits</h1>

      {products.length === 0 ? (
        <p className="text-gray-500">
          Aucun produit pour l&apos;instant.{" "}
          <Link href="/admin/import" className="underline">
            Importe tes premiers produits depuis CJ Dropshipping
          </Link>
          .
        </p>
      ) : (
        <ul className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {products.map((product) => {
            const images = JSON.parse(product.images) as string[];
            return (
              <li key={product.id}>
                <Link href={`/products/${product.id}`} className="block border rounded p-4 hover:shadow-md transition">
                  {images[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={images[0]} alt={product.name} className="h-40 w-full object-contain mb-3" />
                  )}
                  <p className="font-medium">{product.name}</p>
                  <p className="text-gray-600">{product.price.toFixed(2)} €</p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
