"use client";

import { useState } from "react";

// Product images can come from any source (CJ, AliExpress, Alibaba, a manual
// upload…), so we can't rely on next/image's allow-listed domains here — plain
// <img> elements render regardless of host.
export function ProductGallery({ images, alt }: { images: string[]; alt: string }) {
  const [active, setActive] = useState(0);
  const cover = images[active] ?? images[0];
  const hasMultiple = images.length > 1;

  function prev() {
    setActive((i) => (i - 1 + images.length) % images.length);
  }
  function next() {
    setActive((i) => (i + 1) % images.length);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative aspect-square bg-ink-900 border border-white/5 rounded-xl overflow-hidden">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt={alt} className="absolute inset-0 h-full w-full object-cover" />
        ) : null}

        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Image précédente"
              className="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 flex items-center justify-center rounded-full bg-ink-950/70 backdrop-blur border border-white/10 text-bone-50 hover:bg-ink-950/90 hover:border-ember-500/50 transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Image suivante"
              className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 flex items-center justify-center rounded-full bg-ink-950/70 backdrop-blur border border-white/10 text-bone-50 hover:bg-ink-950/90 hover:border-ember-500/50 transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
            <span className="absolute bottom-3 right-3 text-[11px] text-bone-50 bg-ink-950/70 backdrop-blur rounded-full px-2.5 py-1 border border-white/10">
              {active + 1} / {images.length}
            </span>
          </>
        )}
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
