"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { createBusiness } from "@/app/actions/businesses";
import { businessSchema, type BusinessFormData } from "@/lib/validations/business";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface CreateBusinessDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CreateBusinessDialog({ open: controlledOpen, onOpenChange }: CreateBusinessDialogProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen! : internalOpen;
  const setOpen = isControlled ? (onOpenChange ?? (() => {})) : setInternalOpen;

  const { register, handleSubmit, reset, formState: { errors } } = useForm<BusinessFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(businessSchema) as any,
    defaultValues: { currency: "ARS" },
  });

  const onSubmit = async (data: BusinessFormData) => {
    setLoading(true);
    try {
      const business = await createBusiness(data);
      toast.success(`Negocio "${business.name}" creado`);
      setOpen(false);
      reset();
      router.push(`/${business.id}`);
      router.refresh();
    } catch (error) {
      console.error("Error creating business:", error);
      toast.error("Error al crear el negocio");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          <Button>+ Nuevo negocio</Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Crear nuevo negocio</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1">
              <Label htmlFor="name">Nombre del negocio *</Label>
              <Input id="name" placeholder="Mi Empresa S.A." {...register("name")} />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="cuit">CUIT</Label>
              <Input id="cuit" placeholder="20-12345678-9" {...register("cuit")} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="industry">Rubro</Label>
              <Input id="industry" placeholder="Gastronomía, Comercio..." {...register("industry")} />
            </div>

            <div className="col-span-2 space-y-1">
              <Label htmlFor="address">Dirección</Label>
              <Input id="address" placeholder="Av. Corrientes 1234, CABA" {...register("address")} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="phone">Teléfono</Label>
              <Input id="phone" placeholder="+54 11 1234-5678" {...register("phone")} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="currency">Moneda</Label>
              <Input id="currency" placeholder="ARS" {...register("currency")} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creando..." : "Crear"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
