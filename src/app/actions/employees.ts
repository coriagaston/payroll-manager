"use server";

import { revalidatePath } from "next/cache";
import { getAuthSession, requireBusinessAccess } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { employeeSchema } from "@/lib/validations/employee";
import type { EmployeeFormData } from "@/lib/validations/employee";

export async function createEmployee(businessId: string, data: EmployeeFormData) {
  const session = await getAuthSession();
  if (!session) throw new Error("No autenticado");

  await requireBusinessAccess(businessId, session.user.id, "ADMIN");

  const validated = employeeSchema.parse(data);

  const employee = await prisma.employee.create({
    data: {
      ...validated,
      businessId,
      startDate: new Date(validated.startDate),
      hourlyRate: validated.hourlyRate ?? null,
    },
  });

  revalidatePath(`/${businessId}/employees`);
  return employee;
}

export async function updateEmployee(
  businessId: string,
  employeeId: string,
  data: EmployeeFormData
) {
  const session = await getAuthSession();
  if (!session) throw new Error("No autenticado");

  await requireBusinessAccess(businessId, session.user.id, "ADMIN");

  const validated = employeeSchema.parse(data);

  await prisma.employee.updateMany({
    where: { id: employeeId, businessId },
    data: {
      ...validated,
      startDate: new Date(validated.startDate),
      hourlyRate: validated.hourlyRate ?? null,
    },
  });

  revalidatePath(`/${businessId}/employees`);
}

export async function deactivateEmployee(businessId: string, employeeId: string) {
  const session = await getAuthSession();
  if (!session) throw new Error("No autenticado");

  await requireBusinessAccess(businessId, session.user.id, "ADMIN");

  await prisma.employee.updateMany({
    where: { id: employeeId, businessId },
    data: { status: "INACTIVE" },
  });

  revalidatePath(`/${businessId}/employees`);
}
