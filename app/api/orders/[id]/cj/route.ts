import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { calculateCjFreight, createCjOrder, getCjProductDetail, getCjVariantStock } from "@/lib/cj-client";
import { FULFILLMENT_STATUS, sendOrderToCj, type FulfillmentDeps } from "@/lib/cj-fulfillment";

// Never cached, never prerendered: it spends money at CJ.
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const deps: FulfillmentDeps = {
  loadOrder: (id) =>
    prisma.order.findUnique({
      where: { id },
      include: { items: { include: { product: { select: { name: true, sku: true, cjProductId: true } } } } },
    }),
  retrieveSession: (sessionId) => getStripe().checkout.sessions.retrieve(sessionId),
  getProductVariants: async (cjProductId) => (await getCjProductDetail(cjProductId)).variants,
  getVariantStock: getCjVariantStock,
  getFreightOptions: calculateCjFreight,
  createCjOrder,
  // Conditional update: it only goes through if the order is still PAID and has no CJ id.
  markSentToCj: async (id, cjOrderId) => {
    const { count } = await prisma.order.updateMany({
      where: { id, status: "PAID", cjOrderId: null },
      data: { status: "SENT_TO_CJ", cjOrderId },
    });
    return count === 1;
  },
};

// POST { dryRun?: boolean, phone?: string } — sends a PAID order to CJ, or only
// simulates it when dryRun is true.
export async function POST(req: NextRequest, { params }: Params) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const { id } = await params;
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) {
    return NextResponse.json({ error: "Identifiant de commande invalide" }, { status: 400 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
  const { dryRun, phone } = body as { dryRun?: unknown; phone?: unknown };
  if (dryRun !== undefined && typeof dryRun !== "boolean") {
    return NextResponse.json({ error: "Option de simulation invalide" }, { status: 400 });
  }
  if (phone !== undefined && (typeof phone !== "string" || phone.length > 40)) {
    return NextResponse.json({ error: "Numéro de téléphone invalide" }, { status: 400 });
  }

  try {
    const result = await sendOrderToCj(id, { dryRun, phone }, deps);
    if (result.ok) return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
    // Order id and code only: no address, name or phone in the server logs.
    if (FULFILLMENT_STATUS[result.code] >= 500) console.error(`[cj] envoi de la commande ${id} en échec : ${result.code}`);
    return NextResponse.json(
      { error: result.message, code: result.code, ...(result.cjOrderId ? { cjOrderId: result.cjOrderId } : {}) },
      { status: FULFILLMENT_STATUS[result.code], headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error(`[cj] envoi de la commande ${id} : erreur inattendue (${(error as Error).name})`);
    return NextResponse.json({ error: "Erreur inattendue pendant l’envoi à CJ. Vérifie dans ton compte CJ avant de réessayer." }, { status: 500 });
  }
}
