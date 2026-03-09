import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, requireBusinessAccess } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface Params { params: Promise<{ businessId: string; employeeId: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { businessId, employeeId } = await params;

  try {
    await requireBusinessAccess(businessId, session.user.id);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const docs = await prisma.employeeDocument.findMany({
    where: { employeeId, employee: { businessId } },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(docs);
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { businessId, employeeId } = await params;

  try {
    await requireBusinessAccess(businessId, session.user.id, "ADMIN");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { title, type, url, date, notes } = body;

  if (!title || !type || !date) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }

  const doc = await prisma.employeeDocument.create({
    data: {
      employeeId,
      title,
      type,
      url: url || null,
      date: new Date(date),
      notes: notes || null,
    },
  });

  return NextResponse.json(doc, { status: 201 });
}
