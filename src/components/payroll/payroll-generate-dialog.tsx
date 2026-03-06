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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  getWeekPeriod, getBiweeklyPeriod, getMonthlyPeriod, toLocalDateStr,
} from "@/lib/payroll/calculator";
import { PayrollPreview } from "./payroll-preview";
import type { PayrollResult } from "@/lib/payroll/types";

interface Props {
  businessId: string;
  currency: string;
}

export function PayrollGenerateDialog({ businessId, currency }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [frequency, setFrequency] = useState<"WEEKLY" | "BIWEEKLY" | "MONTHLY">("MONTHLY");
  const [refDate, setRefDate] = useState(toLocalDateStr(new Date()));
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<{ results: PayrollResult[]; startDate: string; endDate: string } | null>(null);

  const getPeriod = () => {
    if (frequency === "WEEKLY") return getWeekPeriod(refDate);
    if (frequency === "BIWEEKLY") return getBiweeklyPeriod(refDate);
    return getMonthlyPeriod(refDate);
  };

  const period = getPeriod();

  const handlePreview = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/businesses/${businessId}/payroll?preview=true`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ startDate: period.startDate, endDate: period.endDate, frequency }),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? "Error al previsualizar");
        return;
      }
      const data = await res.json();
      setPreview({ results: data.results, startDate: period.startDate, endDate: period.endDate });
    } catch (error) {
      console.error(error);
      toast.error("Error al previsualizar");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/businesses/${businessId}/payroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate: period.startDate, endDate: period.endDate, frequency }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? "Error al guardar");
        return;
      }
      toast.success("Liquidación guardada como borrador");
      setOpen(false);
      setPreview(null);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setPreview(null); }}>
      <DialogTrigger asChild>
        <Button>+ Nueva liquidación</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generar liquidación</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-4 items-end bg-slate-50 p-4 rounded-lg">
            <div className="space-y-1">
              <Label>Frecuencia de pago</Label>
              <Select
                value={frequency}
                onValueChange={(v) => { setFrequency(v as typeof frequency); setPreview(null); }}
              >
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTHLY">Mensual</SelectItem>
                  <SelectItem value="BIWEEKLY">Quincenal</SelectItem>
                  <SelectItem value="WEEKLY">Semanal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Fecha de referencia</Label>
              <Input
                type="date"
                value={refDate}
                onChange={(e) => { setRefDate(e.target.value); setPreview(null); }}
                className="w-44"
              />
            </div>

            <div className="text-sm text-slate-600 bg-white border rounded-lg px-3 py-2">
              <span className="font-medium">Período: </span>
              {period.startDate} → {period.endDate}
            </div>

            <Button onClick={handlePreview} disabled={loading} variant="outline">
              {loading ? "Calculando..." : "Previsualizar"}
            </Button>
          </div>

          {preview && (
            <>
              <PayrollPreview
                results={preview.results}
                currency={currency}
                startDate={preview.startDate}
                endDate={preview.endDate}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setPreview(null)}>Limpiar</Button>
                <Button onClick={handleSave} disabled={loading}>
                  {loading ? "Guardando..." : "Guardar liquidación"}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
