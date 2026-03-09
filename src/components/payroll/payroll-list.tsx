"use client";

import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/payroll/calculator";
import { format } from "date-fns";

interface PayrollRow {
  id: string;
  startDate: string;
  endDate: string;
  frequency: string;
  type: string;
  status: string;
  employeeCount: number;
  totalAmount: number;
}

interface Props {
  rows: PayrollRow[];
  businessId: string;
  currency: string;
}

const freqLabel: Record<string, string> = {
  WEEKLY: "Semanal",
  BIWEEKLY: "Quincenal",
  MONTHLY: "Mensual",
};

const typeLabel: Record<string, string> = {
  REGULAR: "",
  SAC: "SAC",
  VACATION: "Vacaciones",
};

export function PayrollList({ rows, businessId, currency }: Props) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [freqFilter, setFreqFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
      if (freqFilter !== "ALL" && r.frequency !== freqFilter) return false;
      if (typeFilter !== "ALL" && r.type !== typeFilter) return false;
      if (search) {
        const dateStr =
          format(new Date(r.startDate + "T00:00:00"), "dd/MM/yyyy") +
          " " +
          format(new Date(r.endDate + "T00:00:00"), "dd/MM/yyyy");
        if (!dateStr.includes(search)) return false;
      }
      return true;
    });
  }, [rows, statusFilter, freqFilter, search]);

  const handleExportCsv = (periodId: string) => {
    window.open(`/api/businesses/${businessId}/payroll/${periodId}/export`, "_blank");
  };

  const handleExportExcel = (periodId: string) => {
    window.open(`/api/businesses/${businessId}/payroll/${periodId}/export-excel`, "_blank");
  };

  const handleFinalize = async (periodId: string) => {
    if (!confirm("¿Finalizar esta liquidación? No podrá modificarse después.")) return;
    try {
      const res = await fetch(`/api/businesses/${businessId}/payroll/${periodId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "FINALIZED" }),
      });
      if (!res.ok) throw new Error();
      toast.success("Liquidación finalizada");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Error al finalizar");
    }
  };

  const handleDelete = async (periodId: string) => {
    if (!confirm("¿Eliminar esta liquidación?")) return;
    try {
      const res = await fetch(`/api/businesses/${businessId}/payroll/${periodId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success("Liquidación eliminada");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Error al eliminar");
    }
  };

  if (rows.length === 0) {
    return (
      <div className="text-center py-16 bg-card rounded-lg border">
        <p className="text-muted-foreground">No hay liquidaciones generadas aún.</p>
        <p className="text-muted-foreground text-sm mt-1">Usá el botón "Nueva liquidación" para comenzar.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Buscar por fecha..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-48"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos los estados</SelectItem>
            <SelectItem value="DRAFT">Borrador</SelectItem>
            <SelectItem value="FINALIZED">Finalizada</SelectItem>
          </SelectContent>
        </Select>
        <Select value={freqFilter} onValueChange={setFreqFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas las frecuencias</SelectItem>
            <SelectItem value="WEEKLY">Semanal</SelectItem>
            <SelectItem value="BIWEEKLY">Quincenal</SelectItem>
            <SelectItem value="MONTHLY">Mensual</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos los tipos</SelectItem>
            <SelectItem value="REGULAR">Regular</SelectItem>
            <SelectItem value="SAC">SAC</SelectItem>
            <SelectItem value="VACATION">Vacaciones</SelectItem>
          </SelectContent>
        </Select>
        {filtered.length !== rows.length && (
          <span className="text-sm text-muted-foreground self-center">
            {filtered.length} de {rows.length}
          </span>
        )}
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Período</TableHead>
            <TableHead>Frecuencia</TableHead>
            <TableHead>Empleados</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                Sin resultados para los filtros aplicados
              </TableCell>
            </TableRow>
          ) : filtered.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-medium">
                {format(new Date(row.startDate + "T00:00:00"), "dd/MM/yyyy")}
                {" → "}
                {format(new Date(row.endDate + "T00:00:00"), "dd/MM/yyyy")}
              </TableCell>
              <TableCell className="space-x-1">
                {row.type !== "REGULAR" ? (
                  <Badge variant="secondary">{typeLabel[row.type] ?? row.type}</Badge>
                ) : (
                  <Badge variant="outline">{freqLabel[row.frequency]}</Badge>
                )}
              </TableCell>
              <TableCell>{row.employeeCount}</TableCell>
              <TableCell className="text-right font-semibold">
                {formatCurrency(row.totalAmount, currency)}
              </TableCell>
              <TableCell>
                <Badge variant={row.status === "FINALIZED" ? "default" : "secondary"}>
                  {row.status === "FINALIZED" ? "Finalizada" : "Borrador"}
                </Badge>
              </TableCell>
              <TableCell className="text-right space-x-2">
                <Link href={`/${businessId}/payroll/${row.id}`}>
                  <Button variant="outline" size="sm">Ver</Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportCsv(row.id)}
                >
                  CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportExcel(row.id)}
                >
                  Excel
                </Button>
                {row.status === "DRAFT" && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleFinalize(row.id)}
                    >
                      Finalizar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-600 dark:text-red-400"
                      onClick={() => handleDelete(row.id)}
                    >
                      Eliminar
                    </Button>
                  </>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>
    </div>
  );
}
