"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/payroll/calculator";

interface Employee {
  id: string;
  name: string;
  baseSalary: number;
}

interface Props {
  businessId: string;
  currency: string;
  employees: Employee[];
}

export function SacGenerateDialog({ businessId, currency, employees }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(String(currentYear));
  const [semester, setSemester] = useState("1");

  const preview = employees.map((e) => ({
    ...e,
    sac: e.baseSalary / 2,
  }));
  const total = preview.reduce((s, e) => s + e.sac, 0);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/businesses/${businessId}/payroll/generate-sac`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: Number(year), semester: Number(semester) }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Error");
      }
      toast.success("SAC generado correctamente");
      setOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al generar SAC");
    } finally {
      setLoading(false);
    }
  };

  const years = [currentYear - 1, currentYear, currentYear + 1].map(String);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">SAC / Aguinaldo</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Generar SAC (Aguinaldo)</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Ley 20.744 Art. 121-122 · Monto = sueldo base / 2
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Año</Label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Semestre</Label>
            <Select value={semester} onValueChange={setSemester}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1° Semestre (Jun 30)</SelectItem>
                <SelectItem value="2">2° Semestre (Dic 31)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Preview */}
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Empleado</th>
                <th className="text-right px-3 py-2 font-medium">Sueldo base</th>
                <th className="text-right px-3 py-2 font-medium">SAC</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((e) => (
                <tr key={e.id} className="border-t">
                  <td className="px-3 py-2">{e.name}</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">
                    {formatCurrency(e.baseSalary, currency)}
                  </td>
                  <td className="px-3 py-2 text-right font-medium">
                    {formatCurrency(e.sac, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t bg-muted/50">
              <tr>
                <td colSpan={2} className="px-3 py-2 font-semibold">Total</td>
                <td className="px-3 py-2 text-right font-bold">
                  {formatCurrency(total, currency)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleGenerate} disabled={loading || employees.length === 0}>
            {loading ? "Generando..." : "Generar SAC"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
