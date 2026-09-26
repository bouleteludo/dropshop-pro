import Link from "next/link";
import { OrderSuccessCartClear } from "@/components/OrderSuccessCartClear";

export const metadata = {
  title: "Commande confirmée",
  robots: { index: false, follow: false },
};

export default function OrderSuccessPage() {
  return (
    <main className="container py-20 sm:py-28 text-center max-w-xl mx-auto">
      <OrderSuccessCartClear />
      <p className="text-xs tracking-[0.3em] uppercase text-ember-400 mb-4">Merci</p>
      <h1 className="font-display text-3xl sm:text-4xl text-bone-50 mb-4">Commande confirmée</h1>
      <p className="text-bone-200/80 mb-10 leading-relaxed">
        Ton paiement a été accepté. Un e-mail de confirmation va arriver sous peu, et ta commande sera
        préparée puis expédiée dans les meilleurs délais.
      </p>
      <Link
        href="/#collection"
        className="inline-flex items-center justify-center rounded-full bg-ember-500 hover:bg-ember-400 text-ink-950 font-medium px-8 py-3 transition-colors"
      >
        Continuer mes achats
      </Link>
    </main>
  );
}
