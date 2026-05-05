"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface Member {
  id: string;
  role: string;
  createdAt: string;
  user: { id: string; name: string; email: string };
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  token: string;
}

interface Props {
  businessId: string;
  currentUserId: string;
  isOwner: boolean;
  baseUrl: string;
}

const roleLabel: Record<string, string> = {
  OWNER: "Propietario",
  ADMIN: "Administrador",
  VIEWER: "Lector",
};

export function MembersManager({ businessId, currentUserId, isOwner, baseUrl }: Props) {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("VIEWER");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);
  const [lastInviteEmail, setLastInviteEmail] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/businesses/${businessId}/members`);
      const data = await res.json();
      setMembers(data.members ?? []);
      setInvitations(data.invitations ?? []);
    } catch {
      toast.error("Error al cargar el equipo");
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => { load(); }, [load]);

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    try {
      const res = await fetch(`/api/businesses/${businessId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Invitación enviada a ${email}`);
      setLastInviteUrl(data.inviteUrl || `${baseUrl}/invite/${data.invitation.token}`);
      setLastInviteEmail(email);
      setEmail("");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al invitar");
    } finally {
      setInviting(false);
    }
  };

  const changeRole = async (memberId: string, newRole: string) => {
    const res = await fetch(`/api/businesses/${businessId}/members/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error);
    }
    toast.success("Rol actualizado");
    load();
  };

  const removeMember = async (memberId: string) => {
    const res = await fetch(`/api/businesses/${businessId}/members/${memberId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error);
    }
    toast.success("Miembro eliminado");
    load();
    router.refresh();
  };

  const revokeInvitation = async (invitationId: string) => {
    const res = await fetch(`/api/businesses/${businessId}/members/${invitationId}?type=invitation`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error);
    }
    toast.success("Invitación revocada");
    load();
  };

  const copyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground py-4">Cargando...</p>;
  }

  return (
    <div className="space-y-6">
      {/* Members list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Miembros ({members.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {members.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between gap-3 py-2.5 border-b last:border-0"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{m.user.name}</p>
                  <p className="text-xs text-muted-foreground">{m.user.email}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isOwner && m.role !== "OWNER" ? (
                    <Select
                      value={m.role}
                      onValueChange={(v) =>
                        changeRole(m.id, v).catch((err) => toast.error(err.message))
                      }
                    >
                      <SelectTrigger className="w-36 h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ADMIN">Administrador</SelectItem>
                        <SelectItem value="VIEWER">Lector</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge
                      variant={m.role === "OWNER" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {roleLabel[m.role]}
                    </Badge>
                  )}
                  {isOwner && m.role !== "OWNER" && m.user.id !== currentUserId && (
                    <ConfirmDialog
                      trigger={
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-600 dark:text-red-400 h-7 px-2 text-xs"
                        >
                          Quitar
                        </Button>
                      }
                      title="Quitar miembro"
                      description={`¿Quitarle el acceso a ${m.user.name}? Ya no podrá ver ni gestionar este negocio.`}
                      confirmLabel="Quitar"
                      onConfirm={() => removeMember(m.id)}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pending invitations */}
      {invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Invitaciones pendientes ({invitations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {invitations.map((inv) => {
                const inviteUrl = `${baseUrl}/invite/${inv.token}`;
                return (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between gap-3 py-2.5 border-b last:border-0"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{inv.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {roleLabel[inv.role]} · vence{" "}
                        {format(new Date(inv.expiresAt), "dd/MM/yyyy", { locale: es })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 gap-1.5 text-xs"
                        onClick={() => copyLink(inviteUrl, inv.id)}
                      >
                        {copiedId === inv.id ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                        {copiedId === inv.id ? "Copiado" : "Copiar link"}
                      </Button>
                      {isOwner && (
                        <ConfirmDialog
                          trigger={
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-600 dark:text-red-400 h-7 px-2 text-xs"
                            >
                              Revocar
                            </Button>
                          }
                          title="Revocar invitación"
                          description={`¿Revocar la invitación enviada a ${inv.email}?`}
                          confirmLabel="Revocar"
                          onConfirm={() => revokeInvitation(inv.id)}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Last invite link (shown after inviting) */}
      {lastInviteUrl && (
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30">
          <CardContent className="pt-4 space-y-2">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
              Invitación creada — compartí este enlace
            </p>
            <div className="flex gap-2">
              <Input
                value={lastInviteUrl}
                readOnly
                className="text-xs font-mono bg-white dark:bg-background"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyLink(lastInviteUrl, "last")}
                className="shrink-0"
              >
                {copiedId === "last" ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            {lastInviteEmail && (
              <p className="text-xs text-blue-600 dark:text-blue-400">
                Compartilo con {lastInviteEmail}. Expira en 7 días.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Invite form */}
      {isOwner && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invitar al equipo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={invite} className="flex gap-3 items-end flex-wrap">
              <div className="space-y-1 flex-1 min-w-52">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="contador@estudio.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Rol</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Administrador</SelectItem>
                    <SelectItem value="VIEWER">Lector</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={inviting}>
                {inviting ? "Invitando..." : "Invitar"}
              </Button>
            </form>
            <p className="text-xs text-muted-foreground">
              <strong>Administrador</strong>: puede gestionar empleados, ausencias, horas extras y liquidaciones.{" "}
              <strong>Lector</strong>: solo puede consultar.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
