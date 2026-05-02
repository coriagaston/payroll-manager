import { getAuthSession, requireBusinessAccess } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { startOfMonth, subMonths, format } from "date-fns";
import { es } from "date-fns/locale";
import { AnalyticsCharts, type MonthData } from "@/components/analytics/analytics-charts";

interface Props { params: Promise<{ businessId: string }> }

export default async function AnalyticsPage({ params }: Props) {
  const session = await getAuthSession();
  if (!session) redirect("/login");

  const { businessId } = await params;

  try {
    await requireBusinessAccess(businessId, session.user.id);
  } catch {
    notFound();
  }

  const now = new Date();
  const twelveMonthsAgo = subMonths(startOfMonth(now), 11);

  const [business, periods, overtimes, absences] = await Promise.all([
    prisma.business.findUnique({
      where: { id: businessId },
      select: { currency: true },
    }),
    prisma.payrollPeriod.findMany({
      where: { businessId, status: "FINALIZED", startDate: { gte: twelveMonthsAgo } },
      orderBy: { startDate: "asc" },
      include: {
        items: {
          select: {
            totalAmount: true,
            periodSalary: true,
            extra50Amount: true,
            extra100Amount: true,
            holidayAmount: true,
          },
        },
        _count: { select: { items: true } },
      },
    }),
    prisma.overtime.findMany({
      where: { businessId, date: { gte: twelveMonthsAgo } },
      select: { date: true, hours: true, type: true },
    }),
    prisma.absence.findMany({
      where: { businessId, date: { gte: twelveMonthsAgo } },
      select: { date: true, days: true },
    }),
  ]);

  if (!business) notFound();

  // Build 12-month grid (oldest → newest)
  const monthlyData: MonthData[] = [];
  for (let i = 11; i >= 0; i--) {
    const monthDate = subMonths(now, i);
    const year = monthDate.getFullYear();
    const monthNum = monthDate.getMonth();
    const label = format(monthDate, "MMM yy", { locale: es });

    const monthPeriods = periods.filter((p) => {
      const d = new Date(p.startDate);
      return d.getFullYear() === year && d.getMonth() === monthNum;
    });

    const totalAmount = monthPeriods.reduce(
      (sum, p) => sum + p.items.reduce((s, i) => s + Number(i.totalAmount), 0), 0
    );
    const periodSalary = monthPeriods.reduce(
      (sum, p) => sum + p.items.reduce((s, i) => s + Number(i.periodSalary), 0), 0
    );
    const extrasAmount = monthPeriods.reduce(
      (sum, p) =>
        sum + p.items.reduce(
          (s, i) => s + Number(i.extra50Amount) + Number(i.extra100Amount) + Number(i.holidayAmount), 0
        ), 0
    );
    const employeeCount = monthPeriods.length > 0
      ? Math.max(...monthPeriods.map((p) => p._count.items))
      : 0;

    const monthOvertimes = overtimes.filter((o) => {
      const d = new Date(o.date);
      return d.getFullYear() === year && d.getMonth() === monthNum;
    });
    const overtimeHours50 = monthOvertimes
      .filter((o) => o.type === "EXTRA_50")
      .reduce((s, o) => s + Number(o.hours), 0);
    const overtimeHours100 = monthOvertimes
      .filter((o) => o.type === "EXTRA_100")
      .reduce((s, o) => s + Number(o.hours), 0);
    const overtimeHoursHoliday = monthOvertimes
      .filter((o) => o.type === "HOLIDAY")
      .reduce((s, o) => s + Number(o.hours), 0);

    const monthAbsences = absences.filter((a) => {
      const d = new Date(a.date);
      return d.getFullYear() === year && d.getMonth() === monthNum;
    });
    const absenceDays = monthAbsences.reduce((s, a) => s + Number(a.days), 0);

    monthlyData.push({
      label,
      totalAmount,
      periodSalary,
      extrasAmount,
      employeeCount,
      overtimeHours50,
      overtimeHours100,
      overtimeHoursHoliday,
      absenceDays,
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Análisis</h1>
        <p className="text-muted-foreground text-sm">Comparativa de los últimos 12 meses</p>
      </div>
      <AnalyticsCharts data={monthlyData} currency={business.currency} />
    </div>
  );
}
