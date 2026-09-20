import type { BooCharacter } from "@/lib/boo-characters";

export function CharacterAvatar({ character, compact = false }: { character: BooCharacter; compact?: boolean }) {
  return (
    <div
      className={`character-avatar relative overflow-hidden rounded-[30%] border border-white/20 shadow-xl ${compact ? "aspect-square" : "aspect-[4/5]"}`}
      style={{
        background: `radial-gradient(circle at 30% 20%, rgba(255,255,255,.42), transparent 20%), linear-gradient(145deg, ${character.accent}, ${character.secondary} 55%, #14161b)`,
      }}
      aria-label={character.name}
    >
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_70%_70%,rgba(255,255,255,.14),transparent_34%)]" />
      <span className="absolute top-2 right-2 rounded-full bg-black/30 px-2 py-1 text-[10px] uppercase tracking-widest text-white/90 backdrop-blur">
        BOO
      </span>
      <div className="absolute inset-x-[14%] bottom-[11%] top-[16%] flex items-center justify-center">
        <div className="mascot-blob relative flex h-[72%] w-[72%] items-center justify-center rounded-[42%] border-2 border-white/35 bg-white/15 shadow-[inset_0_8px_16px_rgba(255,255,255,.25),0_18px_28px_rgba(0,0,0,.2)] backdrop-blur-sm">
          <span className="mascot-face absolute top-[30%] flex gap-3" aria-hidden>
            <i className="h-3 w-3 rounded-full bg-[#12141a] shadow-[0_2px_0_rgba(255,255,255,.25)]" />
            <i className="h-3 w-3 rounded-full bg-[#12141a] shadow-[0_2px_0_rgba(255,255,255,.25)]" />
          </span>
          <span className="mascot-mouth absolute top-[48%] h-5 w-9 rounded-b-full border-b-4 border-[#12141a]/75" aria-hidden />
          <span className="relative z-10 text-4xl sm:text-5xl drop-shadow-lg" aria-hidden>{character.symbol}</span>
        </div>
      </div>
      <span className="absolute bottom-3 left-3 rounded-full bg-white/85 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-[#16181d] backdrop-blur">
        {character.isNew ? "NOUVEAU" : "BOO ORIGINAL"}
      </span>
    </div>
  );
}