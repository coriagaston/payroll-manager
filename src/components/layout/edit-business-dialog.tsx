"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { updateBusiness } from "@/app/actions/businesses";
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

interface BusinessData {
  id: string;
  name: string;
  cuit?: string | null;
  address?: string | null;
  phone?: string | null;
  industry?: string | null;
  currency: string;
}

interface Props {
  business: BusinessData;
  trigger?: React.ReactNode;
}

export function EditBusinessDialog({ business, trigger }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<BusinessFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(businessSchema) as any,
    defaultValues: {
      name: business.name,
      cuit: business.cuit ?? undefined,
      address: business.address ?? undefined,
      phone: business.phone ?? undefined,
      industry: business.industry ?? undefined,
      currency: business.currency,
    },
  });

  const onSubmit = async (data: BusinessFormData) => {
    setLoading(true);
    try {
      await updateBusiness(business.id, data);
      toast.success("Negocio actualizado");
      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Error updating business:", error);
      toast.error("Error al actualizar el negocio");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button variant="outline" size="sm">Editar</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar negocio</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1">
              <Label htmlFor="edit-name">Nombre del negocio *</Label>
              <Input id="edit-name" placeholder="Mi Empresa S.A." {...register("name")} />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="edit-cuit">CUIT</Label>
              <Input id="edit-cuit" placeholder="20-12345678-9" {...register("cuit")} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="edit-industry">Rubro</Label>
              <Input id="edit-industry" placeholder="Gastronomía, Comercio..." {...register("industry")} />
            </div>

            <div className="col-span-2 space-y-1">
              <Label htmlFor="edit-address">Dirección</Label>
              <Input id="edit-address" placeholder="Av. Corrientes 1234, CABA" {...register("address")} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="edit-phone">Teléfono</Label>
              <Input id="edit-phone" placeholder="+54 11 1234-5678" {...register("phone")} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="edit-currency">Moneda</Label>
              <Input id="edit-currency" placeholder="ARS" {...register("currency")} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
