"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { holidaySchema, type HolidayFormData } from "@/lib/validations/business";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { format } from "date-fns";

interface Holiday { id: string; date: string; name: string }

interface Props {
  businessId: string;
  holidays: Holiday[];
  canEdit: boolean;
}

const AVAILABLE_YEARS = [2025, 2026];

export function HolidaysManager({ businessId, holidays, canEdit }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingBulk, setLoadingBulk] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const loadFeriadosByYear = async () => {
    setLoadingBulk(true);
    try {
      const res = await fetch(`/api/businesses/${businessId}/holidays`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: selectedYear }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Error al cargar feriados");
        return;
      }
      toast.success(`${data.added} feriados ${selectedYear} agregados (${data.total - data.added} ya existían)`);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Error al cargar feriados");
    } finally {
      setLoadingBulk(false);
    }
  };

  const { register, handleSubmit, reset, formState: { errors } } = useForm<HolidayFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(holidaySchema) as any,
  });

  const onSubmit = async (data: HolidayFormData) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/businesses/${businessId}/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      toast.success("Feriado agregado");
      reset();
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Error al agregar el feriado");
    } finally {
      setLoading(false);
    }
  };

  const deleteHoliday = async (id: string) => {
    try {
      await fetch(`/api/businesses/${businessId}/config?holidayId=${id}`, { method: "DELETE" });
      toast.success("Feriado eliminado");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Error al eliminar");
    }
  };

  return (
    <div className="space-y-6">
      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Agregar feriado</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="flex gap-3 items-end">
              <div className="space-y-1 flex-1">
                <Label>Fecha</Label>
                <Input type="date" {...register("date")} />
                {errors.date && <p className="text-xs text-red-500">{errors.date.message}</p>}
              </div>
              <div className="space-y-1 flex-1">
                <Label>Nombre</Label>
                <Input placeholder="Ej: Día del Trabajador" {...register("name")} />
                {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
              </div>
              <Button type="submit" disabled={loading}>
                Agregar
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-base">Feriados configurados ({holidays.length})</CardTitle>
          {canEdit && (
            <div className="flex items-center gap-2">
              <Select
                value={String(selectedYear)}
                onValueChange={(v) => setSelectedYear(Number(v))}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_YEARS.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <ConfirmDialog
                trigger={
                  <Button variant="outline" size="sm" disabled={loadingBulk}>
                    {loadingBulk ? "Cargando..." : `Cargar feriados ${selectedYear}`}
                  </Button>
                }
                title={`Cargar feriados ${selectedYear}`}
                description={`¿Agregar los feriados nacionales argentinos ${selectedYear}? Los que ya existen se ignorarán.`}
                confirmLabel="Cargar"
                variant="default"
                onConfirm={loadFeriadosByYear}
              />
            </div>
          )}
        </CardHeader>
        <CardContent>
          {holidays.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay feriados configurados.</p>
          ) : (
            <div className="space-y-2">
              {holidays.map((h) => (
                <div key={h.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">
                      {format(new Date(h.date + "T00:00:00"), "dd/MM/yyyy")}
                    </Badge>
                    <span className="text-sm">{h.name}</span>
                  </div>
                  {canEdit && (
                    <ConfirmDialog
                      trigger={
                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 dark:text-red-400">
                          Eliminar
                        </Button>
                      }
                      title="Eliminar feriado"
                      description={`¿Eliminar "${h.name}" del ${format(new Date(h.date + "T00:00:00"), "dd/MM/yyyy")}?`}
                      confirmLabel="Eliminar"
                      onConfirm={() => deleteHoliday(h.id)}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
