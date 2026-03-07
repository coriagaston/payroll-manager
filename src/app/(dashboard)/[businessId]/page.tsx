import { getAuthSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/payroll/calculator";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, startOfMonth, endOfMonth } from "date-fns";
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

  // Ejecutar todas las queries en paralelo
  const [membership, business, overtimeSummary, recentPeriods, recentEmployees, chartPeriods] = await Promise.all([
    prisma.businessMember.findUnique({
      where: { userId_businessId: { userId: session.user.id, businessId } },
    }),
    prisma.business.findUnique({
      where: { id: businessId },
      include: {
        config: true,
        _count: {
          select: {
            employees: { where: { status: "ACTIVE" } },
          },
        },
      },
    }),
    prisma.overtime.groupBy({
      by: ["type"],
      where: {
        businessId,
        date: { gte: monthStart, lte: monthEnd },
      },
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
  ]);

  if (!membership || !business) notFound();

  const chartData = chartPeriods.map((p) => ({
    label: format(p.startDate, "dd/MM"),
    total: p.items.reduce((s, i) => s + Number(i.totalAmount), 0),
  }));

  const totalOvertimeHours = overtimeSummary.reduce(
    (s, g) => s + Number(g._sum.hours ?? 0),
    0
  );

  const freqLabel: Record<string, string> = {
    WEEKLY: "Semanal",
    BIWEEKLY: "Quincenal",
    MONTHLY: "Mensual",
  };

  const statusLabel: Record<string, string> = {
    DRAFT: "Borrador",
    FINALIZED: "Finalizada",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">{business.name}</h1>
        <p className="text-muted-foreground">
          {format(now, "MMMM yyyy", { locale: es }).replace(/^\w/, (c) => c.toUpperCase())}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-3">
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
            <CardTitle className="text-sm font-medium text-muted-foreground">
              HS extras este mes
            </CardTitle>
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
                      <p className="font-medium text-sm">{emp.name}</p>
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
                  const total = period.items.reduce(
                    (s, i) => s + Number(i.totalAmount),
                    0
                  );
                  return (
                    <div key={period.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">
                          {format(period.startDate, "dd/MM")} - {format(period.endDate, "dd/MM/yyyy")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {freqLabel[period.frequency]} · {period._count.items} empleados
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm">
                          {formatCurrency(total, business.currency)}
                        </p>
                        <Badge
                          variant={period.status === "FINALIZED" ? "default" : "secondary"}
                          className="text-xs"
                        >
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
          <PayrollChart data={chartData} currency={business.currency} />
        </CardContent>
      </Card>
    </div>
  );
}
