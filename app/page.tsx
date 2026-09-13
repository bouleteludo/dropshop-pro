import Link from "next/link";
import { ensureSchema, prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await ensureSchema();
  const products = await prisma.product.findMany({
    where: { active: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="max-w-5xl mx-auto p-8">
      <div className="text-center mb-10">
        <h1 className="font-spooky text-5xl text-pumpkin-500 mb-2 drop-shadow-[0_0_12px_rgba(255,117,24,0.5)]">
          Nos trouvailles d&apos;Halloween
        </h1>
        <p className="text-orange-200/60">Stock limité, ça s&apos;évapore avec la brume 🌫️</p>
      </div>

      {products.length === 0 ? (
        <p className="text-orange-200/60 text-center">
          Aucun produit pour l&apos;instant.{" "}
          <Link href="/admin/import" className="underline text-pumpkin-400 hover:text-pumpkin-300">
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
                <Link
                  href={`/products/${product.id}`}
                  className="block bg-night-900 border border-pumpkin-500/20 rounded-xl p-4 hover:border-pumpkin-500/60 hover:shadow-[0_0_20px_rgba(255,117,24,0.25)] transition"
                >
                  {images[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={images[0]} alt={product.name} className="h-40 w-full object-contain mb-3" />
                  )}
                  <p className="font-medium text-orange-50">{product.name}</p>
                  <p className="text-pumpkin-400">{product.price.toFixed(2)} €</p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
