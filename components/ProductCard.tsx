import Image from "next/image";
import Link from "next/link";

type Props = {
  slug: string;
  name: string;
  price: number;
  images: string[];
  stock: number;
};

export function ProductCard({ slug, name, price, images, stock }: Props) {
  const cover = images[0];
  const inStock = stock > 0;

  return (
    <Link
      href={`/products/${slug}`}
      className="group block rounded-xl overflow-hidden bg-ink-900 border border-white/5 hover:border-ember-500/40 hover:shadow-card transition-all duration-300"
    >
      <div className="relative aspect-square bg-ink-800 overflow-hidden">
        {cover ? (
          <Image
            src={cover}
            alt={name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 400px"
            className="object-cover group-hover:scale-[1.05] transition-transform duration-700 ease-out"
          />
        ) : null}

        {!inStock && (
          <span className="absolute top-3 left-3 rounded-full bg-ink-950/80 backdrop-blur text-bone-200 text-[11px] px-2.5 py-1 border border-white/10">
            Bientôt de retour
          </span>
        )}
      </div>

      <div className="p-4">
        <p className="text-sm text-bone-50 leading-snug line-clamp-2 mb-2 min-h-[2.5em]">{name}</p>
        <div className="flex items-center justify-between">
          <p className="text-ember-400 font-medium">{price.toFixed(2)} €</p>
          <span className="text-xs text-bone-400 opacity-0 group-hover:opacity-100 transition-opacity">
            Voir →
          </span>
        </div>
      </div>
    </Link>
  );
}
