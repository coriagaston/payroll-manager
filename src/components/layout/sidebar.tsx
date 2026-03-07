"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard, Users, Clock, Wallet, CalendarX, FileText,
  Settings, ChevronDown, LogOut, Plus, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateBusinessDialog } from "@/components/layout/create-business-dialog";

interface Business {
  id: string;
  name: string;
  role: string;
}

interface SidebarProps {
  businesses: Business[];
  user: { name: string; email: string };
}

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const navItems = (businessId: string): NavItem[] => [
  { label: "Dashboard",     href: `/${businessId}`,           icon: LayoutDashboard },
  { label: "Empleados",     href: `/${businessId}/employees`, icon: Users },
  { label: "Horas Extras",  href: `/${businessId}/overtime`,  icon: Clock },
  { label: "Anticipos",     href: `/${businessId}/advances`,  icon: Wallet },
  { label: "Inasistencias", href: `/${businessId}/absences`,  icon: CalendarX },
  { label: "Liquidaciones", href: `/${businessId}/payroll`,   icon: FileText },
  { label: "Configuración", href: `/${businessId}/settings`,  icon: Settings },
];

export function Sidebar({ businesses, user }: SidebarProps) {
  const pathname = usePathname();
  const [newBusinessOpen, setNewBusinessOpen] = useState(false);

  const segments = pathname.split("/").filter(Boolean);
  const currentBusinessId = segments[0] ?? businesses[0]?.id;
  const currentBusiness = businesses.find((b) => b.id === currentBusinessId);

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <>
    <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">

      {/* Logo */}
      <div className="h-14 px-4 flex items-center border-b border-sidebar-border shrink-0">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-sm">P</span>
          </div>
          <span className="font-semibold text-sidebar-foreground tracking-tight">PayrollManager</span>
        </Link>
      </div>

      {/* Selector de negocio */}
      <div className="px-3 py-2 border-b border-sidebar-border shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start text-left font-normal h-9 px-2 hover:bg-sidebar-accent"
            >
              <div className="h-6 w-6 rounded-md bg-blue-600 flex items-center justify-center text-xs font-bold text-white mr-2 shrink-0">
                {currentBusiness?.name.charAt(0).toUpperCase() ?? "?"}
              </div>
              <span className="truncate text-sm text-sidebar-foreground">
                {currentBusiness?.name ?? "Seleccionar"}
              </span>
              <ChevronDown className="ml-auto h-3.5 w-3.5 text-muted-foreground shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {businesses.map((b) => (
              <DropdownMenuItem key={b.id} asChild>
                <Link href={`/${b.id}`}>{b.name}</Link>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setNewBusinessOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo negocio
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {currentBusinessId &&
          navItems(currentBusinessId).map((item) => {
            const isActive =
              item.href === `/${currentBusinessId}`
                ? pathname === item.href
                : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors duration-100",
                  isActive
                    ? "bg-blue-600 text-white font-medium shadow-sm"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
      </nav>

      {/* User */}
      <div className="px-3 py-3 border-t border-sidebar-border shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start h-auto py-2 px-2 hover:bg-sidebar-accent"
            >
              <Avatar className="h-7 w-7 mr-2.5 shrink-0">
                <AvatarFallback className="text-xs bg-blue-600 text-white font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start min-w-0">
                <span className="text-sm font-medium text-sidebar-foreground truncate max-w-[140px]">
                  {user.name}
                </span>
                <span className="text-xs text-muted-foreground truncate max-w-[140px]">
                  {user.email}
                </span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top">
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>

    <CreateBusinessDialog open={newBusinessOpen} onOpenChange={setNewBusinessOpen} />
    </>
  );
}
