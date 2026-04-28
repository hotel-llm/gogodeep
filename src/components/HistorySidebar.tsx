import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
import { Plus, Folder, ChevronRight, ChevronDown, Trash2, FolderOpen, Pencil } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { SCAN_CACHE_KEY } from "@/lib/supabase";
import { whaleToast } from "@/lib/whaleToast";
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
  names: Record<string, string>;       // scanId → custom name
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

// ── Persistence ───────────────────────────────────────────────────────────────

const LS_KEY = "gogodeep_lab_v1";

const EMPTY_STATE: LabState = { folders: [], assignments: {}, names: {} };

function loadLocalState(): LabState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return EMPTY_STATE;
    const parsed = JSON.parse(raw) as Partial<LabState>;
    return {
      folders: parsed.folders ?? [],
      assignments: parsed.assignments ?? {},
      names: parsed.names ?? {},
    };
  } catch {
    return EMPTY_STATE;
  }
}

function saveLocal(s: LabState) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch { /* quota */ }
}

async function saveRemote(s: LabState) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await (supabase as any).from("profiles").update({ lab_state: s }).eq("id", user.id);
}

async function loadRemote(): Promise<LabState | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await (supabase as any)
    .from("profiles")
    .select("lab_state")
    .eq("id", user.id)
    .single();
  const raw = data?.lab_state;
  if (!raw || typeof raw !== "object") return null;
  return {
    folders: raw.folders ?? [],
    assignments: raw.assignments ?? {},
    names: raw.names ?? {},
  };
}

// ── Scan display name ─────────────────────────────────────────────────────────

function scanLabel(scan: Scan, names: Record<string, string>): string {
  return names[scan.id] || scan.topic || scan.specific_error_tag || scan.subject || "Untitled scan";
}

// ── Main component ────────────────────────────────────────────────────────────

export default function HistorySidebar() {
  const location = useLocation();
  const activeScanId = (location.state as any)?.scanId as string | undefined;
  const [state, setState] = useState<LabState>(loadLocalState);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftColor, setDraftColor] = useState("blue");

  // Sync with Supabase on mount — remote wins
  useEffect(() => {
    loadRemote().then((remote) => {
      if (!remote) return;
      setState(remote);
      saveLocal(remote);
    });
  }, []);

  // Keep in sync with inline title renames done from the report page
  useEffect(() => {
    function handler(e: Event) {
      const { scanId, name } = (e as CustomEvent).detail as { scanId: string; name: string };
      setState((prev) => {
        const names = { ...prev.names, [scanId]: name };
        const next = { ...prev, names };
        saveLocal(next);
        return next;
      });
    }
    window.addEventListener("gogodeep-scan-renamed", handler);
    return () => window.removeEventListener("gogodeep-scan-renamed", handler);
  }, []);

  const update = useCallback((next: LabState) => {
    setState(next);
    saveLocal(next);
    saveRemote(next);
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
    update({ folders: state.folders.filter((f) => f.id !== id), assignments, names: state.names });
  }

  function assign(scanId: string, folderId: string | null) {
    const assignments = { ...state.assignments };
    if (folderId === null) delete assignments[scanId];
    else assignments[scanId] = folderId;
    update({ ...state, assignments });
  }

  function renameScan(scanId: string, name: string) {
    const names = { ...state.names };
    if (name) names[scanId] = name;
    else delete names[scanId];
    update({ ...state, names });
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
              <div className="group flex items-center gap-1 rounded-md px-1 py-1 hover:bg-secondary/40">
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
                  className="ml-0.5 shrink-0 rounded p-0.5 text-transparent hover:text-destructive group-hover:text-muted-foreground"
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
                      <ScanRow
                        key={scan.id}
                        scan={scan}
                        folders={state.folders}
                        currentFolderId={state.assignments[scan.id] ?? null}
                        customName={state.names[scan.id] ?? null}
                        onAssign={assign}
                        onRename={renameScan}
                        isActive={scan.id === activeScanId}
                      />
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
              <div key={i} className="h-7 w-full animate-pulse rounded bg-secondary/60" />
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
              <ScanRow
                key={scan.id}
                scan={scan}
                folders={state.folders}
                currentFolderId={null}
                customName={state.names[scan.id] ?? null}
                onAssign={assign}
                onRename={renameScan}
                isActive={scan.id === activeScanId}
              />
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
  currentFolderId,
  customName,
  onAssign,
  onRename,
  isActive = false,
}: {
  scan: Scan;
  folders: FolderDef[];
  currentFolderId: string | null;
  customName: string | null;
  onAssign: (scanId: string, folderId: string | null) => void;
  onRename: (scanId: string, name: string) => void;
  isActive?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!menuOpen) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  useEffect(() => {
    if (editing) {
      const label = customName || scan.topic || scan.specific_error_tag || scan.subject || "";
      setDraft(label);
      setTimeout(() => inputRef.current?.select(), 0);
    }
  }, [editing]);

  function commitRename() {
    const trimmed = draft.trim();
    onRename(scan.id, trimmed);
    setEditing(false);
  }

  async function handleRowClick(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest("[data-action-btn]")) return;
    if (editing) return;

    // Try localStorage first (fast path)
    const raw = localStorage.getItem(SCAN_CACHE_KEY(scan.id));
    if (raw) {
      try {
        const stored = JSON.parse(raw);
        navigate("/report", { state: { ...stored, scanId: scan.id } });
        return;
      } catch { /* fall through to Supabase */ }
    }

    // Fall back to Supabase
    const { data, error } = await (supabase as any)
      .from("error_logs")
      .select("diagnosis")
      .eq("id", scan.id)
      .single();

    if (error || !data?.diagnosis) {
      whaleToast.error("Could not load this scan. It may have been created before history sync was enabled.");
      return;
    }

    navigate("/report", { state: { diagnosis: data.diagnosis, mode: (data.diagnosis as any)?.mode ?? "guide", scanId: scan.id } });
  }

  const label = customName || scan.topic || scan.specific_error_tag || scan.subject || "Untitled scan";

  return (
    <div
      ref={ref}
      onClick={handleRowClick}
      className={cn(
        "group relative flex min-w-0 cursor-pointer items-center gap-1 rounded-md px-1 py-1.5 hover:bg-secondary/40",
        isActive && "bg-primary/10 ring-1 ring-inset ring-primary/20"
      )}
    >
      {editing ? (
        <input
          ref={inputRef}
          data-action-btn
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename();
            if (e.key === "Escape") setEditing(false);
          }}
          onClick={(e) => e.stopPropagation()}
          className="min-w-0 flex-1 rounded border border-primary bg-card px-1.5 py-0.5 text-xs text-foreground outline-none"
        />
      ) : (
        <p className={cn("min-w-0 flex-1 truncate text-xs font-medium", isActive ? "text-primary" : "text-foreground")}>{label}</p>
      )}

      {/* Rename button — always in DOM to prevent layout shift, invisible until hover */}
      <button
        data-action-btn
        onClick={(e) => { e.stopPropagation(); setEditing(true); }}
        className="shrink-0 rounded p-0.5 text-transparent group-hover:text-muted-foreground hover:!text-foreground"
        title="Rename"
      >
        <Pencil className="h-3 w-3" />
      </button>

      {/* Folder button — always in DOM to prevent layout shift */}
      <button
        data-action-btn
        onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
        className="shrink-0 rounded p-0.5 text-transparent group-hover:text-muted-foreground hover:!text-foreground"
        title="Move to folder"
      >
        <FolderOpen className="h-3.5 w-3.5" />
      </button>

      {menuOpen && (
        <div className="absolute right-0 top-full z-50 mt-0.5 min-w-[140px] rounded-lg border border-border bg-card p-1 shadow-xl">
          <p className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Move to
          </p>
          {folders.length === 0 ? (
            <p className="px-2 py-1.5 text-[11px] text-muted-foreground/70">No folders yet</p>
          ) : (
            folders.map((f) => (
              <button
                key={f.id}
                onClick={(e) => { e.stopPropagation(); onAssign(scan.id, f.id); setMenuOpen(false); }}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-secondary"
              >
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: dotColor(f.color) }} />
                <span className="truncate">{f.name}</span>
              </button>
            ))
          )}
          {currentFolderId && (
            <>
              <div className="my-0.5 border-t border-border" />
              <button
                onClick={(e) => { e.stopPropagation(); onAssign(scan.id, null); setMenuOpen(false); }}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-[11px] text-muted-foreground hover:bg-secondary"
              >
                Remove from folder
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
