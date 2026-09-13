import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: { id: string } }) {
  const product = await prisma.product.findUnique({ where: { id: params.id } });
  if (!product) notFound();

  const images = JSON.parse(product.images) as string[];

  return (
    <main className="max-w-4xl mx-auto p-8 grid md:grid-cols-2 gap-8">
      <div>
        {images[0] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={images[0]} alt={product.name} className="w-full object-contain border rounded" />
        )}
      </div>
      <div>
        <h1 className="text-2xl font-bold mb-2">{product.name}</h1>
        <p className="text-xl text-gray-800 mb-4">{product.price.toFixed(2)} €</p>
        <p className="text-sm text-gray-500 mb-4">
          {product.stock > 0 ? `${product.stock} en stock` : "Stock à confirmer"}
        </p>
        <p className="text-gray-700 whitespace-pre-line">{product.description}</p>
      </div>
    </main>
  );
}
