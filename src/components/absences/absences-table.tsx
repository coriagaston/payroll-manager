"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Absence {
  id: string;
  date: string;
  days: number;
  note: string | null;
  employee: { name: string };
}

interface Props {
  absences: Absence[];
  businessId: string;
  canEdit: boolean;
}

export function AbsencesTable({ absences, businessId, canEdit }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filtered = absences.filter((a) =>
    !search || a.employee.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalDays = absences.reduce((s, a) => s + a.days, 0);

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta ausencia?")) return;
    try {
      const res = await fetch(`/api/businesses/${businessId}/absences/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Ausencia eliminada");
      router.refresh();
    } catch {
      toast.error("Error al eliminar");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Input
          placeholder="Buscar por empleado..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <div className="ml-auto text-sm text-slate-600">
          Total: <span className="font-semibold">{totalDays} días</span>
        </div>
      </div>

      <div className="rounded-lg border bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empleado</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="text-right">Días</TableHead>
              <TableHead className="hidden md:table-cell">Nota</TableHead>
              {canEdit && <TableHead className="text-right">Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canEdit ? 5 : 4} className="text-center py-8 text-slate-500">
                  No hay ausencias registradas
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.employee.name}</TableCell>
                  <TableCell>{format(new Date(a.date + "T00:00:00"), "dd/MM/yyyy")}</TableCell>
                  <TableCell className="text-right font-semibold">{a.days}</TableCell>
                  <TableCell className="hidden md:table-cell text-slate-500 text-sm">{a.note ?? "—"}</TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => handleDelete(a.id)}
                      >
                        Eliminar
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
