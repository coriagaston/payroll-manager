import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, requireBusinessAccess } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface Params { params: Promise<{ businessId: string; absenceId: string }> }

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { businessId, absenceId } = await params;
  try {
    await requireBusinessAccess(businessId, session.user.id, "ADMIN");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.absence.deleteMany({ where: { id: absenceId, businessId } });
  return NextResponse.json({ ok: true });
}
