"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

interface Props {
  businessId: string;
}

export function BulkSalaryDialog({ businessId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [percent, setPercent] = useState("");
  const [loading, setLoading] = useState(false);

  const handleApply = async () => {
    const pct = parseFloat(percent);
    if (isNaN(pct) || pct <= 0 || pct > 500) {
      toast.error("Ingresá un porcentaje válido (1-500)");
      return;
    }
    if (!confirm(`¿Aplicar un aumento del ${pct}% a todos los empleados activos?`)) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/businesses/${businessId}/employees/bulk-salary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ percent: pct }),
      });
      if (!res.ok) throw new Error();
      const { updated } = await res.json();
      toast.success(`Sueldos actualizados para ${updated} empleados`);
      setOpen(false);
      setPercent("");
      router.refresh();
    } catch {
      toast.error("Error al actualizar sueldos");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Aumento masivo</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Actualizar sueldos en %</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Aplica el aumento a <strong>todos los empleados activos</strong> del negocio.
          </p>
          <div className="space-y-1">
            <Label htmlFor="percent">Porcentaje de aumento</Label>
            <div className="flex items-center gap-2">
              <Input
                id="percent"
                type="number"
                min="0.1"
                max="500"
                step="0.1"
                placeholder="15"
                value={percent}
                onChange={(e) => setPercent(e.target.value)}
                className="max-w-[120px]"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
            {percent && !isNaN(parseFloat(percent)) && (
              <p className="text-xs text-muted-foreground">
                Ej: sueldo de $1.000.000 → ${(1000000 * (1 + parseFloat(percent) / 100)).toLocaleString("es-AR")}
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleApply} disabled={loading || !percent}>
              {loading ? "Aplicando..." : "Aplicar aumento"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
