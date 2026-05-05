import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface Params { params: Promise<{ token: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { token } = await params;

  const invitation = await prisma.businessInvitation.findUnique({
    where: { token },
    include: { business: { select: { id: true, name: true } } },
  });

  if (!invitation) {
    return NextResponse.json({ error: "Invitación no encontrada" }, { status: 404 });
  }

  return NextResponse.json({
    businessName: invitation.business.name,
    businessId: invitation.business.id,
    role: invitation.role,
    email: invitation.email,
    expired: invitation.expiresAt < new Date(),
    accepted: !!invitation.acceptedAt,
  });
}

export async function POST(_req: NextRequest, { params }: Params) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Debes iniciar sesión primero" }, { status: 401 });

  const { token } = await params;

  const invitation = await prisma.businessInvitation.findUnique({
    where: { token },
    include: { business: { select: { id: true, name: true } } },
  });

  if (!invitation) return NextResponse.json({ error: "Invitación no encontrada" }, { status: 404 });
  if (invitation.acceptedAt) return NextResponse.json({ error: "Esta invitación ya fue aceptada" }, { status: 409 });
  if (invitation.expiresAt < new Date()) return NextResponse.json({ error: "La invitación expiró" }, { status: 410 });
  if (invitation.email !== session.user.email) {
    return NextResponse.json(
      { error: `Esta invitación es para ${invitation.email}` },
      { status: 403 }
    );
  }

  // Already a member? Just mark accepted
  const existing = await prisma.businessMember.findFirst({
    where: { userId: session.user.id, businessId: invitation.businessId },
  });

  if (existing) {
    await prisma.businessInvitation.update({ where: { id: invitation.id }, data: { acceptedAt: new Date() } });
    return NextResponse.json({ businessId: invitation.businessId });
  }

  await prisma.$transaction([
    prisma.businessMember.create({
      data: { userId: session.user.id, businessId: invitation.businessId, role: invitation.role },
    }),
    prisma.businessInvitation.update({ where: { id: invitation.id }, data: { acceptedAt: new Date() } }),
  ]);

  return NextResponse.json({ businessId: invitation.businessId });
}
