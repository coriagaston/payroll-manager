"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/payroll/calculator";
import { format } from "date-fns";
import { AdvanceFormDialog } from "./advance-form-dialog";

interface Advance {
  id: string;
  employeeId: string;
  employee: { name: string };
  date: string;
  amount: number;
  isDiscount: boolean;
  note?: string | null;
}

interface Employee { id: string; name: string; }

interface Props {
  advances: Advance[];
  employees: Employee[];
  businessId: string;
  canEdit: boolean;
  currency: string;
}

export function AdvancesTable({ advances, employees, businessId, canEdit, currency }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");

  const filtered = advances.filter((a) => {
    const matchSearch = !search || a.employee.name.toLowerCase().includes(search.toLowerCase());
    const matchType =
      typeFilter === "ALL" ||
      (typeFilter === "ADVANCE" && !a.isDiscount) ||
      (typeFilter === "DISCOUNT" && a.isDiscount);
    return matchSearch && matchType;
  });

  const totalAdvances = filtered.filter((a) => !a.isDiscount).reduce((s, a) => s + a.amount, 0);
  const totalDiscounts = filtered.filter((a) => a.isDiscount).reduce((s, a) => s + a.amount, 0);

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este registro?")) return;
    try {
      const res = await fetch(`/api/businesses/${businessId}/advances?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success("Eliminado");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Error al eliminar");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-3">
          <Input
            placeholder="Buscar empleado..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              <SelectItem value="ADVANCE">Anticipos</SelectItem>
              <SelectItem value="DISCOUNT">Descuentos</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {canEdit && <AdvanceFormDialog businessId={businessId} employees={employees} />}
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
          <p className="text-xs text-blue-600 font-medium">Total anticipos</p>
          <p className="text-lg font-bold text-blue-800">{formatCurrency(totalAdvances, currency)}</p>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-lg p-3">
          <p className="text-xs text-red-600 font-medium">Total descuentos</p>
          <p className="text-lg font-bold text-red-800">{formatCurrency(totalDiscounts, currency)}</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
          <p className="text-xs text-slate-600 font-medium">Registros</p>
          <p className="text-lg font-bold text-slate-800">{filtered.length}</p>
        </div>
      </div>

      <div className="rounded-lg border bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empleado</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead className="hidden md:table-cell">Nota</TableHead>
              {canEdit && <TableHead className="text-right">Acción</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canEdit ? 6 : 5} className="text-center py-8 text-slate-500">
                  No hay registros
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((adv) => (
                <TableRow key={adv.id}>
                  <TableCell className="font-medium">{adv.employee.name}</TableCell>
                  <TableCell>
                    <Badge variant={adv.isDiscount ? "destructive" : "secondary"}>
                      {adv.isDiscount ? "Descuento" : "Anticipo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {format(new Date(adv.date + "T00:00:00"), "dd/MM/yyyy")}
                  </TableCell>
                  <TableCell className={`text-right font-semibold ${adv.isDiscount ? "text-red-700" : "text-blue-700"}`}>
                    {adv.isDiscount ? "- " : ""}{formatCurrency(adv.amount, currency)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-slate-500 text-sm">
                    {adv.note ?? "—"}
                  </TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => handleDelete(adv.id)}
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
