"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { updateBusinessConfig } from "@/app/actions/businesses";
import { businessConfigSchema, type BusinessConfigFormData } from "@/lib/validations/business";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  businessId: string;
  defaultValues: BusinessConfigFormData | null;
  canEdit: boolean;
}

export function BusinessConfigForm({ businessId, defaultValues, canEdit }: Props) {
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } =
    useForm<BusinessConfigFormData>({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      resolver: zodResolver(businessConfigSchema) as any,
      defaultValues: defaultValues ?? {
        extraRate50: 1.5,
        extraRate100: 2.0,
        extraRateHoliday: 2.0,
        hourlyFormulaType: "MONTHLY_200",
        monthlyHours: 200,
        dailyHours: 8,
        workingDaysPerMonth: 25,
        weekStartDay: 1,
        biweeklyFirstStart: 1,
        biweeklyFirstEnd: 15,
      },
    });

  const formulaType = watch("hourlyFormulaType");

  const onSubmit = async (data: BusinessConfigFormData) => {
    try {
      await updateBusinessConfig(businessId, data);
      toast.success("Configuración guardada");
    } catch (error) {
      console.error(error);
      toast.error("Error al guardar la configuración");
    }
  };

  const field = (name: keyof BusinessConfigFormData, label: string, hint?: string) => (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input type="number" step="0.01" disabled={!canEdit} {...register(name)} />
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
      {errors[name] && <p className="text-xs text-red-500">{String(errors[name]?.message)}</p>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Multiplicadores de horas extra</CardTitle>
          <CardDescription>
            El valor hora base se multiplica por estos factores según el tipo de hora extra.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {field("extraRate50", "Factor HS 50%", "Por defecto: 1.5")}
          {field("extraRate100", "Factor HS 100%", "Por defecto: 2.0")}
          {field("extraRateHoliday", "Factor Feriado", "Por defecto: 2.0")}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fórmula de valor hora</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>Tipo de fórmula</Label>
            <Select
              disabled={!canEdit}
              value={formulaType}
              onValueChange={(v) => setValue("hourlyFormulaType", v as "MONTHLY_200" | "DAILY_HOURS")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MONTHLY_200">
                  Opción A: Sueldo ÷ horas mensuales fijas
                </SelectItem>
                <SelectItem value="DAILY_HOURS">
                  Opción B: Sueldo ÷ (horas diarias × días laborales)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {formulaType === "MONTHLY_200" ? (
              field("monthlyHours", "Horas mensuales", "Ej: 200")
            ) : (
              <>
                {field("dailyHours", "Horas por día", "Ej: 8")}
                {field("workingDaysPerMonth", "Días laborales/mes", "Ej: 25")}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Períodos de pago</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1">
            <Label>Inicio de semana</Label>
            <Select
              disabled={!canEdit}
              value={String(watch("weekStartDay"))}
              onValueChange={(v) => setValue("weekStartDay", Number(v))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Lunes</SelectItem>
                <SelectItem value="0">Domingo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {field("biweeklyFirstStart", "Inicio 1ª quincena", "Ej: 1")}
          {field("biweeklyFirstEnd", "Fin 1ª quincena", "Ej: 15")}
        </CardContent>
      </Card>

      {canEdit && (
        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Guardando..." : "Guardar configuración"}
          </Button>
        </div>
      )}
    </form>
  );
}
