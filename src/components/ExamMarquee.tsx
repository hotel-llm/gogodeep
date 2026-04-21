const EXAM_LABELS = [
  "IB", "GCSE", "AP", "MYP", "SAT", "ACT", "A-Level", "PSAT", "IGCSE",
];

export default function ExamMarquee({ width = 200 }: { width?: number }) {
  const items = [...EXAM_LABELS, ...EXAM_LABELS];
  return (
    <div className="flex flex-col gap-1.5" style={{ width }}>
      <div
        className="h-px w-full"
        style={{ background: "linear-gradient(to right, transparent, hsl(var(--primary) / 0.25) 30%, hsl(var(--primary) / 0.25) 70%, transparent)" }}
      />
      <div
        className="overflow-hidden"
        style={{ maskImage: "linear-gradient(to right, transparent, black 15%, black 85%, transparent)" }}
      >
        <div
          className="flex gap-0 whitespace-nowrap"
          style={{ animation: "marquee 18s linear infinite" }}
        >
          {items.map((label, i) => (
            <span key={i} className="text-xs font-medium text-muted-foreground/70">
              {label}
              <span className="mx-1.5 opacity-30">·</span>
            </span>
          ))}
        </div>
      </div>
      <div
        className="h-px w-full"
        style={{ background: "linear-gradient(to right, transparent, hsl(var(--primary) / 0.25) 30%, hsl(var(--primary) / 0.25) 70%, transparent)" }}
      />
    </div>
  );
}
