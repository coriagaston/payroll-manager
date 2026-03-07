"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { format } from "date-fns";
import { createEmployee, updateEmployee } from "@/app/actions/employees";
import { employeeSchema, type EmployeeFormData } from "@/lib/validations/employee";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/payroll/calculator";

interface SalaryHistoryEntry {
  id: string;
  salary: string;
  validFrom: string;
  note: string | null;
}

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
  businessId: string;
  mode: "create" | "edit";
  employee?: Employee;
}

export function EmployeeFormDialog({ businessId, mode, employee }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [salaryHistory, setSalaryHistory] = useState<SalaryHistoryEntry[]>([]);

  useEffect(() => {
    if (open && mode === "edit" && employee) {
      fetch(`/api/businesses/${businessId}/employees/${employee.id}/salary-history`)
        .then((r) => r.json())
        .then(setSalaryHistory)
        .catch(() => {});
    }
  }, [open, mode, employee, businessId]);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } =
    useForm<EmployeeFormData>({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      resolver: zodResolver(employeeSchema) as any,
      defaultValues: employee
        ? {
            name: employee.name,
            dni: employee.dni ?? undefined,
            cbu: employee.cbu ?? undefined,
            position: employee.position,
            startDate: employee.startDate,
            baseSalary: employee.baseSalary,
            payFrequency: employee.payFrequency as EmployeeFormData["payFrequency"],
            hourlyRate: employee.hourlyRate ?? undefined,
            dailyHours: employee.dailyHours,
            status: employee.status as EmployeeFormData["status"],
          }
        : {
            dailyHours: 8,
            status: "ACTIVE",
            payFrequency: "MONTHLY",
          },
    });

  const onSubmit = async (data: EmployeeFormData) => {
    try {
      if (mode === "create") {
        await createEmployee(businessId, data);
        toast.success("Empleado creado");
      } else if (employee) {
        await updateEmployee(businessId, employee.id, data);
        toast.success("Empleado actualizado");
      }
      setOpen(false);
      reset();
      router.refresh();
    } catch (error) {
      console.error("Error saving employee:", error);
      toast.error("Error al guardar el empleado");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {mode === "create" ? (
          <Button>+ Nuevo empleado</Button>
        ) : (
          <Button variant="outline" size="sm">Editar</Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Nuevo empleado" : "Editar empleado"}</DialogTitle>
        </DialogHeader>
        {mode === "edit" ? (
          <Tabs defaultValue="datos">
            <TabsList className="w-full">
              <TabsTrigger value="datos" className="flex-1">Datos</TabsTrigger>
              <TabsTrigger value="historial" className="flex-1">Historial salarial</TabsTrigger>
            </TabsList>
            <TabsContent value="datos">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1">
              <Label>Nombre completo *</Label>
              <Input {...register("name")} placeholder="Juan Pérez" />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>

            <div className="space-y-1">
              <Label>DNI</Label>
              <Input {...register("dni")} placeholder="30111222" />
            </div>

            <div className="space-y-1">
              <Label>CBU</Label>
              <Input {...register("cbu")} placeholder="0000000000000000000000" maxLength={22} />
            </div>

            <div className="space-y-1">
              <Label>Puesto *</Label>
              <Input {...register("position")} placeholder="Vendedor" />
              {errors.position && <p className="text-xs text-red-500">{errors.position.message}</p>}
            </div>

            <div className="space-y-1">
              <Label>Fecha de ingreso *</Label>
              <Input type="date" {...register("startDate")} />
              {errors.startDate && <p className="text-xs text-red-500">{errors.startDate.message}</p>}
            </div>

            <div className="space-y-1">
              <Label>Sueldo base (ARS) *</Label>
              <Input type="number" step="0.01" {...register("baseSalary")} placeholder="800000" />
              {errors.baseSalary && <p className="text-xs text-red-500">{errors.baseSalary.message}</p>}
            </div>

            <div className="space-y-1">
              <Label>Frecuencia de pago *</Label>
              <Select
                value={watch("payFrequency")}
                onValueChange={(v) => setValue("payFrequency", v as EmployeeFormData["payFrequency"])}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTHLY">Mensual</SelectItem>
                  <SelectItem value="BIWEEKLY">Quincenal</SelectItem>
                  <SelectItem value="WEEKLY">Semanal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Horas por día</Label>
              <Input type="number" {...register("dailyHours")} />
            </div>

            <div className="space-y-1">
              <Label>Valor hora fijo (opcional)</Label>
              <Input
                type="number"
                step="0.01"
                {...register("hourlyRate")}
                placeholder="Auto (basado en config)"
              />
              <p className="text-xs text-slate-500">Vacío = calculado automáticamente</p>
            </div>

            {mode === "edit" && (
              <div className="space-y-1">
                <Label>Estado</Label>
                <Select
                  value={watch("status")}
                  onValueChange={(v) => setValue("status", v as EmployeeFormData["status"])}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Activo</SelectItem>
                    <SelectItem value="INACTIVE">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
            </TabsContent>
            <TabsContent value="historial">
              <div className="space-y-2 pt-2">
                {salaryHistory.length === 0 ? (
                  <p className="text-sm text-slate-500 py-4 text-center">Sin cambios registrados</p>
                ) : (
                  salaryHistory.map((h) => (
                    <div key={h.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 text-sm">
                      <div>
                        <p className="font-medium">{formatCurrency(Number(h.salary))}</p>
                        {h.note && <p className="text-xs text-slate-500">{h.note}</p>}
                      </div>
                      <p className="text-xs text-slate-500">
                        {format(new Date(h.validFrom), "dd/MM/yyyy")}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1">
              <Label>Nombre completo *</Label>
              <Input {...register("name")} placeholder="Juan Pérez" />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>

            <div className="space-y-1">
              <Label>DNI</Label>
              <Input {...register("dni")} placeholder="30111222" />
            </div>

            <div className="space-y-1">
              <Label>CBU</Label>
              <Input {...register("cbu")} placeholder="0000000000000000000000" maxLength={22} />
            </div>

            <div className="space-y-1">
              <Label>Puesto *</Label>
              <Input {...register("position")} placeholder="Vendedor" />
              {errors.position && <p className="text-xs text-red-500">{errors.position.message}</p>}
            </div>

            <div className="space-y-1">
              <Label>Fecha de ingreso *</Label>
              <Input type="date" {...register("startDate")} />
              {errors.startDate && <p className="text-xs text-red-500">{errors.startDate.message}</p>}
            </div>

            <div className="space-y-1">
              <Label>Sueldo base (ARS) *</Label>
              <Input type="number" step="0.01" {...register("baseSalary")} placeholder="800000" />
              {errors.baseSalary && <p className="text-xs text-red-500">{errors.baseSalary.message}</p>}
            </div>

            <div className="space-y-1">
              <Label>Frecuencia de pago *</Label>
              <Select
                value={watch("payFrequency")}
                onValueChange={(v) => setValue("payFrequency", v as EmployeeFormData["payFrequency"])}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTHLY">Mensual</SelectItem>
                  <SelectItem value="BIWEEKLY">Quincenal</SelectItem>
                  <SelectItem value="WEEKLY">Semanal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Horas por día</Label>
              <Input type="number" {...register("dailyHours")} />
            </div>

            <div className="space-y-1">
              <Label>Valor hora fijo (opcional)</Label>
              <Input
                type="number"
                step="0.01"
                {...register("hourlyRate")}
                placeholder="Auto (basado en config)"
              />
              <p className="text-xs text-slate-500">Vacío = calculado automáticamente</p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
