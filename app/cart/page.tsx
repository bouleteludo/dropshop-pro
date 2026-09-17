import { CartView } from "@/components/CartView";

export const metadata = {
  title: "Panier",
  robots: { index: false, follow: false },
};

export default function CartPage() {
  return (
    <main className="container py-12 sm:py-16">
      <h1 className="font-display text-3xl sm:text-4xl text-bone-50 mb-10">Votre panier</h1>
      <CartView />
    </main>
  );
}
