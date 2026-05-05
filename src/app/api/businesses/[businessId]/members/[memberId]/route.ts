import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, requireBusinessAccess } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

interface Params { params: Promise<{ businessId: string; memberId: string }> }

const roleSchema = z.object({ role: z.enum(["ADMIN", "VIEWER"]) });

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { businessId, memberId } = await params;

  let membership;
  try {
    membership = await requireBusinessAccess(businessId, session.user.id);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (membership.role !== "OWNER") {
    return NextResponse.json({ error: "Solo el propietario puede cambiar roles" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = roleSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Rol inválido" }, { status: 400 });

  const target = await prisma.businessMember.findFirst({ where: { id: memberId, businessId } });
  if (!target) return NextResponse.json({ error: "Miembro no encontrado" }, { status: 404 });
  if (target.role === "OWNER") return NextResponse.json({ error: "No se puede cambiar el rol del propietario" }, { status: 400 });

  const updated = await prisma.businessMember.update({
    where: { id: memberId },
    data: { role: parsed.data.role },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { businessId, memberId } = await params;

  let membership;
  try {
    membership = await requireBusinessAccess(businessId, session.user.id);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (membership.role !== "OWNER") {
    return NextResponse.json({ error: "Solo el propietario puede eliminar miembros" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);

  if (searchParams.get("type") === "invitation") {
    await prisma.businessInvitation.deleteMany({ where: { id: memberId, businessId } });
  } else {
    const target = await prisma.businessMember.findFirst({ where: { id: memberId, businessId } });
    if (!target) return NextResponse.json({ error: "Miembro no encontrado" }, { status: 404 });
    if (target.role === "OWNER") return NextResponse.json({ error: "No se puede eliminar al propietario" }, { status: 400 });
    await prisma.businessMember.delete({ where: { id: memberId } });
  }

  return NextResponse.json({ ok: true });
}
