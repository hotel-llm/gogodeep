import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Plus, Folder, ChevronRight, ChevronDown, Trash2, FolderOpen } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { SCAN_CACHE_KEY } from "@/lib/supabase";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

type Scan = {
  id: string;
  subject: string | null;
  topic: string | null;
  specific_error_tag: string | null;
  error_category: string | null;
  created_at: string | null;
};

type FolderDef = { id: string; name: string; color: string };

type LabState = {
  folders: FolderDef[];
  assignments: Record<string, string>; // scanId → folderId
};

// ── Colors ────────────────────────────────────────────────────────────────────

const COLORS = [
  { key: "blue",   hex: "#60a5fa" },
  { key: "green",  hex: "#4ade80" },
  { key: "purple", hex: "#a78bfa" },
  { key: "orange", hex: "#fb923c" },
  { key: "red",    hex: "#f87171" },
  { key: "yellow", hex: "#fbbf24" },
  { key: "pink",   hex: "#f472b6" },
  { key: "cyan",   hex: "#22d3ee" },
];

function dotColor(key: string) {
  return COLORS.find((c) => c.key === key)?.hex ?? "#60a5fa";
}

// ── LocalStorage ──────────────────────────────────────────────────────────────

const LS_KEY = "gogodeep_lab_v1";

function loadLabState(): LabState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as LabState) : { folders: [], assignments: {} };
  } catch {
    return { folders: [], assignments: {} };
  }
}

function saveLabState(s: LabState) {
  localStorage.setItem(LS_KEY, JSON.stringify(s));
}

// ── Scan display name ─────────────────────────────────────────────────────────

function scanLabel(scan: Scan): string {
  return scan.topic || scan.specific_error_tag || scan.subject || "Untitled scan";
}

// ── Main component ────────────────────────────────────────────────────────────

export default function HistorySidebar() {
  const [state, setState] = useState<LabState>(loadLabState);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftColor, setDraftColor] = useState("blue");

  const update = useCallback((next: LabState) => {
    saveLabState(next);
    setState(next);
  }, []);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["history", "error_logs"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("error_logs")
        .select("id, subject, topic, specific_error_tag, error_category, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Scan[];
    },
    staleTime: 0,
  });

  const scans = useMemo(() => data ?? [], [data]);

  const { byFolder, unassigned } = useMemo(() => {
    const byFolder: Record<string, Scan[]> = {};
    const unassigned: Scan[] = [];
    for (const scan of scans) {
      const fId = state.assignments[scan.id];
      if (fId && state.folders.find((f) => f.id === fId)) {
        (byFolder[fId] ??= []).push(scan);
      } else {
        unassigned.push(scan);
      }
    }
    return { byFolder, unassigned };
  }, [scans, state]);

  function commitFolder() {
    const name = draftName.trim();
    if (!name) return;
    const folder: FolderDef = { id: crypto.randomUUID(), name, color: draftColor };
    update({ ...state, folders: [...state.folders, folder] });
    setDraftName("");
    setDraftColor("blue");
    setCreating(false);
  }

  function removeFolder(id: string) {
    const assignments = { ...state.assignments };
    for (const [scanId, fId] of Object.entries(assignments)) {
      if (fId === id) delete assignments[scanId];
    }
    update({ folders: state.folders.filter((f) => f.id !== id), assignments });
  }

  function assign(scanId: string, folderId: string | null) {
    const assignments = { ...state.assignments };
    if (folderId === null) delete assignments[scanId];
    else assignments[scanId] = folderId;
    update({ ...state, assignments });
  }

  function toggleFolder(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="flex flex-col py-2">

      {/* ── Scans header ── */}
      <div className="flex items-center justify-between px-3 pb-1 pt-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Scans</p>
        <button
          onClick={() => setCreating(true)}
          className="rounded p-0.5 text-muted-foreground hover:text-foreground"
          title="New folder"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* ── New folder form ── */}
      {creating && (
        <div className="mx-3 mb-2 space-y-2 rounded-lg border border-border bg-secondary/60 p-2">
          <input
            autoFocus
            className="w-full rounded border border-border bg-card px-2 py-1 text-xs text-foreground outline-none focus:border-primary"
            placeholder="Folder name…"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitFolder();
              if (e.key === "Escape") { setCreating(false); setDraftName(""); }
            }}
          />
          <div className="flex flex-wrap gap-1.5">
            {COLORS.map((c) => (
              <button
                key={c.key}
                onClick={() => setDraftColor(c.key)}
                className={cn(
                  "h-4 w-4 rounded-full border-2 transition-transform hover:scale-110",
                  draftColor === c.key ? "scale-110 border-white" : "border-transparent"
                )}
                style={{ background: c.hex }}
              />
            ))}
          </div>
          <div className="flex gap-1">
            <button
              onClick={commitFolder}
              className="flex-1 rounded bg-primary py-1 text-[11px] font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Create
            </button>
            <button
              onClick={() => { setCreating(false); setDraftName(""); }}
              className="flex-1 rounded border border-border py-1 text-[11px] text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Folders ── */}
      <div className="px-2">
        {state.folders.map((folder) => {
          const isCollapsed = collapsed.has(folder.id);
          const items = byFolder[folder.id] ?? [];
          return (
            <div key={folder.id} className="mb-0.5">
              <div className="group flex items-center gap-1 rounded-md px-1 py-1 transition-colors duration-150 hover:bg-secondary/60">
                <button
                  onClick={() => toggleFolder(folder.id)}
                  className="flex min-w-0 flex-1 items-center gap-1.5"
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: dotColor(folder.color) }}
                  />
                  {isCollapsed
                    ? <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                    : <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
                  }
                  <span className="truncate text-xs font-medium text-foreground">{folder.name}</span>
                  <span className="ml-auto shrink-0 text-[10px] text-muted-foreground/50">{items.length}</span>
                </button>
                <button
                  onClick={() => removeFolder(folder.id)}
                  className="ml-0.5 hidden shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive group-hover:block"
                  title="Delete folder"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>

              {!isCollapsed && (
                <div className="ml-4 space-y-0.5 border-l border-border pl-2 pt-0.5">
                  {items.length === 0 ? (
                    <p className="py-1 text-[11px] text-muted-foreground/40">Empty</p>
                  ) : (
                    items.map((scan) => (
                      <ScanRow key={scan.id} scan={scan} folders={state.folders} onAssign={assign} />
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Unassigned scans ── */}
      <div className="px-2">
        {isLoading ? (
          <div className="space-y-1 px-1 pt-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-8 w-full animate-pulse rounded-md bg-secondary/60" />
            ))}
          </div>
        ) : isError ? (
          <p className="px-1 py-1 text-[11px] text-muted-foreground/70">Couldn't load history.</p>
        ) : unassigned.length === 0 ? (
          scans.length === 0 ? (
            <p className="px-1 py-2 text-[11px] text-muted-foreground/50">Your scans will show up here.</p>
          ) : null
        ) : (
          <div className="space-y-0.5">
            {unassigned.map((scan) => (
              <ScanRow key={scan.id} scan={scan} folders={state.folders} onAssign={assign} />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

// ── ScanRow ───────────────────────────────────────────────────────────────────

function ScanRow({
  scan,
  folders,
  onAssign,
}: {
  scan: Scan;
  folders: FolderDef[];
  onAssign: (scanId: string, folderId: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  function handleRowClick(e: React.MouseEvent) {
    // Don't navigate if clicking the folder button or its dropdown
    if ((e.target as HTMLElement).closest("[data-folder-btn]")) return;
    const raw = localStorage.getItem(SCAN_CACHE_KEY(scan.id));
    if (!raw) return; // no stored data for old scans
    try {
      const stored = JSON.parse(raw);
      navigate("/report", { state: stored });
    } catch {
      // ignore
    }
  }

  return (
    <div
      ref={ref}
      onClick={handleRowClick}
      className="group relative flex min-w-0 cursor-pointer items-start gap-1 rounded-md px-1 py-1.5 transition-colors duration-150 hover:bg-secondary/60"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-foreground">{scanLabel(scan)}</p>
        {scan.error_category && (
          <p className="truncate text-[10px] uppercase tracking-wide text-muted-foreground/60">
            {scan.error_category}
          </p>
        )}
      </div>

      <button
        data-folder-btn
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="mt-0.5 hidden shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground group-hover:block"
        title="Move to folder"
      >
        <FolderOpen className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div className="absolute right-0 top-7 z-50 min-w-[140px] rounded-lg border border-border bg-card p-1 shadow-xl">
          <p className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Move to
          </p>
          {folders.length === 0 ? (
            <p className="px-2 py-1.5 text-[11px] text-muted-foreground/70">No folders yet</p>
          ) : (
            folders.map((f) => (
              <button
                key={f.id}
                onClick={() => { onAssign(scan.id, f.id); setOpen(false); }}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-secondary"
              >
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: dotColor(f.color) }} />
                <span className="truncate">{f.name}</span>
              </button>
            ))
          )}
          <div className="my-0.5 border-t border-border" />
          <button
            onClick={() => { onAssign(scan.id, null); setOpen(false); }}
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-[11px] text-muted-foreground hover:bg-secondary"
          >
            Remove from folder
          </button>
        </div>
      )}
    </div>
  );
}
