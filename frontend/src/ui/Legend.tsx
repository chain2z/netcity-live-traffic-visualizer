export function Legend() {
  return (
    <section className="border border-line bg-panel p-3 text-xs text-slate-200 shadow-xl backdrop-blur-md" aria-label="City legend">
      <div className="mb-2 font-semibold text-white">Legend</div>
      <div className="grid gap-1.5">
        <LegendRow swatch="bg-teal-300" label="Roads show active connections" />
        <LegendRow swatch="bg-yellow-300" label="Packet-cars show traffic volume" />
        <LegendRow swatch="bg-purple-300" label="Outer points are destinations" />
        <div className="pt-1 text-slate-300">Badges A-D expose trust without relying on color.</div>
      </div>
    </section>
  );
}

function LegendRow({ swatch, label }: { swatch: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-2.5 w-2.5 shrink-0 ${swatch}`} />
      <span>{label}</span>
    </div>
  );
}
