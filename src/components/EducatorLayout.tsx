import * as React from "react";
import { LayoutDashboard, Microscope } from "lucide-react";
import gogodeepLogo from "@/assets/gogodeep-logo.png";
import { Link, useLocation } from "react-router-dom";

import HistorySidebar from "@/components/HistorySidebar";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";

function NavItem({
  to,
  icon: Icon,
  label,
  isActive,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  isActive: boolean;
}) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive} tooltip={label}>
        <Link to={to} className="flex items-center gap-2">
          <Icon className="h-4 w-4" />
          <span className="text-sm">{label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export default function EducatorLayout({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const location = useLocation();

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="relative z-10 min-h-screen pt-14">
        <div className="relative">
          <Sidebar
            variant="sidebar"
            collapsible="icon"
            className="border-r border-border bg-card text-sidebar-foreground"
          >
            <SidebarHeader className="gap-3 p-3">
              <div className="flex items-center justify-between gap-2">
                <Link to="/" className="flex items-center gap-2">
                  <img src={gogodeepLogo} alt="Gogodeep" className="h-5 w-5 object-contain" />
                  <span className="text-xs font-bold tracking-tight text-foreground">Gogodeep</span>
                </Link>
                <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              </div>

              <div className="rounded-lg border border-border bg-secondary px-3 py-2">
                <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Workspace</div>
                <div className="mt-0.5 text-xs text-foreground">Labs & recent scans</div>
              </div>

              <SidebarMenu>
                <NavItem to="/" icon={LayoutDashboard} label="Home" isActive={location.pathname === "/"} />
                <NavItem to="/lab" icon={Microscope} label="Lab" isActive={location.pathname === "/lab"} />
              </SidebarMenu>
            </SidebarHeader>

            <SidebarSeparator className="bg-border" />
            <HistorySidebar />
            <SidebarRail />
          </Sidebar>

          <SidebarInset className={cn(className)}>
            <div className="container max-w-6xl py-8 sm:py-10">
              <div className="mb-8 flex flex-col gap-1">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
                {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
              </div>
              {children}
            </div>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}
