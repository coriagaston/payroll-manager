import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, requireBusinessAccess } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendInvitationEmail } from "@/lib/email";
import { z } from "zod";
import { addDays } from "date-fns";

interface Params { params: Promise<{ businessId: string }> }

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "VIEWER"]),
});

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { businessId } = await params;
  try {
    await requireBusinessAccess(businessId, session.user.id);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [members, invitations] = await Promise.all([
    prisma.businessMember.findMany({
      where: { businessId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.businessInvitation.findMany({
      where: { businessId, acceptedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({ members, invitations });
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { businessId } = await params;

  let membership;
  try {
    membership = await requireBusinessAccess(businessId, session.user.id);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (membership.role !== "OWNER") {
    return NextResponse.json({ error: "Solo el propietario puede invitar miembros" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const { email, role } = parsed.data;

  // Check if already a member
  const existingUser = await prisma.user.findUnique({
    where: { email },
    include: { memberships: { where: { businessId } } },
  });
  if (existingUser?.memberships.length) {
    return NextResponse.json({ error: "Este usuario ya es miembro del negocio" }, { status: 409 });
  }

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { name: true },
  });

  // Upsert: refresh token if already invited
  const invitation = await prisma.businessInvitation.upsert({
    where: { businessId_email: { businessId, email } },
    create: { businessId, email, role, expiresAt: addDays(new Date(), 7) },
    update: { role, expiresAt: addDays(new Date(), 7), acceptedAt: null },
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? "";
  const inviteUrl = `${baseUrl}/invite/${invitation.token}`;

  sendInvitationEmail({ to: email, businessName: business?.name ?? "", role, inviteUrl }).catch(console.error);

  return NextResponse.json({ invitation, inviteUrl }, { status: 201 });
}
