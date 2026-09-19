import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { OrderStatusSelect } from "@/components/OrderStatusSelect";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "En attente",
  PAID: "Payée",
  SENT_TO_CJ: "Envoyée à CJ",
  FULFILLED: "Expédiée",
  CANCELLED: "Annulée",
};

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { items: { include: { product: true } } },
  });

  return (
    <main className="container py-10">
      <h1 className="font-display text-2xl sm:text-3xl text-bone-50 mb-2">Commandes</h1>
      <p className="text-sm text-bone-400 mb-6">
        {orders.length === 0
          ? "Aucune commande pour le moment."
          : `${orders.length} commande${orders.length > 1 ? "s" : ""}.`}
      </p>
      <div className="flex gap-4 mb-8 text-sm">
        <Link href="/admin/products" className="text-ember-400 hover:text-ember-300 transition-colors">
          Gérer les produits →
        </Link>
      </div>

      {orders.length === 0 ? (
        <p className="text-bone-400">
          Les commandes apparaîtront ici automatiquement dès qu&apos;un paiement sera confirmé par Stripe.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {orders.map((order) => (
            <li key={order.id} className="bg-ink-900 border border-white/10 rounded-xl p-5">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                  <p className="text-bone-50 font-medium">{order.customerName || "Client"}</p>
                  <p className="text-sm text-bone-400">{order.customerEmail}</p>
                  {order.address && <p className="text-sm text-bone-400 mt-1">{order.address}</p>}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <p className="text-ember-400 font-medium">{order.total.toFixed(2)} €</p>
                  <OrderStatusSelect orderId={order.id} status={order.status} />
                </div>
              </div>

              <ul className="text-sm text-bone-200/80 border-t border-white/5 pt-3 flex flex-col gap-1">
                {order.items.map((item) => (
                  <li key={item.id} className="flex justify-between">
                    <span>
                      {item.quantity} × {item.product?.name ?? "Produit supprimé"}
                    </span>
                    <span>{(item.unitPrice * item.quantity).toFixed(2)} €</span>
                  </li>
                ))}
              </ul>

              <p className="text-xs text-bone-400 mt-3">
                {new Date(order.createdAt).toLocaleString("fr-FR")} · Statut actuel :{" "}
                {STATUS_LABEL[order.status] ?? order.status}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
