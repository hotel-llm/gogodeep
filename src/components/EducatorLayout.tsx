import * as React from "react";
import { Plus } from "lucide-react";
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

        {/* New Scan button */}
        <div className="p-3">
          <Link to="/workspace">
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
