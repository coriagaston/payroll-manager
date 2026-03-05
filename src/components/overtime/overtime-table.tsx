"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface OvertimeRow {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  hours: number;
  type: string;
  note: string;
}

interface Props {
  rows: OvertimeRow[];
  employees: { id: string; name: string }[];
  businessId: string;
  canEdit: boolean;
  defaultFrom: string;
  defaultTo: string;
}

const typeLabel: Record<string, string> = {
  EXTRA_50: "50%",
  EXTRA_100: "100%",
  HOLIDAY: "Feriado",
};

const typeBadgeVariant: Record<string, "default" | "secondary" | "outline"> = {
  EXTRA_50: "outline",
  EXTRA_100: "secondary",
  HOLIDAY: "default",
};

export function OvertimeTable({ rows, employees, businessId, canEdit, defaultFrom, defaultTo }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [empFilter, setEmpFilter] = useState("ALL");

  const applyFilter = () => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (empFilter !== "ALL") params.set("employeeId", empFilter);
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este registro?")) return;
    try {
      const res = await fetch(
        `/api/businesses/${businessId}/overtime?id=${id}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error();
      toast.success("Registro eliminado");
      router.refresh();
    } catch {
      toast.error("Error al eliminar");
    }
  };

  // Totales
  const totals = rows.reduce(
    (acc, r) => {
      if (r.type === "EXTRA_50") acc.h50 += r.hours;
      else if (r.type === "EXTRA_100") acc.h100 += r.hours;
      else acc.holiday += r.hours;
      return acc;
    },
    { h50: 0, h100: 0, holiday: 0 }
  );

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-end bg-white p-4 rounded-lg border">
        <div className="space-y-1">
          <Label className="text-xs">Desde</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Hasta</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Empleado</Label>
          <Select value={empFilter} onValueChange={setEmpFilter}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              {employees.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={applyFilter} variant="outline">Filtrar</Button>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "HS 50%", value: totals.h50, color: "bg-yellow-50 border-yellow-200" },
          { label: "HS 100%", value: totals.h100, color: "bg-orange-50 border-orange-200" },
          { label: "Feriado", value: totals.holiday, color: "bg-red-50 border-red-200" },
        ].map((s) => (
          <div key={s.label} className={`${s.color} border rounded-lg p-3 text-center`}>
            <p className="text-xs text-slate-500">{s.label}</p>
            <p className="text-xl font-bold">{s.value.toFixed(1)}h</p>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div className="rounded-lg border bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empleado</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Horas</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Nota</TableHead>
              {canEdit && <TableHead className="text-right">Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canEdit ? 6 : 5} className="text-center py-8 text-slate-500">
                  No hay horas extras en este período
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.employeeName}</TableCell>
                  <TableCell>
                    {new Date(row.date + "T00:00:00").toLocaleDateString("es-AR")}
                  </TableCell>
                  <TableCell>{row.hours}h</TableCell>
                  <TableCell>
                    <Badge variant={typeBadgeVariant[row.type]}>
                      {typeLabel[row.type]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-500 max-w-xs truncate">{row.note || "—"}</TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => handleDelete(row.id)}
                      >
                        Eliminar
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
