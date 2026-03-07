import { getAuthSession, requireBusinessAccess } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PayrollList } from "@/components/payroll/payroll-list";
import { PayrollGenerateDialog } from "@/components/payroll/payroll-generate-dialog";
import { SacGenerateDialog } from "@/components/payroll/sac-generate-dialog";
import { VacationGenerateDialog } from "@/components/payroll/vacation-generate-dialog";
import { toLocalDateStr } from "@/lib/payroll/calculator";
import { format } from "date-fns";

interface Props { params: Promise<{ businessId: string }> }

export default async function PayrollPage({ params }: Props) {
  const session = await getAuthSession();
  if (!session) redirect("/login");

  const { businessId } = await params;

  let membership;
  try {
    membership = await requireBusinessAccess(businessId, session.user.id);
  } catch {
    notFound();
  }

  const canEdit = membership.role === "OWNER" || membership.role === "ADMIN";

  const [periods, business, activeEmployees] = await Promise.all([
    prisma.payrollPeriod.findMany({
      where: { businessId },
      include: {
        items: { select: { totalAmount: true } },
        _count: { select: { items: true } },
      },
      orderBy: { startDate: "desc" },
    }),
    prisma.business.findUnique({
      where: { id: businessId },
      select: { currency: true, config: true },
    }),
    prisma.employee.findMany({
      where: { businessId, status: "ACTIVE" },
      select: { id: true, name: true, baseSalary: true, startDate: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const currency = business?.currency ?? "ARS";

  const rows = periods.map((p) => ({
    id: p.id,
    startDate: format(p.startDate, "yyyy-MM-dd"),
    endDate: format(p.endDate, "yyyy-MM-dd"),
    frequency: p.frequency,
    type: p.type,
    status: p.status,
    employeeCount: p._count.items,
    totalAmount: p.items.reduce((s, i) => s + Number(i.totalAmount), 0),
  }));

  const employees = activeEmployees.map((e) => ({
    id: e.id,
    name: e.name,
    baseSalary: Number(e.baseSalary),
    startDate: toLocalDateStr(e.startDate),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Liquidaciones</h1>
          <p className="text-muted-foreground text-sm">{rows.length} períodos registrados</p>
        </div>
        {canEdit && (
          <div className="flex gap-2 flex-wrap">
            <VacationGenerateDialog
              businessId={businessId}
              currency={currency}
              employees={employees}
            />
            <SacGenerateDialog
              businessId={businessId}
              currency={currency}
              employees={employees}
            />
            <PayrollGenerateDialog businessId={businessId} currency={currency} />
          </div>
        )}
      </div>

      <PayrollList rows={rows} businessId={businessId} currency={currency} />
    </div>
  );
}
