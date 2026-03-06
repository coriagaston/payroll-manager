"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { overtimeSchema, type OvertimeFormData } from "@/lib/validations/overtime";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  businessId: string;
  employees: { id: string; name: string }[];
  defaultEmployeeId?: string;
}

export function OvertimeFormDialog({ businessId, employees, defaultEmployeeId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } =
    useForm<OvertimeFormData>({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      resolver: zodResolver(overtimeSchema) as any,
      defaultValues: {
        employeeId: defaultEmployeeId ?? "",
        type: "EXTRA_50",
      },
    });

  const onSubmit = async (data: OvertimeFormData) => {
    try {
      const res = await fetch(`/api/businesses/${businessId}/overtime`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      toast.success("Horas extras registradas");
      setOpen(false);
      reset();
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Error al registrar horas extras");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>+ Cargar horas extra</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cargar horas extra</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label>Empleado *</Label>
            <Select
              value={watch("employeeId")}
              onValueChange={(v) => setValue("employeeId", v)}
            >
              <SelectTrigger><SelectValue placeholder="Seleccioná un empleado" /></SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.employeeId && <p className="text-xs text-red-500">{errors.employeeId.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Fecha *</Label>
              <Input type="date" {...register("date")} />
              {errors.date && <p className="text-xs text-red-500">{errors.date.message}</p>}
            </div>

            <div className="space-y-1">
              <Label>Cantidad de horas *</Label>
              <Input type="number" step="0.5" min="0.5" max="24" {...register("hours")} placeholder="2" />
              {errors.hours && <p className="text-xs text-red-500">{errors.hours.message}</p>}
            </div>
          </div>

          <div className="space-y-1">
            <Label>Tipo *</Label>
            <Select
              value={watch("type")}
              onValueChange={(v) => setValue("type", v as OvertimeFormData["type"])}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="EXTRA_50">HS Extra 50% (normal)</SelectItem>
                <SelectItem value="EXTRA_100">HS Extra 100% (nocturna/insalubre)</SelectItem>
                <SelectItem value="HOLIDAY">Feriado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Nota (opcional)</Label>
            <Textarea {...register("note")} placeholder="Motivo o descripción" rows={2} />
          </div>

          <div className="flex justify-end gap-2">
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
