import { getAuthSession, requireBusinessAccess } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PayrollPreview } from "@/components/payroll/payroll-preview";
import type { PayrollResult, PayrollFormula } from "@/lib/payroll/types";
import Link from "next/link";

interface Props { params: Promise<{ businessId: string; periodId: string }> }

const freqLabel: Record<string, string> = {
  WEEKLY: "Semanal",
  BIWEEKLY: "Quincenal",
  MONTHLY: "Mensual",
};

export default async function PayrollDetailPage({ params }: Props) {
  const session = await getAuthSession();
  if (!session) redirect("/login");

  const { businessId, periodId } = await params;

  try {
    await requireBusinessAccess(businessId, session.user.id);
  } catch {
    notFound();
  }

  const [period, business] = await Promise.all([
    prisma.payrollPeriod.findFirst({
      where: { id: periodId, businessId },
      include: {
        items: {
          include: {
            employee: { select: { name: true, position: true, payFrequency: true, cbu: true, cuil: true } },
          },
          orderBy: { employee: { name: "asc" } },
        },
      },
    }),
    prisma.business.findUnique({
      where: { id: businessId },
      select: { currency: true, name: true, cuit: true },
    }),
  ]);

  if (!period) notFound();

  const startDate = format(period.startDate, "yyyy-MM-dd");
  const endDate = format(period.endDate, "yyyy-MM-dd");
  const currency = business?.currency ?? "ARS";
  const businessName = business?.name ?? "";
  const businessCuit = business?.cuit ?? undefined;

  const results: PayrollResult[] = period.items.map((item) => {
    const formula = item.formula as unknown as PayrollFormula;
    const defaultRetentions = { base: 0, jubilacion: 0, obraSocial: 0, pami: 0, total: 0 };
    return {
      employeeId: item.employeeId,
      employeeName: item.employee.name,
      cuil: item.employee.cuil ?? null,
      baseSalary: Number(item.baseSalary),
      periodSalary: Number(item.periodSalary),
      hourlyRate: Number(item.hourlyRate),
      extra50Hours: Number(item.extra50Hours),
      extra50Amount: Number(item.extra50Amount),
      extra100Hours: Number(item.extra100Hours),
      extra100Amount: Number(item.extra100Amount),
      holidayHours: Number(item.holidayHours),
      holidayAmount: Number(item.holidayAmount),
      grossAmount: formula.grossAmount ?? (Number(item.periodSalary) + Number(item.extra50Amount) + Number(item.extra100Amount) + Number(item.holidayAmount)),
      retentions: formula.retentions ?? defaultRetentions,
      advances: Number(item.advances),
      discounts: Number(item.discounts),
      absences: formula.absences ?? 0,
      absenceDeduction: formula.absenceDeduction ?? 0,
      extraConcepts: formula.extraConcepts ?? [],
      totalAmount: Number(item.totalAmount),
      formula,
      cbu: item.employee.cbu ?? null,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href={`/${businessId}/payroll`} className="text-sm text-muted-foreground hover:text-foreground">
              ← Liquidaciones
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {format(period.startDate, "dd/MM/yyyy")} — {format(period.endDate, "dd/MM/yyyy")}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline">{freqLabel[period.frequency]}</Badge>
            <Badge variant={period.status === "FINALIZED" ? "default" : "secondary"}>
              {period.status === "FINALIZED" ? "Finalizada" : "Borrador"}
            </Badge>
            <span className="text-sm text-muted-foreground">{period.items.length} empleados</span>
          </div>
        </div>
        <Link href={`/api/businesses/${businessId}/payroll/${periodId}/export`} target="_blank">
          <Button variant="outline">Exportar CSV</Button>
        </Link>
      </div>

      <PayrollPreview
        results={results}
        currency={currency}
        startDate={startDate}
        endDate={endDate}
        businessName={businessName}
        businessCuit={businessCuit}
      />
    </div>
  );
}
