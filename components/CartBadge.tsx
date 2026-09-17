"use client";

import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart-store";

export function CartBadge() {
  const count = useCart((s) => s.items.reduce((sum, i) => sum + i.quantity, 0));
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted || count === 0) return null;

  return (
    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center rounded-full bg-ember-500 text-ink-950 text-[10px] font-semibold">
      {count}
    </span>
  );
}
