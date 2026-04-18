import * as React from "react";
import { Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";

import HistorySidebar from "@/components/HistorySidebar";
import { pendingFileStore } from "@/lib/pendingFile";
import { cn } from "@/lib/utils";

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", "image/heic", "image/heif"];

export default function EducatorLayout({
  title,
  subtitle,
  children,
  className,
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const navigate = useNavigate();
  const [dropHover, setDropHover] = React.useState(false);
  const dragCounter = React.useRef(0);

  function onDragEnter(e: React.DragEvent) { e.preventDefault(); dragCounter.current++; setDropHover(true); }
  function onDragLeave() { dragCounter.current--; if (dragCounter.current === 0) setDropHover(false); }
  function onDragOver(e: React.DragEvent) { e.preventDefault(); }
  function onDrop(e: React.DragEvent) {
    e.preventDefault(); dragCounter.current = 0; setDropHover(false);
    const file = e.dataTransfer.files[0];
    if (file && ALLOWED_TYPES.includes(file.type)) { pendingFileStore.set(file); }
    navigate("/workspace");
  }

  return (
    <div className="relative z-10 mt-14 flex h-[calc(100vh-3.5rem)] overflow-hidden">

      {/* ── Sidebar — always visible, never collapsible ───────────────────────── */}
      <aside className="flex h-full w-60 flex-shrink-0 flex-col overflow-hidden border-r border-border bg-card">
        {/* Header */}
        <div className="flex items-center border-b border-border px-3 py-2.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Workspace
          </span>
        </div>

        {/* Drop zone — click or drag a screenshot */}
        <div className="p-3">
          <div
            role="button"
            tabIndex={0}
            onClick={() => navigate("/workspace")}
            onKeyDown={(e) => e.key === "Enter" && navigate("/workspace")}
            onDragEnter={onDragEnter}
            onDragLeave={onDragLeave}
            onDragOver={onDragOver}
            onDrop={onDrop}
            className={cn(
              "flex w-full cursor-pointer select-none items-center gap-2 rounded-xl border-2 border-dashed px-3 py-2.5 text-xs font-semibold transition-all duration-200",
              dropHover
                ? "border-primary bg-primary/10 text-primary shadow-[0_0_12px_hsl(var(--primary)/0.2)] scale-[1.02]"
                : "border-primary/40 bg-primary/5 text-primary/70 hover:border-primary hover:bg-primary/10 hover:text-primary"
            )}
          >
            <Upload className="h-3.5 w-3.5 shrink-0" />
            <span>Drop a screenshot or scan</span>
          </div>
        </div>

        <div className="border-t border-border" />

        {/* Scrollable scan history */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <HistorySidebar />
        </div>
      </aside>

      {/* ── Main content ──────────────────────────────────────────────────────── */}
      <div className={cn("flex min-w-0 flex-1 flex-col overflow-hidden", className)}>
        {/* Sticky top bar */}
        {title && (
          <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-card/80 px-6 py-4 backdrop-blur-sm">
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold tracking-tight text-foreground">{title}</h1>
              {subtitle && <p className="mt-0.5 truncate text-sm text-muted-foreground">{subtitle}</p>}
            </div>
          </div>
        )}

        {/* Page content */}
        <div className="flex-1 overflow-y-auto">
          <div className="container max-w-6xl py-6 sm:py-8">
            {children}
          </div>
        </div>
      </div>

    </div>
  );
}
