export function Snowfall() {
  const flakes = Array.from({ length: 34 }, (_, i) => i);
  return (
    <div className="pointer-events-none fixed inset-0 z-[5] overflow-hidden" aria-hidden="true">
      {flakes.map((i) => (
        <span
          key={i}
          className="snowflake absolute top-[-10vh] text-white/70"
          style={{
            left: `${(i * 29) % 100}%`,
            fontSize: `${8 + (i % 5) * 4}px`,
            animationDelay: `${(i % 12) * -1.7}s`,
            animationDuration: `${8 + (i % 7)}s`,
          }}
        >✦</span>
      ))}
    </div>
  );
}