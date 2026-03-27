import { TopicMastery, getMasteryColor } from "@/lib/mockData";
import { Grid3X3 } from "lucide-react";

const colorMap = {
  red: { border: "border-signal-red", text: "text-signal-red", bar: "bg-signal-red" },
  yellow: { border: "border-signal-yellow", text: "text-signal-yellow", bar: "bg-signal-yellow" },
  green: { border: "border-signal-green", text: "text-signal-green", bar: "bg-signal-green" },
};

interface Props {
  data: TopicMastery[];
}

const KnowledgeHeatmap = ({ data }: Props) => {
  if (data.length === 0) {
    return (
      <div className="border border-border bg-card p-12 flex flex-col items-center justify-center text-center">
        <Grid3X3 className="h-8 w-8 text-muted-foreground mb-4" />
        <p className="font-display text-xs uppercase tracking-widest text-muted-foreground">
          No data yet
        </p>
        <p className="mt-2 text-sm text-muted-foreground max-w-xs">
          Upload your first incorrect working in the Lab to start building your knowledge map.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xs font-bold uppercase tracking-widest text-foreground">
          Knowledge Heatmap
        </h2>
        <div className="flex items-center gap-4 text-xs text-muted-foreground font-display uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 bg-signal-red" /> Weak
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 bg-signal-yellow" /> Dev
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 bg-signal-green" /> OK
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-3 lg:grid-cols-4">
        {data.map((item) => {
          const color = getMasteryColor(item.score);
          const styles = colorMap[color];
          return (
            <div
              key={item.topic}
              className="bg-card p-4 border-l-2 border-l-transparent hover:border-l-foreground transition-colors"
              style={{ borderLeftColor: `hsl(var(--signal-${color}))` }}
            >
              <p className="font-display text-[10px] text-muted-foreground uppercase tracking-widest">
                {item.subject}
              </p>
              <p className={`mt-1 text-sm font-bold ${styles.text}`}>
                {item.topic}
              </p>
              <div className="mt-3 h-0.5 w-full bg-secondary">
                <div
                  className={`h-full ${styles.bar}`}
                  style={{ width: `${item.score}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-[10px] font-display text-muted-foreground uppercase tracking-wider">
                <span>{item.score}%</span>
                <span>{item.errorCount} err</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default KnowledgeHeatmap;
