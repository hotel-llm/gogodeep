export type ColorMode = "dark" | "white" | "auto";

const KEY = "gogodeep_color_mode";

export function getStoredColorMode(): ColorMode {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "dark" || v === "white" || v === "auto") return v as ColorMode;
  } catch { /* ignore */ }
  return "dark";
}

/** Resolves "auto" to "dark" or "white" based on the user's local time. */
export function resolveColorMode(mode: ColorMode): "dark" | "white" {
  if (mode === "auto") {
    const h = new Date().getHours();
    return h >= 6 && h < 20 ? "white" : "dark";
  }
  return mode;
}

export function applyColorMode(mode: ColorMode) {
  try { localStorage.setItem(KEY, mode); } catch { /* ignore */ }
  const resolved = resolveColorMode(mode);
  if (resolved === "white") {
    document.documentElement.setAttribute("data-theme", "white");
  } else {
    document.documentElement.setAttribute("data-theme", "blue");
  }
}
