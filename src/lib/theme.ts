export const THEMES = ["blue", "purple", "green", "rose", "amber"] as const;
export type Theme = typeof THEMES[number];

export const THEME_LABELS: Record<Theme, string> = {
  blue: "Blue",
  purple: "Purple",
  green: "Green",
  rose: "Rose",
  amber: "Amber",
};

// Swatch colours shown in the picker
export const THEME_COLORS: Record<Theme, string> = {
  blue: "#4f6ff5",
  purple: "#9b63e0",
  green: "#3ab76e",
  rose: "#e85875",
  amber: "#f5a623",
};

const KEY = "gogodeep_theme";

export function getStoredTheme(): Theme {
  try {
    const v = localStorage.getItem(KEY);
    if (v && (THEMES as readonly string[]).includes(v)) return v as Theme;
  } catch { /* ignore */ }
  return "blue";
}

export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  try { localStorage.setItem(KEY, theme); } catch { /* ignore */ }
}
