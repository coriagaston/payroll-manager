"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { advanceSchema, type AdvanceFormData } from "@/lib/validations/business";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toLocalDateStr } from "@/lib/payroll/calculator";

interface Employee { id: string; name: string; }

interface Props {
  businessId: string;
  employees: Employee[];
}

export function AdvanceFormDialog({ businessId, employees }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } =
    useForm<AdvanceFormData>({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      resolver: zodResolver(advanceSchema) as any,
      defaultValues: {
        date: toLocalDateStr(new Date()),
        isDiscount: false,
      },
    });

  const onSubmit = async (data: AdvanceFormData) => {
    try {
      const res = await fetch(`/api/businesses/${businessId}/advances`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Error");
      }
      toast.success(data.isDiscount ? "Descuento registrado" : "Anticipo registrado");
      setOpen(false);
      reset();
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al guardar");
    }
  };

  const isDiscount = watch("isDiscount");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>+ Nuevo anticipo / descuento</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar anticipo o descuento</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label>Empleado *</Label>
            <Select
              value={watch("employeeId")}
              onValueChange={(v) => setValue("employeeId", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar empleado" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.employeeId && <p className="text-xs text-red-500">{errors.employeeId.message}</p>}
          </div>

          <div className="space-y-1">
            <Label>Tipo *</Label>
            <Select
              value={isDiscount ? "true" : "false"}
              onValueChange={(v) => setValue("isDiscount", v === "true")}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="false">Anticipo (adelanto de sueldo)</SelectItem>
                <SelectItem value="true">Descuento</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Fecha *</Label>
              <Input type="date" {...register("date")} />
              {errors.date && <p className="text-xs text-red-500">{errors.date.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Monto (ARS) *</Label>
              <Input type="number" step="0.01" {...register("amount")} placeholder="50000" />
              {errors.amount && <p className="text-xs text-red-500">{errors.amount.message}</p>}
            </div>
          </div>

          <div className="space-y-1">
            <Label>Nota (opcional)</Label>
            <Input {...register("note")} placeholder="Anticipo enero" />
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
