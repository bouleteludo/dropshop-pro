import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) notFound();

  const images = JSON.parse(product.images) as string[];

  return (
    <main className="max-w-4xl mx-auto p-8 grid md:grid-cols-2 gap-8">
      <div>
        {images[0] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={images[0]}
            alt={product.name}
            className="w-full object-contain bg-night-900 border border-pumpkin-500/20 rounded-xl p-4"
          />
        )}
      </div>
      <div>
        <h1 className="font-spooky text-3xl text-pumpkin-500 mb-3">{product.name}</h1>
        <p className="text-2xl text-slime-400 mb-4">{product.price.toFixed(2)} €</p>
        <p className="text-sm text-orange-200/60 mb-4">
          {product.stock > 0 ? `🎃 ${product.stock} en stock` : "Stock à confirmer"}
        </p>
        <p className="text-orange-100/90 whitespace-pre-line">{product.description}</p>
      </div>
    </main>
  );
}
