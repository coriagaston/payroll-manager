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
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Holiday { id: string; date: string; name: string }

interface Props {
  businessId: string;
  holidays: Holiday[];
  canEdit: boolean;
}

export function HolidaysManager({ businessId, holidays, canEdit }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingBulk, setLoadingBulk] = useState(false);

  const loadFeriados2025 = async () => {
    if (!confirm("¿Cargar los feriados nacionales argentinos 2025? Se ignorarán los que ya existen.")) return;
    setLoadingBulk(true);
    try {
      const res = await fetch(`/api/businesses/${businessId}/holidays`, { method: "POST" });
      const data = await res.json();
      toast.success(`${data.added} feriados agregados (${data.total - data.added} ya existían)`);
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
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Feriados configurados ({holidays.length})</CardTitle>
          {canEdit && (
            <Button variant="outline" size="sm" onClick={loadFeriados2025} disabled={loadingBulk}>
              {loadingBulk ? "Cargando..." : "Cargar feriados 2025"}
            </Button>
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
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-600 dark:text-red-400"
                      onClick={() => deleteHoliday(h.id)}
                    >
                      Eliminar
                    </Button>
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
