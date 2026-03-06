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
import { EmployeeFormDialog } from "./employee-form-dialog";
import { formatCurrency } from "@/lib/payroll/calculator";
import { format } from "date-fns";

interface Employee {
  id: string;
  name: string;
  dni?: string | null;
  cbu?: string | null;
  position: string;
  startDate: string;
  baseSalary: number;
  payFrequency: string;
  hourlyRate?: number | null;
  dailyHours: number;
  status: string;
}

interface Props {
  employees: Employee[];
  businessId: string;
  canEdit: boolean;
}

const freqLabel: Record<string, string> = {
  WEEKLY: "Semanal",
  BIWEEKLY: "Quincenal",
  MONTHLY: "Mensual",
};

export function EmployeesTable({ employees, businessId, canEdit }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const filtered = employees.filter((e) => {
    const matchSearch =
      !search ||
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.position.toLowerCase().includes(search.toLowerCase()) ||
      (e.dni && e.dni.includes(search));
    const matchStatus = statusFilter === "ALL" || e.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleDeactivate = async (id: string) => {
    if (!confirm("¿Desactivar este empleado?")) return;
    try {
      const res = await fetch(`/api/businesses/${businessId}/employees/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success("Empleado desactivado");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Error al desactivar");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Input
          placeholder="Buscar por nombre, puesto o DNI..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos</SelectItem>
            <SelectItem value="ACTIVE">Activos</SelectItem>
            <SelectItem value="INACTIVE">Inactivos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead className="hidden md:table-cell">DNI</TableHead>
              <TableHead className="hidden md:table-cell">CBU</TableHead>
              <TableHead>Puesto</TableHead>
              <TableHead>Ingreso</TableHead>
              <TableHead>Sueldo base</TableHead>
              <TableHead>Frecuencia</TableHead>
              <TableHead>Estado</TableHead>
              {canEdit && <TableHead className="text-right">Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canEdit ? 9 : 8} className="text-center py-8 text-slate-500">
                  No se encontraron empleados
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((emp) => (
                <TableRow key={emp.id} className={emp.status === "INACTIVE" ? "opacity-50" : ""}>
                  <TableCell className="font-medium">{emp.name}</TableCell>
                  <TableCell className="hidden md:table-cell text-slate-500">{emp.dni ?? "—"}</TableCell>
                  <TableCell className="hidden md:table-cell text-slate-500 font-mono text-xs">{emp.cbu ?? "—"}</TableCell>
                  <TableCell>{emp.position}</TableCell>
                  <TableCell>{format(new Date(emp.startDate + "T00:00:00"), "dd/MM/yyyy")}</TableCell>
                  <TableCell>{formatCurrency(emp.baseSalary)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{freqLabel[emp.payFrequency]}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={emp.status === "ACTIVE" ? "default" : "secondary"}>
                      {emp.status === "ACTIVE" ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  {canEdit && (
                    <TableCell className="text-right space-x-2">
                      <EmployeeFormDialog
                        businessId={businessId}
                        mode="edit"
                        employee={emp}
                      />
                      {emp.status === "ACTIVE" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => handleDeactivate(emp.id)}
                        >
                          Desactivar
                        </Button>
                      )}
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
