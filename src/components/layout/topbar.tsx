"use client";

import { usePathname } from "next/navigation";
import { MobileNav } from "./mobile-nav";

interface Business {
  id: string;
  name: string;
  role: string;
}

interface Props {
  businesses: Business[];
  user: { name: string; email: string };
}

const pathLabels: Record<string, string> = {
  employees: "Empleados",
  overtime: "Horas Extras",
  advances: "Anticipos y Descuentos",
  payroll: "Liquidaciones",
  settings: "Configuración",
};

export function TopBar({ businesses, user }: Props) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const lastSegment = segments[segments.length - 1];

  const label =
    pathLabels[lastSegment] ??
    (segments.length === 1 ? "Dashboard" : "");

  return (
    <header className="h-14 border-b border-slate-200 bg-white flex items-center px-4 gap-3">
      <MobileNav businesses={businesses} user={user} />
      <h2 className="text-sm font-medium text-slate-700">{label}</h2>
    </header>
  );
}
