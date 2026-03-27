import { ErrorLog } from "@/lib/mockData";
import { AlertTriangle, Inbox } from "lucide-react";

interface Props {
  data: ErrorLog[];
}

const RecentBlindspots = ({ data }: Props) => {
  if (data.length === 0) {
    return (
      <div className="border border-border bg-card p-12 flex flex-col items-center justify-center text-center h-full">
        <Inbox className="h-8 w-8 text-muted-foreground mb-4" />
        <p className="font-display text-xs uppercase tracking-widest text-muted-foreground">
          No errors logged
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Your blind spots will appear here after analysis.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="font-display text-xs font-bold uppercase tracking-widest text-foreground">
        Recent Blind Spots
      </h2>
      <div className="divide-y divide-border border border-border">
        {data.map((error) => (
          <div
            key={error.id}
            className="flex items-start gap-4 bg-card p-4 hover:bg-accent transition-colors"
          >
            <AlertTriangle className="h-4 w-4 text-signal-red shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center border border-border px-2 py-0.5 text-[10px] font-display uppercase tracking-wider text-muted-foreground">
                  {error.error_category}
                </span>
                <span className="text-[10px] font-display uppercase tracking-wider text-muted-foreground">
                  {error.subject}
                </span>
              </div>
              <p className="mt-1 text-sm font-bold text-foreground">
                {error.specific_error_tag}
              </p>
              <p className="text-xs text-muted-foreground">{error.topic}</p>
            </div>
            <span className="text-[10px] font-display text-muted-foreground shrink-0 uppercase tracking-wider">
              {new Date(error.created_at).toLocaleDateString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentBlindspots;
