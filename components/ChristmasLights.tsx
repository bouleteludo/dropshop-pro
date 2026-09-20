export function ChristmasLights() {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-around overflow-hidden px-1" aria-hidden="true">
      {Array.from({ length: 24 }, (_, i) => (
        <span key={i} className={`holiday-light holiday-light-${i % 4}`} />
      ))}
    </div>
  );
}