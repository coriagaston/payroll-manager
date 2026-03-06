"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

interface Props { businessId: string }

export function OvertimeCsvImport({ businessId }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ created: number; errors: string[] } | null>(null);

  const handleFile = async (file: File) => {
    setLoading(true);
    setResult(null);
    try {
      const text = await file.text();
      const res = await fetch(`/api/businesses/${businessId}/overtime`, {
        method: "POST",
        headers: { "Content-Type": "text/csv" },
        body: text,
      });
      const data = await res.json();
      setResult(data);
      if (data.created > 0) {
        toast.success(`${data.created} registros importados`);
        router.refresh();
      }
      if (data.errors.length > 0) {
        toast.warning(`${data.errors.length} errores en la importación`);
      }
    } catch (error) {
      console.error(error);
      toast.error("Error al importar el CSV");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">↑ Importar CSV</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar horas extra desde CSV</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-slate-50 rounded-lg p-4 text-sm">
            <p className="font-medium mb-2">Formato requerido del CSV:</p>
            <pre className="text-xs font-mono bg-white border rounded p-2 overflow-x-auto">
{`empleado_id,fecha,horas,tipo,nota
seed-emp-01,2025-01-07,3,EXTRA_50,Cierre mes
seed-emp-02,2025-01-13,2,EXTRA_100,Turno noche
seed-emp-03,2025-01-01,4,HOLIDAY,Año Nuevo`}
            </pre>
            <p className="text-slate-500 mt-2">
              Tipos válidos: <code>EXTRA_50</code>, <code>EXTRA_100</code>, <code>HOLIDAY</code>
            </p>
          </div>

          <div
            className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file) handleFile(file);
            }}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
            <p className="text-slate-600">
              {loading ? "Procesando..." : "Arrastrá el archivo CSV acá o hacé click para seleccionarlo"}
            </p>
          </div>

          {result && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-green-700">
                ✓ {result.created} registros importados
              </p>
              {result.errors.map((err, i) => (
                <p key={i} className="text-sm text-red-600">✗ {err}</p>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
