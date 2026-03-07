"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  calculateVacationDays,
  calculateVacationPayment,
  formatCurrency,
  toLocalDateStr,
} from "@/lib/payroll/calculator";

interface Employee {
  id: string;
  name: string;
  baseSalary: number;
  startDate: string; // YYYY-MM-DD
}

interface Props {
  businessId: string;
  currency: string;
  employees: Employee[];
}

export function VacationGenerateDialog({ businessId, currency, employees }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const today = toLocalDateStr(new Date());
  const [startDate, setStartDate] = useState(today);

  const employee = employees.find((e) => e.id === employeeId);

  const preview = useMemo(() => {
    if (!employee || !startDate) return null;
    const days = calculateVacationDays(employee.startDate, startDate);
    const { dailyRate, totalAmount } = calculateVacationPayment(employee.baseSalary, days);
    const seniority = Math.floor(
      (new Date(startDate).getTime() - new Date(employee.startDate).getTime()) /
        (1000 * 60 * 60 * 24 * 365.25)
    );
    return { days, dailyRate, totalAmount, seniority };
  }, [employee, startDate]);

  const handleGenerate = async () => {
    if (!employeeId || !startDate) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/businesses/${businessId}/payroll/generate-vacation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, startDate }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Error");
      }
      toast.success("Vacaciones generadas correctamente");
      setOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al generar vacaciones");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Vacaciones</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generar Vacaciones</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Ley 20.744 Art. 150-155 · Días según antigüedad
        </p>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Empleado *</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger><SelectValue placeholder="Seleccionar empleado" /></SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Fecha inicio vacaciones *</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          {preview && employee && (
            <div className="border rounded-lg p-4 space-y-2 bg-muted/30">
              <p className="text-sm font-medium">{employee.name}</p>
              <div className="grid grid-cols-2 gap-y-1 text-sm">
                <span className="text-muted-foreground">Antigüedad</span>
                <span>{preview.seniority} años</span>
                <span className="text-muted-foreground">Días entitulados</span>
                <span className="font-medium">{preview.days} días</span>
                <span className="text-muted-foreground">Valor día</span>
                <span>{formatCurrency(preview.dailyRate, currency)}</span>
                <span className="text-muted-foreground">Total a cobrar</span>
                <span className="font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(preview.totalAmount, currency)}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleGenerate} disabled={loading || !employeeId || !startDate}>
            {loading ? "Generando..." : "Generar Vacaciones"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
