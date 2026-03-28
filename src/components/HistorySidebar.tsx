import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { History } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import type { ErrorLog } from "@/lib/mockData";
import { cn } from "@/lib/utils";
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarSeparator,
} from "@/components/ui/sidebar";

function formatScanTime(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function HistorySidebar({ className }: { className?: string }) {
  const historyQuery = useQuery({
    queryKey: ["history", "error_logs", { limit: 5 }],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("error_logs")
        .select("id, subject, topic, specific_error_tag, error_category, created_at")
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      return (data ?? []) as ErrorLog[];
    },
  });

  const items = useMemo(() => historyQuery.data ?? [], [historyQuery.data]);

  return (
    <SidebarContent className={cn("group-data-[collapsible=icon]:hidden", className)}>
      <SidebarGroup>
        <SidebarGroupLabel className="gap-2">
          <History className="h-4 w-4" />
          History
        </SidebarGroupLabel>
        <SidebarGroupContent>
          {historyQuery.isLoading ? (
            <div className="space-y-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <SidebarMenuSkeleton key={i} showIcon={false} />
              ))}
            </div>
          ) : historyQuery.isError ? (
            <div className="rounded-md border border-sidebar-border bg-sidebar-accent/30 p-3 text-xs text-sidebar-foreground/80">
              Couldn’t load scan history. Check Supabase table permissions for `error_logs`.
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-md border border-sidebar-border bg-sidebar-accent/30 p-3 text-xs text-sidebar-foreground/80">
              No scans yet. Run a new scan in the Lab and your latest 5 will appear here.
            </div>
          ) : (
            <SidebarMenu>
              {items.map((row) => (
                <SidebarMenuItem key={row.id}>
                  <SidebarMenuButton asChild>
                    <div className="flex w-full flex-col items-start gap-1 py-1">
                      <div className="flex w-full items-center justify-between gap-2">
                        <span className="truncate text-xs font-medium text-sidebar-foreground">
                          {row.subject || "Scan"}
                        </span>
                        <span className="shrink-0 text-[10px] tabular-nums text-sidebar-foreground/60">
                          {formatScanTime(row.created_at)}
                        </span>
                      </div>
                      <div className="w-full truncate text-[11px] text-sidebar-foreground/70">
                        {row.topic ? (
                          <span className="truncate">{row.topic}</span>
                        ) : (
                          <span className="truncate">{row.specific_error_tag || row.error_category || "—"}</span>
                        )}
                      </div>
                      <div className="w-full truncate text-[10px] uppercase tracking-wider text-sidebar-foreground/50">
                        {row.error_category ? row.error_category : "—"}
                        {row.specific_error_tag ? ` • ${row.specific_error_tag}` : ""}
                      </div>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          )}
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarSeparator />
    </SidebarContent>
  );
}
