"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { createEmployee, updateEmployee } from "@/app/actions/employees";
import { employeeSchema, type EmployeeFormData } from "@/lib/validations/employee";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface Employee {
  id: string;
  name: string;
  dni?: string | null;
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

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } =
    useForm<EmployeeFormData>({
      resolver: zodResolver(employeeSchema),
      defaultValues: employee
        ? {
            name: employee.name,
            dni: employee.dni ?? undefined,
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
    } catch {
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
      </DialogContent>
    </Dialog>
  );
}
