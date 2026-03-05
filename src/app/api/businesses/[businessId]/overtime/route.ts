import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, requireBusinessAccess } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { overtimeSchema, overtimeCsvRowSchema } from "@/lib/validations/overtime";
import Papa from "papaparse";

interface Params { params: Promise<{ businessId: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { businessId } = await params;

  try {
    await requireBusinessAccess(businessId, session.user.id);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const overtimes = await prisma.overtime.findMany({
    where: {
      businessId,
      ...(employeeId && { employeeId }),
      ...(from && to && {
        date: { gte: new Date(from), lte: new Date(to) },
      }),
    },
    include: { employee: { select: { name: true } } },
    orderBy: [{ date: "desc" }, { employee: { name: "asc" } }],
  });

  return NextResponse.json(overtimes);
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { businessId } = await params;

  try {
    await requireBusinessAccess(businessId, session.user.id, "ADMIN");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const contentType = req.headers.get("content-type") ?? "";

  // ── Carga masiva CSV ──────────────────────────────────────────────────────
  if (contentType.includes("text/csv") || contentType.includes("multipart/form-data")) {
    const text = await req.text();
    const parsed = Papa.parse(text.trim(), { header: true, skipEmptyLines: true });

    const errors: string[] = [];
    const created: string[] = [];

    for (let i = 0; i < parsed.data.length; i++) {
      const row = parsed.data[i] as Record<string, string>;
      const result = overtimeCsvRowSchema.safeParse({
        empleado_id: row["empleado_id"] ?? row["employee_id"],
        fecha: row["fecha"] ?? row["date"],
        horas: row["horas"] ?? row["hours"],
        tipo: (row["tipo"] ?? row["type"])?.toUpperCase(),
        nota: row["nota"] ?? row["note"] ?? "",
      });

      if (!result.success) {
        errors.push(`Fila ${i + 2}: ${result.error.issues[0].message}`);
        continue;
      }

      // Verificar que el empleado pertenece al negocio
      const employee = await prisma.employee.findFirst({
        where: { id: result.data.empleado_id, businessId },
      });

      if (!employee) {
        errors.push(`Fila ${i + 2}: empleado_id no encontrado en este negocio`);
        continue;
      }

      const ot = await prisma.overtime.create({
        data: {
          employeeId: result.data.empleado_id,
          businessId,
          date: new Date(result.data.fecha),
          hours: result.data.horas,
          type: result.data.tipo,
          note: result.data.nota,
        },
      });
      created.push(ot.id);
    }

    return NextResponse.json({ created: created.length, errors }, { status: errors.length ? 207 : 201 });
  }

  // ── Carga individual JSON ─────────────────────────────────────────────────
  const body = await req.json();
  const data = overtimeSchema.parse(body);

  // Verificar que el empleado pertenece al negocio
  const employee = await prisma.employee.findFirst({
    where: { id: data.employeeId, businessId },
  });
  if (!employee) return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });

  const overtime = await prisma.overtime.create({
    data: {
      ...data,
      businessId,
      date: new Date(data.date),
    },
  });

  return NextResponse.json(overtime, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { businessId } = await params;

  try {
    await requireBusinessAccess(businessId, session.user.id, "ADMIN");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  await prisma.overtime.deleteMany({ where: { id, businessId } });

  return NextResponse.json({ success: true });
}
