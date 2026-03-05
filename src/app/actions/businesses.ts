"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthSession, requireBusinessAccess } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { businessSchema, businessConfigSchema } from "@/lib/validations/business";
import slugify from "@/lib/slugify";

export async function createBusiness(name: string, currency = "ARS") {
  const session = await getAuthSession();
  if (!session) throw new Error("No autenticado");

  const data = businessSchema.parse({ name, currency });

  let slug = slugify(data.name);
  let i = 1;
  while (await prisma.business.findUnique({ where: { slug } })) {
    slug = `${slugify(data.name)}-${i++}`;
  }

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

  revalidatePath("/");
  return business;
}

export async function updateBusinessConfig(
  businessId: string,
  data: Record<string, unknown>
) {
  const session = await getAuthSession();
  if (!session) throw new Error("No autenticado");

  await requireBusinessAccess(businessId, session.user.id, "ADMIN");

  const validated = businessConfigSchema.parse(data);

  await prisma.businessConfig.upsert({
    where: { businessId },
    update: validated,
    create: { businessId, ...validated },
  });

  revalidatePath(`/${businessId}/settings`);
}
