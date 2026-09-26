import { prisma } from "@/lib/prisma";

export function computeOpportunity(input: { supplierPrice?: number; marketPrice?: number; shippingCost?: number }) {
  const supplier = input.supplierPrice ?? 0;
  const market = input.marketPrice ?? 0;
  const shipping = input.shippingCost ?? 0;
  if (supplier <= 0 || market <= 0) return null;
  const profit = market - supplier - shipping;
  return { profit: Math.round(profit * 100) / 100, marginPct: Math.round((profit / market) * 1000) / 10 };
}

export async function saveResearchCandidate(data: {
  query: string;
  title: string;
  source: string;
  url?: string;
  image?: string;
  externalId?: string;
  supplierPrice?: number;
  marketPrice?: number;
  shippingCost?: number;
  trendState?: string;
  notes?: string;
}) {
  const estimated = computeOpportunity(data);
  return prisma.researchCandidate.create({
    data: {
      ...data,
      estimatedMargin: estimated?.profit,
    },
  });
}
