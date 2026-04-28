import * as React from "react";
import { ScanLine } from "lucide-react";
import { useNavigate } from "react-router-dom";

import HistorySidebar from "@/components/HistorySidebar";
import { cn } from "@/lib/utils";

export default function EducatorLayout({
  title,
  subtitle,
  headerContent,
  children,
  className,
}: {
  title?: string;
  subtitle?: string;
  headerContent?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const navigate = useNavigate();

  return (
    <div className="relative z-10 flex h-screen overflow-hidden">

      {/* ── Sidebar ───────────────────────────────────────────────────────────── */}
      <aside className="flex h-full w-60 flex-shrink-0 flex-col overflow-hidden border-r border-border bg-card">
        {/* Header */}
        <div className="flex items-center border-b border-border px-3 py-2.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Workspace
          </span>
        </div>

        {/* New scan button */}
        <div className="p-2">
          <button
            onClick={() => navigate("/workspace")}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-primary/70 transition-colors hover:bg-primary/5 hover:text-primary"
          >
            <ScanLine className="h-3.5 w-3.5 shrink-0" />
            New scan
          </button>
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
        {(title || headerContent) && (
          <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-card/80 px-6 py-4 backdrop-blur-sm">
            {headerContent ?? (
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-bold tracking-tight text-foreground">{title}</h1>
                {subtitle && <p className="mt-0.5 truncate text-sm text-muted-foreground">{subtitle}</p>}
              </div>
            )}
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
