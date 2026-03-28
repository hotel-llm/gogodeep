import * as React from "react";
import { Plus, Upload } from "lucide-react";
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
      <div className="relative z-10 mt-14 flex h-[calc(100vh-3.5rem)] overflow-hidden">
          <Sidebar
            variant="sidebar"
            collapsible="icon"
            className="border-r border-border bg-card text-sidebar-foreground"
            style={{ top: "3.5rem", height: "calc(100vh - 3.5rem)" }}
          >
            <SidebarHeader className="overflow-hidden p-3">
              {/* Trigger row — always visible */}
              <div className="flex items-center justify-end">
                <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              </div>

              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location.pathname === "/lab"} tooltip="Upload">
                    <Link to="/lab" className="flex items-center gap-2">
                      <Upload className="h-4 w-4 shrink-0" />
                      <span className="truncate text-sm group-data-[collapsible=icon]:hidden">Upload</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="New scan" className="group-data-[collapsible=icon]:hidden">
                    <Link to="/lab" className="flex items-center gap-2 text-primary">
                      <Plus className="h-4 w-4 shrink-0" />
                      <span className="truncate text-sm">New scan</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarHeader>

            <SidebarSeparator className="bg-border" />
            <HistorySidebar />
            <SidebarRail />
          </Sidebar>

          <SidebarInset className={cn("overflow-y-auto", className)}>
            <div className="container max-w-6xl py-6 sm:py-8">
              <div className="mb-6 flex flex-col gap-1">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
                {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
              </div>
              {children}
            </div>
          </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
