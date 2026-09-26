import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { OrderStatusSelect } from "@/components/OrderStatusSelect";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const orders = await prisma.order.findMany({ include: { items: { include: { product: true } } }, orderBy: { createdAt: "desc" }, take: 100 });
  return (
    <main>
      <div className="flex items-end justify-between mb-6"><div><p className="text-sm text-bone-400">Les dernières commandes Stripe sont regroupées ici avec leur état de fulfillment.</p></div><Link href="/admin" className="text-xs text-bone-400 hover:text-ember-300">← Dashboard</Link></div>
      {orders.length === 0 ? <div className="rounded-2xl border border-white/10 bg-ink-900 p-8 text-center text-bone-400">Aucune commande.</div> : <div className="space-y-3">{orders.map((order) => <article key={order.id} className="rounded-2xl border border-white/10 bg-ink-900 p-5"><div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4"><div><p className="font-mono text-xs text-bone-400">{order.id}</p><h2 className="text-bone-50 font-medium mt-1">{order.customerName}</h2><p className="text-sm text-bone-400">{order.customerEmail}</p><p className="text-xs text-bone-400 mt-2">{new Date(order.createdAt).toLocaleString("fr-FR")}</p></div><div className="text-left md:text-right"><p className="text-lg text-ember-300">{order.total.toFixed(2)} €</p><div className="mt-2"><OrderStatusSelect orderId={order.id} status={order.status} /></div></div></div><div className="mt-4 border-t border-white/5 pt-4 grid sm:grid-cols-2 gap-3">{order.items.map((item) => <div key={item.id} className="rounded-xl bg-ink-800 p-3 text-sm"><p className="text-bone-50">{item.product.name}</p><p className="text-bone-400 mt-1">{item.quantity} × {item.unitPrice.toFixed(2)} €</p></div>)}</div>{order.cjOrderId && <p className="text-xs text-bone-400 mt-4">CJ : {order.cjOrderId}</p>}</article>)}</div>}
    </main>
  );
}
