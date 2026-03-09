import { getAuthSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/payroll/calculator";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import { PayrollChart } from "@/components/dashboard/payroll-chart";

interface Props { params: Promise<{ businessId: string }> }

export default async function BusinessDashboard({ params }: Props) {
  const session = await getAuthSession();
  if (!session) redirect("/login");

  const { businessId } = await params;

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const prevMonthStart = startOfMonth(subMonths(now, 1));
  const prevMonthEnd = endOfMonth(subMonths(now, 1));

  const currentMonth = now.getMonth() + 1; // 1-12

  const [
    membership, business, overtimeSummary, recentPeriods, recentEmployees, chartPeriods,
    currentMonthPeriods, prevMonthPeriods, draftPeriods, allActiveEmployees,
  ] = await Promise.all([
    prisma.businessMember.findUnique({
      where: { userId_businessId: { userId: session.user.id, businessId } },
    }),
    prisma.business.findUnique({
      where: { id: businessId },
      include: {
        config: true,
        _count: { select: { employees: { where: { status: "ACTIVE" } } } },
      },
    }),
    prisma.overtime.groupBy({
      by: ["type"],
      where: { businessId, date: { gte: monthStart, lte: monthEnd } },
      _sum: { hours: true },
    }),
    prisma.payrollPeriod.findMany({
      where: { businessId },
      orderBy: { startDate: "desc" },
      take: 5,
      include: {
        _count: { select: { items: true } },
        items: { select: { totalAmount: true } },
      },
    }),
    prisma.employee.findMany({
      where: { businessId, status: "ACTIVE" },
      orderBy: { name: "asc" },
      take: 5,
      select: { id: true, name: true, position: true, payFrequency: true },
    }),
    prisma.payrollPeriod.findMany({
      where: { businessId, status: "FINALIZED" },
      orderBy: { startDate: "asc" },
      take: 12,
      include: { items: { select: { totalAmount: true } } },
    }),
    // Masa salarial mes actual (finalizadas)
    prisma.payrollPeriod.findMany({
      where: { businessId, status: "FINALIZED", startDate: { gte: monthStart, lte: monthEnd } },
      include: { items: { select: { totalAmount: true } } },
    }),
    // Masa salarial mes anterior (para comparativa)
    prisma.payrollPeriod.findMany({
      where: { businessId, status: "FINALIZED", startDate: { gte: prevMonthStart, lte: prevMonthEnd } },
      include: { items: { select: { totalAmount: true } } },
    }),
    // Liquidaciones en borrador
    prisma.payrollPeriod.findMany({
      where: { businessId, status: "DRAFT" },
      select: { id: true, startDate: true, endDate: true, frequency: true },
    }),
    // Todos los empleados activos con su último payroll item
    prisma.employee.findMany({
      where: { businessId, status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        payFrequency: true,
        payrollItems: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true },
        },
      },
    }),
  ]);

  if (!membership || !business) notFound();

  const currency = business.currency;

  const chartData = chartPeriods.map((p) => ({
    label: format(p.startDate, "dd/MM"),
    total: p.items.reduce((s, i) => s + Number(i.totalAmount), 0),
  }));

  const totalOvertimeHours = overtimeSummary.reduce(
    (s, g) => s + Number(g._sum.hours ?? 0), 0
  );

  // Masa salarial mes actual vs anterior
  const masaActual = currentMonthPeriods.reduce(
    (s, p) => s + p.items.reduce((si, i) => si + Number(i.totalAmount), 0), 0
  );
  const masaAnterior = prevMonthPeriods.reduce(
    (s, p) => s + p.items.reduce((si, i) => si + Number(i.totalAmount), 0), 0
  );
  const masaDiff = masaAnterior > 0
    ? ((masaActual - masaAnterior) / masaAnterior) * 100
    : null;

  // Alertas
  const alerts: { type: "warning" | "info"; message: string; href?: string }[] = [];

  // Empleados sin liquidación reciente
  const sinLiquidar = allActiveEmployees.filter((e) => {
    const lastItem = e.payrollItems[0];
    if (!lastItem) return true;
    const daysAgo = (now.getTime() - lastItem.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (e.payFrequency === "WEEKLY") return daysAgo > 14;
    if (e.payFrequency === "BIWEEKLY") return daysAgo > 20;
    return daysAgo > 45;
  });
  if (sinLiquidar.length > 0) {
    alerts.push({
      type: "warning",
      message: `${sinLiquidar.length} empleado${sinLiquidar.length > 1 ? "s" : ""} sin liquidación reciente: ${sinLiquidar.map(e => e.name).slice(0, 3).join(", ")}${sinLiquidar.length > 3 ? "..." : ""}`,
      href: `/${businessId}/payroll`,
    });
  }

  // Borradores pendientes
  if (draftPeriods.length > 0) {
    alerts.push({
      type: "info",
      message: `${draftPeriods.length} liquidación${draftPeriods.length > 1 ? "es" : ""} en borrador sin finalizar`,
      href: `/${businessId}/payroll`,
    });
  }

  // SAC (junio = 6 / diciembre = 12)
  if (currentMonth === 6 || currentMonth === 12) {
    alerts.push({
      type: "info",
      message: `Es ${currentMonth === 6 ? "junio" : "diciembre"} — recordá generar el SAC / Aguinaldo`,
      href: `/${businessId}/payroll`,
    });
  }

  const freqLabel: Record<string, string> = {
    WEEKLY: "Semanal", BIWEEKLY: "Quincenal", MONTHLY: "Mensual",
  };
  const statusLabel: Record<string, string> = {
    DRAFT: "Borrador", FINALIZED: "Finalizada",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">{business.name}</h1>
        <p className="text-muted-foreground">
          {format(now, "MMMM yyyy", { locale: es }).replace(/^\w/, (c) => c.toUpperCase())}
        </p>
      </div>

      {/* Alertas */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <div
              key={i}
              className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm ${
                alert.type === "warning"
                  ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
                  : "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300"
              }`}
            >
              <span>{alert.type === "warning" ? "⚠ " : "ℹ "}{alert.message}</span>
              {alert.href && (
                <Link href={alert.href} className="ml-4 underline whitespace-nowrap">Ver →</Link>
              )}
            </div>
          ))}
        </div>
      )}

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Empleados activos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{business._count.employees}</div>
            <Link href={`/${businessId}/employees`} className="text-sm text-blue-600 hover:underline">
              Ver todos →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">HS extras este mes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalOvertimeHours.toFixed(1)}h</div>
            <Link href={`/${businessId}/overtime`} className="text-sm text-blue-600 hover:underline">
              Ver detalles →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Liquidaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{recentPeriods.length}</div>
            <Link href={`/${businessId}/payroll`} className="text-sm text-blue-600 hover:underline">
              Ver liquidaciones →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Masa salarial del mes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(masaActual, currency)}</div>
            {masaDiff !== null ? (
              <p className={`text-sm ${masaDiff >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>
                {masaDiff >= 0 ? "+" : ""}{masaDiff.toFixed(1)}% vs mes anterior
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Sin comparativa aún</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Empleados recientes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Empleados</CardTitle>
            <Link href={`/${businessId}/employees`}>
              <Button variant="outline" size="sm">Ver todos</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentEmployees.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay empleados aún.</p>
            ) : (
              <div className="space-y-3">
                {recentEmployees.map((emp) => (
                  <div key={emp.id} className="flex items-center justify-between">
                    <div>
                      <Link href={`/${businessId}/employees/${emp.id}`} className="font-medium text-sm hover:underline">
                        {emp.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">{emp.position}</p>
                    </div>
                    <Badge variant="outline">{freqLabel[emp.payFrequency]}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Últimas liquidaciones */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Últimas liquidaciones</CardTitle>
            <Link href={`/${businessId}/payroll`}>
              <Button variant="outline" size="sm">Ver todas</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentPeriods.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay liquidaciones aún.</p>
            ) : (
              <div className="space-y-3">
                {recentPeriods.map((period) => {
                  const total = period.items.reduce((s, i) => s + Number(i.totalAmount), 0);
                  return (
                    <div key={period.id} className="flex items-center justify-between">
                      <div>
                        <Link href={`/${businessId}/payroll/${period.id}`} className="font-medium text-sm hover:underline">
                          {format(period.startDate, "dd/MM")} – {format(period.endDate, "dd/MM/yyyy")}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {freqLabel[period.frequency]} · {period._count.items} empleados
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm">{formatCurrency(total, currency)}</p>
                        <Badge variant={period.status === "FINALIZED" ? "default" : "secondary"} className="text-xs">
                          {statusLabel[period.status]}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de masa salarial */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Masa salarial por período (últimas 12 liquidaciones finalizadas)</CardTitle>
        </CardHeader>
        <CardContent>
          <PayrollChart data={chartData} currency={currency} />
        </CardContent>
      </Card>
    </div>
  );
}
