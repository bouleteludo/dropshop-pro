"use client";

import { useState } from "react";

// Product images can come from any source (CJ, AliExpress, Alibaba, a manual
// upload…), so we can't rely on next/image's allow-listed domains here — plain
// <img> elements render regardless of host.
export function ProductGallery({ images, alt }: { images: string[]; alt: string }) {
  const [active, setActive] = useState(0);
  const cover = images[active] ?? images[0];

  return (
    <div className="flex flex-col gap-4">
      <div className="relative aspect-square bg-ink-900 border border-white/5 rounded-xl overflow-hidden">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt={alt} className="absolute inset-0 h-full w-full object-cover" />
        ) : null}
      </div>
      {images.length > 1 && (
        <ul className="grid grid-cols-4 gap-3">
          {images.slice(0, 4).map((src, i) => (
            <li key={src}>
              <button
                type="button"
                onClick={() => setActive(i)}
                className={`relative aspect-square rounded-lg overflow-hidden border transition-colors ${
                  i === active ? "border-ember-500/60" : "border-white/5 hover:border-white/20"
                }`}
                aria-label={`Voir image ${i + 1}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
