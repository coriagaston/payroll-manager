"use client";

import { usePathname } from "next/navigation";

const pathLabels: Record<string, string> = {
  employees: "Empleados",
  overtime: "Horas Extras",
  payroll: "Liquidaciones",
  settings: "Configuración",
};

export function TopBar() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const lastSegment = segments[segments.length - 1];

  const label =
    pathLabels[lastSegment] ??
    (segments.length === 1 ? "Dashboard" : "");

  return (
    <header className="h-14 border-b border-slate-200 bg-white flex items-center px-6">
      <h2 className="text-sm font-medium text-slate-700">{label}</h2>
    </header>
  );
}
