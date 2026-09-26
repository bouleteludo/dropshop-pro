import { CartView } from "@/components/CartView";
import { getThemeBanner } from "@/lib/theme-banner";

export const metadata = {
  title: "Panier",
  robots: { index: false, follow: false },
};

export default async function CartPage() {
  const bannerSrc = await getThemeBanner("pages/cart.png");

  return (
    <main className="container py-12 sm:py-16">
      {bannerSrc && (
        <div className="mb-8 rounded-3xl overflow-hidden border border-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={bannerSrc} alt="" className="w-full h-auto max-h-64 object-cover" />
        </div>
      )}
      <h1 className="font-display text-3xl sm:text-4xl text-bone-50 mb-10">Votre panier</h1>
      <CartView />
    </main>
  );
}
