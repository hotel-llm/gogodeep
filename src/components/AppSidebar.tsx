import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Waves, Atom, LogOut, UserCircle2,
  Moon, Sun, SunMoon, Settings, Mail,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import gogodeepLogo from "@/assets/gogodeep-logo.png";
import { applyColorMode, getStoredColorMode, type ColorMode } from "@/lib/theme";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV_ITEMS = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/workspace", label: "Workspace", icon: Waves },
  { path: "/interact", label: "Interact", icon: Atom },
];

const COLOR_MODE_CYCLE: ColorMode[] = ["dark", "white", "auto"];
const COLOR_MODE_ICONS: Record<ColorMode, React.ReactNode> = {
  dark:  <Moon className="h-4 w-4" />,
  white: <Sun className="h-4 w-4" />,
  auto:  <SunMoon className="h-4 w-4" />,
};
const COLOR_MODE_LABELS: Record<ColorMode, string> = {
  dark: "Dark", white: "Light", auto: "System",
};

export default function AppSidebar({ user }: { user: User; onUserUpdate?: (u: User) => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [colorMode, setColorMode] = useState<ColorMode>(getStoredColorMode);

  const displayName = (u: User) =>
    u.user_metadata?.username ?? u.email?.split("@")[0] ?? "Account";

  function cycleColorMode() {
    const next = COLOR_MODE_CYCLE[(COLOR_MODE_CYCLE.indexOf(colorMode) + 1) % 3];
    applyColorMode(next);
    setColorMode(next);
  }

  async function onLogout() {
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  }

  return (
    <aside className="fixed left-0 top-0 z-50 flex h-screen w-56 flex-col border-r border-border bg-card">
      {/* Logo */}
      <Link to="/dashboard" className="flex items-center gap-3 px-5 py-5">
        <img src={gogodeepLogo} alt="Gogodeep" className="h-7 w-7 object-contain" />
        <span className="text-base font-bold tracking-tight text-foreground">Gogodeep</span>
      </Link>

      {/* Nav items */}
      <nav className="flex-1 space-y-0.5 px-3 py-1">
        {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom controls */}
      <div className="space-y-0.5 px-3 pb-4">
        {/* Color mode */}
        <button
          onClick={cycleColorMode}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          {COLOR_MODE_ICONS[colorMode]}
          <span>{COLOR_MODE_LABELS[colorMode]}</span>
        </button>

        {/* Account */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
              <UserCircle2 className="h-4 w-4 shrink-0" />
              <span className="truncate">{displayName(user)}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-52 border border-border bg-card">
            <DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground">
              {user.email}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/settings")} className="cursor-pointer gap-2">
              <Settings className="h-4 w-4" /> Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/contact")} className="cursor-pointer gap-2">
              <Mail className="h-4 w-4" /> Contact
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onLogout} className="cursor-pointer gap-2">
              <LogOut className="h-4 w-4" /> Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
