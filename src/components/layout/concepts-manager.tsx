"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { payrollConceptSchema, type PayrollConceptFormData } from "@/lib/validations/business";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";

interface Concept {
  id: string;
  name: string;
  type: "EARNING" | "DEDUCTION";
  active: boolean;
}

interface Props {
  businessId: string;
  concepts: Concept[];
  canEdit: boolean;
}

export function ConceptsManager({ businessId, concepts: initial, canEdit }: Props) {
  const router = useRouter();
  const [concepts, setConcepts] = useState<Concept[]>(initial);
  const [loading, setLoading] = useState<string | null>(null);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } =
    useForm<PayrollConceptFormData>({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      resolver: zodResolver(payrollConceptSchema) as any,
      defaultValues: { type: "EARNING" },
    });

  const onAdd = async (data: PayrollConceptFormData) => {
    const res = await fetch(`/api/businesses/${businessId}/concepts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      toast.error("Error al crear concepto");
      return;
    }
    const created: Concept = await res.json();
    setConcepts((prev) => [...prev, created]);
    reset({ type: "EARNING" });
    toast.success("Concepto creado");
    router.refresh();
  };

  const handleDelete = async (id: string) => {
    setLoading(id);
    try {
      const res = await fetch(`/api/businesses/${businessId}/concepts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setConcepts((prev) => prev.filter((c) => c.id !== id));
      toast.success("Concepto eliminado");
      router.refresh();
    } catch {
      toast.error("Error al eliminar concepto");
    } finally {
      setLoading(null);
    }
  };

  const earnings = concepts.filter((c) => c.type === "EARNING");
  const deductions = concepts.filter((c) => c.type === "DEDUCTION");

  const ConceptList = ({ items, label }: { items: Concept[]; label: string }) => (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{label}</p>
      {items.length === 0 && (
        <p className="text-sm text-muted-foreground py-2">Sin conceptos</p>
      )}
      {items.map((c) => (
        <div key={c.id} className="flex items-center justify-between px-3 py-2 rounded-md bg-muted/50">
          <div className="flex items-center gap-2">
            <Badge variant={c.type === "EARNING" ? "default" : "destructive"} className="text-xs">
              {c.type === "EARNING" ? "Haber" : "Deducción"}
            </Badge>
            <span className="text-sm">{c.name}</span>
          </div>
          {canEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              disabled={loading === c.id}
              onClick={() => handleDelete(c.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conceptos salariales</CardTitle>
          <CardDescription>
            Haberes y deducciones personalizados que podés agregar a las liquidaciones
            (comisiones, presentismo, descuentos varios, etc.)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ConceptList items={earnings} label="Haberes" />
          <ConceptList items={deductions} label="Deducciones" />
        </CardContent>
      </Card>

      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nuevo concepto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onAdd)} className="flex items-end gap-3 flex-wrap">
              <div className="space-y-1 flex-1 min-w-[160px]">
                <Label>Nombre</Label>
                <Input {...register("name")} placeholder="Ej: Comisión por ventas" />
                {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
              </div>
              <div className="space-y-1 w-44">
                <Label>Tipo</Label>
                <Select
                  value={watch("type")}
                  onValueChange={(v) => setValue("type", v as "EARNING" | "DEDUCTION")}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EARNING">Haber</SelectItem>
                    <SelectItem value="DEDUCTION">Deducción</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Agregando..." : "Agregar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
