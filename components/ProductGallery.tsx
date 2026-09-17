"use client";

import Image from "next/image";
import { useState } from "react";

export function ProductGallery({ images, alt }: { images: string[]; alt: string }) {
  const [active, setActive] = useState(0);
  const cover = images[active] ?? images[0];

  return (
    <div className="flex flex-col gap-4">
      <div className="relative aspect-square bg-ink-900 border border-white/5 rounded-xl overflow-hidden">
        {cover ? (
          <Image
            src={cover}
            alt={alt}
            fill
            sizes="(max-width: 768px) 100vw, 600px"
            className="object-cover"
            priority
          />
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
                <Image src={src} alt="" fill sizes="120px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
