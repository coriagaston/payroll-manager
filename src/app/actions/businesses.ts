"use server";

import { revalidatePath } from "next/cache";
import { getAuthSession, requireBusinessAccess } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { businessSchema, businessConfigSchema } from "@/lib/validations/business";
import type { BusinessFormData } from "@/lib/validations/business";
import slugify from "@/lib/slugify";

export async function createBusiness(formData: BusinessFormData) {
  const session = await getAuthSession();
  if (!session) throw new Error("No autenticado");

  const data = businessSchema.parse(formData);

  let slug = slugify(data.name);
  let i = 1;
  while (await prisma.business.findUnique({ where: { slug } })) {
    slug = `${slugify(data.name)}-${i++}`;
  }

  const business = await prisma.business.create({
    data: {
      name: data.name,
      slug,
      cuit: data.cuit || null,
      address: data.address || null,
      phone: data.phone || null,
      industry: data.industry || null,
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
          jubilacionRate: 0.11,
          obraSocialRate: 0.03,
          pamiRate: 0.03,
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

export async function updateBusiness(businessId: string, formData: BusinessFormData) {
  const session = await getAuthSession();
  if (!session) throw new Error("No autenticado");

  await requireBusinessAccess(businessId, session.user.id, "ADMIN");

  const data = businessSchema.parse(formData);

  const business = await prisma.business.update({
    where: { id: businessId },
    data: {
      name: data.name,
      cuit: data.cuit || null,
      address: data.address || null,
      phone: data.phone || null,
      industry: data.industry || null,
      currency: data.currency,
    },
  });

  revalidatePath("/");
  revalidatePath(`/${businessId}`);
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
