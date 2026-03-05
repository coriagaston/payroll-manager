import { getAuthSession, requireBusinessAccess } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PayrollList } from "@/components/payroll/payroll-list";
import { PayrollGenerateDialog } from "@/components/payroll/payroll-generate-dialog";
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

  const [periods, business] = await Promise.all([
    prisma.payrollPeriod.findMany({
      where: { businessId },
      include: {
        items: {
          select: { totalAmount: true },
        },
        _count: { select: { items: true } },
      },
      orderBy: { startDate: "desc" },
    }),
    prisma.business.findUnique({
      where: { id: businessId },
      select: { currency: true, config: true },
    }),
  ]);

  const rows = periods.map((p) => ({
    id: p.id,
    startDate: format(p.startDate, "yyyy-MM-dd"),
    endDate: format(p.endDate, "yyyy-MM-dd"),
    frequency: p.frequency,
    status: p.status,
    employeeCount: p._count.items,
    totalAmount: p.items.reduce((s, i) => s + Number(i.totalAmount), 0),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Liquidaciones</h1>
          <p className="text-slate-500 text-sm">{rows.length} períodos registrados</p>
        </div>
        {canEdit && (
          <PayrollGenerateDialog
            businessId={businessId}
            currency={business?.currency ?? "ARS"}
          />
        )}
      </div>

      <PayrollList
        rows={rows}
        businessId={businessId}
        currency={business?.currency ?? "ARS"}
      />
    </div>
  );
}
