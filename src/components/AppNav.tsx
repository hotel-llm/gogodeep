import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Microscope, LogOut, UserCircle2, CircleDollarSign, Mail, Pencil } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import gogodeepLogo from "@/assets/gogodeep-logo.png";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const navItems = [
  { path: "/", label: "Home", icon: LayoutDashboard },
  { path: "/lab", label: "Lab", icon: Microscope },
  { path: "/pricing", label: "Pricing", icon: CircleDollarSign },
  { path: "/contact", label: "Contact", icon: Mail },
];

const AppNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [renaming, setRenaming] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const displayName = (u: User) =>
    u.user_metadata?.username ?? u.email?.split("@")[0] ?? "Account";

  function openRename() {
    if (!user) return;
    setNewName(displayName(user));
    setRenameOpen(true);
    setTimeout(() => inputRef.current?.select(), 50);
  }

  async function saveRename() {
    const trimmed = newName.trim();
    if (!trimmed || !user) return;
    if (trimmed === displayName(user)) { setRenameOpen(false); return; }
    setRenaming(true);
    const { data, error } = await supabase.auth.updateUser({ data: { username: trimmed } });
    if (!error) {
      await (supabase as any).from("profiles").update({ username: trimmed }).eq("id", user.id);
      setUser(data.user);
      toast.success("Name updated.");
      setRenameOpen(false);
    } else {
      toast.error(error.message);
    }
    setRenaming(false);
  }

  const onLogout = async () => {
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container flex h-14 items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={gogodeepLogo} alt="Gogodeep" className="h-6 w-6 object-contain" />
            <span className="text-sm font-bold tracking-tight text-foreground">Gogodeep</span>
          </Link>
          <div className="flex items-center gap-1">
            {navItems.map(({ path, label, icon: Icon }) => {
              const isActive = location.pathname === path;
              return (
                <Link
                  key={path}
                  to={path}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </Link>
              );
            })}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="ml-2 h-8 gap-2 border-border text-xs text-foreground">
                    <UserCircle2 className="h-4 w-4 text-muted-foreground" />
                    {displayName(user)}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60 border border-border bg-card">
                  <DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground">{user.email}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={openRename} className="cursor-pointer gap-2">
                    <Pencil className="h-4 w-4" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onLogout} className="cursor-pointer gap-2">
                    <LogOut className="h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/login" className="ml-2">
                <Button className="h-8 px-4 text-xs font-semibold bg-primary hover:bg-primary/90">Login</Button>
              </Link>
            )}
          </div>
        </div>
      </nav>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="border border-border bg-card sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">Rename</DialogTitle>
          </DialogHeader>
          <div className="mt-2 space-y-4">
            <Input
              ref={inputRef}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") saveRename(); }}
              className="border-border bg-secondary"
              placeholder="Your name"
              maxLength={40}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" className="border-border" onClick={() => setRenameOpen(false)}>Cancel</Button>
              <Button className="bg-primary hover:bg-primary/90" onClick={saveRename} disabled={renaming || !newName.trim()}>
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AppNav;
