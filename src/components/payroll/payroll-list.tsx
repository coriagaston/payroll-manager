"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

export function PayrollList({ rows, businessId, currency }: Props) {
  const router = useRouter();

  const handleExport = (periodId: string) => {
    window.open(`/api/businesses/${businessId}/payroll/${periodId}/export`, "_blank");
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
    } catch {
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
    } catch {
      toast.error("Error al eliminar");
    }
  };

  if (rows.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-lg border">
        <p className="text-slate-500">No hay liquidaciones generadas aún.</p>
        <p className="text-slate-400 text-sm mt-1">Usá el botón "Nueva liquidación" para comenzar.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-white overflow-x-auto">
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
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-medium">
                {format(new Date(row.startDate + "T00:00:00"), "dd/MM/yyyy")}
                {" → "}
                {format(new Date(row.endDate + "T00:00:00"), "dd/MM/yyyy")}
              </TableCell>
              <TableCell>
                <Badge variant="outline">{freqLabel[row.frequency]}</Badge>
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport(row.id)}
                >
                  CSV
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
                      className="text-red-500 hover:text-red-700"
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
  );
}
