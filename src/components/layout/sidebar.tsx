"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
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

interface Business {
  id: string;
  name: string;
  role: string;
}

interface SidebarProps {
  businesses: Business[];
  user: { name: string; email: string };
}

const navItems = (businessId: string) => [
  { label: "Dashboard", href: `/${businessId}`, icon: "⊞" },
  { label: "Empleados", href: `/${businessId}/employees`, icon: "👥" },
  { label: "Horas Extras", href: `/${businessId}/overtime`, icon: "⏱" },
  { label: "Anticipos", href: `/${businessId}/advances`, icon: "💵" },
  { label: "Liquidaciones", href: `/${businessId}/payroll`, icon: "💰" },
  { label: "Configuración", href: `/${businessId}/settings`, icon: "⚙" },
];

export function Sidebar({ businesses, user }: SidebarProps) {
  const pathname = usePathname();

  // Detectar el businessId activo del path
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
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-slate-200">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">P</span>
          </div>
          <span className="font-bold text-slate-900">PayrollManager</span>
        </Link>
      </div>

      {/* Selector de negocio */}
      <div className="p-3 border-b border-slate-100">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start text-left font-normal h-auto py-2">
              <div className="h-6 w-6 rounded bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold mr-2 flex-shrink-0">
                {currentBusiness?.name.charAt(0).toUpperCase() ?? "?"}
              </div>
              <span className="truncate text-sm">{currentBusiness?.name ?? "Seleccionar"}</span>
              <span className="ml-auto text-slate-400">▾</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {businesses.map((b) => (
              <DropdownMenuItem key={b.id} asChild>
                <Link href={`/${b.id}`}>{b.name}</Link>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/">+ Nuevo negocio</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {currentBusinessId &&
          navItems(currentBusinessId).map((item) => {
            const isActive =
              item.href === `/${currentBusinessId}`
                ? pathname === item.href
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  isActive
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-slate-200">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start h-auto py-2">
              <Avatar className="h-7 w-7 mr-2">
                <AvatarFallback className="text-xs bg-slate-200">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium truncate max-w-[140px]">{user.name}</span>
                <span className="text-xs text-slate-500 truncate max-w-[140px]">{user.email}</span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top">
            <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
