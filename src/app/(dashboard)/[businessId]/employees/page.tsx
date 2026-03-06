import { getAuthSession, requireBusinessAccess } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { EmployeesTable } from "@/components/employees/employees-table";
import { EmployeeFormDialog } from "@/components/employees/employee-form-dialog";
import { format } from "date-fns";

interface Props { params: Promise<{ businessId: string }> }

export default async function EmployeesPage({ params }: Props) {
  const session = await getAuthSession();
  if (!session) redirect("/login");

  const { businessId } = await params;

  let membership;
  try {
    membership = await requireBusinessAccess(businessId, session.user.id);
  } catch {
    notFound();
  }

  const employees = await prisma.employee.findMany({
    where: { businessId },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });

  const canEdit = membership.role === "OWNER" || membership.role === "ADMIN";

  const activeCount = employees.filter((e: (typeof employees)[number]) => e.status === "ACTIVE").length;
  const inactiveCount = employees.filter((e: (typeof employees)[number]) => e.status === "INACTIVE").length;

  const employeeRows = employees.map((e: (typeof employees)[number]) => ({
    ...e,
    baseSalary: Number(e.baseSalary),
    hourlyRate: e.hourlyRate ? Number(e.hourlyRate) : null,
    startDate: format(e.startDate, "yyyy-MM-dd"),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Empleados</h1>
          <p className="text-slate-500 text-sm">
            {activeCount} activos ·{" "}
            {inactiveCount} inactivos
          </p>
        </div>
        {canEdit && <EmployeeFormDialog businessId={businessId} mode="create" />}
      </div>

      <EmployeesTable
        employees={employeeRows}
        businessId={businessId}
        canEdit={canEdit}
      />
    </div>
  );
}
