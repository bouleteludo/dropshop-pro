"use client";

import { useEffect } from "react";
import { useCart } from "@/lib/cart-store";

// Payment succeeded (the user landed on this page via Stripe's success_url) —
// clear the local cart so it doesn't linger with items already paid for.
export function OrderSuccessCartClear() {
  const clear = useCart((s) => s.clear);
  useEffect(() => {
    clear();
  }, [clear]);
  return null;
}
