import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { registerSchema } from "@/lib/validations/auth";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { inviteToken } = body;

  if (!inviteToken) {
    return NextResponse.json({ error: "Registro deshabilitado" }, { status: 403 });
  }

  const invitation = await prisma.businessInvitation.findUnique({
    where: { token: inviteToken },
  });

  if (!invitation || invitation.acceptedAt || invitation.expiresAt < new Date()) {
    return NextResponse.json({ error: "Invitación inválida o expirada" }, { status: 400 });
  }

  const parsed = registerSchema.omit({ confirmPassword: true }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const { name, email, password } = parsed.data;

  if (email !== invitation.email) {
    return NextResponse.json(
      { error: `Esta invitación es para ${invitation.email}` },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Ya existe una cuenta con ese email" }, { status: 409 });
  }

  const hashed = await bcrypt.hash(password, 12);

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { name, email, password: hashed } });
    await tx.businessMember.create({
      data: { userId: user.id, businessId: invitation.businessId, role: invitation.role },
    });
    await tx.businessInvitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    });
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
