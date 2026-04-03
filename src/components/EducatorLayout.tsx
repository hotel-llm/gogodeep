import * as React from "react";
import { useState } from "react";
import { Plus, PanelLeft } from "lucide-react";
import { Link } from "react-router-dom";

import HistorySidebar from "@/components/HistorySidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  const [open, setOpen] = useState(true);

  return (
    <div className="relative z-10 mt-14 flex h-[calc(100vh-3.5rem)] overflow-hidden">

      {/* ── Sidebar ───────────────────────────────────────────────────────────── */}
      <aside
        className={cn(
          "flex h-full flex-shrink-0 flex-col overflow-hidden border-r border-border bg-card transition-[width] duration-200 ease-in-out",
          open ? "w-60" : "w-0"
        )}
      >
        {/* Inner container stays 240px so content doesn't reflow during transition */}
        <div className="flex h-full w-60 flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Diagnostic Lab
            </span>
            <button
              onClick={() => setOpen(false)}
              className="rounded p-1 text-muted-foreground hover:text-foreground"
              title="Collapse sidebar"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
          </div>

          {/* New Scan button */}
          <div className="p-3">
            <Link to="/lab">
              <Button className="w-full gap-2 bg-primary text-sm font-semibold hover:bg-primary/90">
                <Plus className="h-4 w-4" />
                New Scan
              </Button>
            </Link>
          </div>

          <div className="border-t border-border" />

          {/* Scrollable scan history */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            <HistorySidebar />
          </div>
        </div>
      </aside>

      {/* ── Main content ──────────────────────────────────────────────────────── */}
      <div className={cn("flex min-w-0 flex-1 flex-col overflow-hidden", className)}>
        {/* Sticky top bar with toggle */}
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-card/80 px-4 py-2.5 backdrop-blur-sm">
          <button
            onClick={() => setOpen((v) => !v)}
            className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground"
            title={open ? "Collapse sidebar" : "Expand sidebar"}
          >
            <PanelLeft className="h-4 w-4" />
          </button>
          {title && (
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold tracking-tight text-foreground">{title}</h1>
              {subtitle && <p className="truncate text-sm text-muted-foreground">{subtitle}</p>}
            </div>
          )}
        </div>

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
