import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, requireBusinessAccess } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { businessConfigSchema, holidaySchema } from "@/lib/validations/business";

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

  const [config, holidays] = await Promise.all([
    prisma.businessConfig.findUnique({ where: { businessId } }),
    prisma.holiday.findMany({
      where: { businessId },
      orderBy: { date: "asc" },
    }),
  ]);

  return NextResponse.json({ config, holidays });
}

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { businessId } = await params;

  try {
    await requireBusinessAccess(businessId, session.user.id, "ADMIN");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const data = businessConfigSchema.parse(body);

  const config = await prisma.businessConfig.upsert({
    where: { businessId },
    update: data,
    create: { businessId, ...data },
  });

  return NextResponse.json(config);
}

// POST /config/holidays
export async function POST(req: NextRequest, { params }: Params) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { businessId } = await params;

  try {
    await requireBusinessAccess(businessId, session.user.id, "ADMIN");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const data = holidaySchema.parse(body);

  const holiday = await prisma.holiday.upsert({
    where: { businessId_date: { businessId, date: new Date(data.date) } },
    update: { name: data.name },
    create: { businessId, date: new Date(data.date), name: data.name },
  });

  return NextResponse.json(holiday, { status: 201 });
}
