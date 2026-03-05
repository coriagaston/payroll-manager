import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, requireBusinessAccess } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { businessSchema } from "@/lib/validations/business";
import slugify from "@/lib/slugify";

export async function GET() {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const memberships = await prisma.businessMember.findMany({
    where: { userId: session.user.id },
    include: {
      business: {
        include: {
          _count: { select: { employees: { where: { status: "ACTIVE" } } } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(
    memberships.map((m) => ({
      id: m.business.id,
      name: m.business.name,
      slug: m.business.slug,
      currency: m.business.currency,
      role: m.role,
      activeEmployees: m.business._count.employees,
    }))
  );
}

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const data = businessSchema.parse(body);

  const slug = await generateUniqueSlug(data.name);

  const business = await prisma.business.create({
    data: {
      name: data.name,
      slug,
      currency: data.currency,
      config: {
        create: {
          extraRate50: 1.5,
          extraRate100: 2.0,
          extraRateHoliday: 2.0,
          hourlyFormulaType: "MONTHLY_200",
          monthlyHours: 200,
          dailyHours: 8,
          workingDaysPerMonth: 25,
        },
      },
      members: {
        create: { userId: session.user.id, role: "OWNER" },
      },
    },
  });

  return NextResponse.json(business, { status: 201 });
}

async function generateUniqueSlug(name: string): Promise<string> {
  const base = slugify(name);
  let slug = base;
  let i = 1;
  while (await prisma.business.findUnique({ where: { slug } })) {
    slug = `${base}-${i++}`;
  }
  return slug;
}
