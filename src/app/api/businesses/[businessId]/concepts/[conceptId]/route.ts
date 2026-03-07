import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, requireBusinessAccess } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface Params { params: Promise<{ businessId: string; conceptId: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { businessId, conceptId } = await params;

  try {
    await requireBusinessAccess(businessId, session.user.id, "ADMIN");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();

  const concept = await prisma.payrollConceptTemplate.updateMany({
    where: { id: conceptId, businessId },
    data: { active: body.active },
  });

  if (concept.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { businessId, conceptId } = await params;

  try {
    await requireBusinessAccess(businessId, session.user.id, "ADMIN");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.payrollConceptTemplate.deleteMany({
    where: { id: conceptId, businessId },
  });

  return NextResponse.json({ ok: true });
}
