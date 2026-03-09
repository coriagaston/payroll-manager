"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface Document {
  id: string;
  title: string;
  type: string;
  url?: string;
  date: string;
  notes?: string;
}

interface Props {
  employeeId: string;
  businessId: string;
  notes: string;
  documents: Document[];
  canEdit: boolean;
}

const docTypeLabel: Record<string, string> = {
  CONTRATO: "Contrato",
  DNI: "DNI",
  RECIBO_FIRMADO: "Recibo firmado",
  ALTA_AFIP: "Alta AFIP",
  BAJA_AFIP: "Baja AFIP",
  OTRO: "Otro",
};

const docTypes = ["CONTRATO", "DNI", "RECIBO_FIRMADO", "ALTA_AFIP", "BAJA_AFIP", "OTRO"];

export function EmployeeLegajo({ employeeId, businessId, notes: initialNotes, documents, canEdit }: Props) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes);
  const [savingNotes, setSavingNotes] = useState(false);
  const [addingDoc, setAddingDoc] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    type: "CONTRATO",
    url: "",
    date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const saveNotes = async () => {
    setSavingNotes(true);
    try {
      const res = await fetch(`/api/businesses/${businessId}/employees/${employeeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) throw new Error();
      toast.success("Notas guardadas");
      router.refresh();
    } catch {
      toast.error("Error al guardar notas");
    } finally {
      setSavingNotes(false);
    }
  };

  const addDocument = async () => {
    if (!form.title || !form.date) return toast.error("Completá título y fecha");
    setAddingDoc(true);
    try {
      const res = await fetch(`/api/businesses/${businessId}/employees/${employeeId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast.success("Documento agregado");
      setForm({ title: "", type: "CONTRATO", url: "", date: new Date().toISOString().split("T")[0], notes: "" });
      setShowForm(false);
      router.refresh();
    } catch {
      toast.error("Error al agregar documento");
    } finally {
      setAddingDoc(false);
    }
  };

  const deleteDocument = async (docId: string) => {
    if (!confirm("¿Eliminar este documento?")) return;
    try {
      const res = await fetch(`/api/businesses/${businessId}/employees/${employeeId}/documents/${docId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success("Documento eliminado");
      router.refresh();
    } catch {
      toast.error("Error al eliminar");
    }
  };

  return (
    <div className="space-y-4">
      {/* Notas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Legajo digital</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Notas internas</Label>
            <textarea
              className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Observaciones, acuerdos, historial de conversaciones..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={!canEdit}
            />
            {canEdit && (
              <Button size="sm" onClick={saveNotes} disabled={savingNotes}>
                {savingNotes ? "Guardando..." : "Guardar notas"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Documentos */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Documentos ({documents.length})</CardTitle>
          {canEdit && (
            <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}>
              {showForm ? "Cancelar" : "+ Agregar"}
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Formulario nuevo documento */}
          {showForm && canEdit && (
            <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Título *</Label>
                  <Input
                    placeholder="Ej: Contrato firmado 2024"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Tipo</Label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                  >
                    {docTypes.map((t) => (
                      <option key={t} value={t}>{docTypeLabel[t]}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Fecha</Label>
                  <Input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Link (opcional)</Label>
                  <Input
                    placeholder="https://drive.google.com/..."
                    value={form.url}
                    onChange={(e) => setForm({ ...form, url: e.target.value })}
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label>Notas</Label>
                  <Input
                    placeholder="Descripción adicional..."
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </div>
              </div>
              <Button size="sm" onClick={addDocument} disabled={addingDoc}>
                {addingDoc ? "Agregando..." : "Agregar documento"}
              </Button>
            </div>
          )}

          {/* Lista documentos */}
          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay documentos en el legajo.</p>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-start justify-between py-2 border-b last:border-0">
                  <div className="flex items-start gap-3">
                    <Badge variant="secondary" className="shrink-0 mt-0.5">{docTypeLabel[doc.type] ?? doc.type}</Badge>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{doc.title}</p>
                        {doc.url && (
                          <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                            Abrir →
                          </a>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(doc.date + "T00:00:00"), "dd/MM/yyyy")}
                        {doc.notes && ` · ${doc.notes}`}
                      </p>
                    </div>
                  </div>
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-600 dark:text-red-400 shrink-0"
                      onClick={() => deleteDocument(doc.id)}
                    >
                      Eliminar
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
