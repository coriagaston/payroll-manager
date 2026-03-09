import { getAuthSession, requireBusinessAccess } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatCurrency } from "@/lib/payroll/calculator";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmployeeLegajo } from "@/components/employees/employee-legajo";

interface Props {
  params: Promise<{ businessId: string; employeeId: string }>;
}

const freqLabel: Record<string, string> = {
  WEEKLY: "Semanal", BIWEEKLY: "Quincenal", MONTHLY: "Mensual",
};
const periodTypeLabel: Record<string, string> = {
  REGULAR: "Regular", SAC: "SAC / Aguinaldo", VACATION: "Vacaciones",
};

export default async function EmployeeDetailPage({ params }: Props) {
  const session = await getAuthSession();
  if (!session) redirect("/login");

  const { businessId, employeeId } = await params;

  let membership;
  try {
    membership = await requireBusinessAccess(businessId, session.user.id);
  } catch {
    notFound();
  }

  const canEdit = membership.role === "OWNER" || membership.role === "ADMIN";

  const [employee, payrollItems, salaryHistory, documents] = await Promise.all([
    prisma.employee.findUnique({
      where: { id: employeeId, businessId },
    }),
    prisma.payrollItem.findMany({
      where: { employeeId },
      include: {
        period: {
          select: { startDate: true, endDate: true, frequency: true, type: true, status: true, id: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.employeeSalaryHistory.findMany({
      where: { employeeId },
      orderBy: { validFrom: "desc" },
    }),
    prisma.employeeDocument.findMany({
      where: { employeeId },
      orderBy: { date: "desc" },
    }),
  ]);

  if (!employee) notFound();

  const totalPaid = payrollItems.reduce((s, i) => s + Number(i.totalAmount), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href={`/${businessId}/employees`} className="text-sm text-muted-foreground hover:underline">
              Empleados
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm">{employee.name}</span>
          </div>
          <h1 className="text-2xl font-bold">{employee.name}</h1>
          <p className="text-muted-foreground">{employee.position}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={employee.status === "ACTIVE" ? "default" : "secondary"}>
            {employee.status === "ACTIVE" ? "Activo" : "Inactivo"}
          </Badge>
          <Badge variant="outline">{freqLabel[employee.payFrequency]}</Badge>
          <Badge variant={employee.employmentType === "FORMAL" ? "default" : "secondary"}>
            {employee.employmentType === "FORMAL" ? "En blanco" : "Informal"}
          </Badge>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sueldo base</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{formatCurrency(Number(employee.baseSalary))}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ingreso</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">
              {format(employee.startDate, "dd/MM/yyyy")}
            </p>
            <p className="text-xs text-muted-foreground">
              {Math.floor((new Date().getTime() - employee.startDate.getTime()) / (1000 * 60 * 60 * 24 * 365))} años
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total liquidado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{formatCurrency(totalPaid)}</p>
            <p className="text-xs text-muted-foreground">{payrollItems.length} liquidaciones</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Identificación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {employee.cuil && <p className="text-sm">CUIL: <span className="font-mono">{employee.cuil}</span></p>}
            {employee.dni && <p className="text-sm">DNI: <span className="font-mono">{employee.dni}</span></p>}
            {employee.cbu && <p className="text-sm">CBU: <span className="font-mono text-xs">{employee.cbu}</span></p>}
            {!employee.cuil && !employee.dni && !employee.cbu && (
              <p className="text-sm text-muted-foreground">Sin datos</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Historial de liquidaciones */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historial de liquidaciones</CardTitle>
        </CardHeader>
        <CardContent>
          {payrollItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">Este empleado no tiene liquidaciones registradas.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left pb-2 font-medium">Período</th>
                    <th className="text-left pb-2 font-medium">Tipo</th>
                    <th className="text-right pb-2 font-medium">Bruto</th>
                    <th className="text-right pb-2 font-medium">Neto</th>
                    <th className="text-left pb-2 font-medium">Estado</th>
                    <th className="text-right pb-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {payrollItems.map((item) => {
                    const formula = item.formula as Record<string, number>;
                    const gross = formula?.grossAmount ?? Number(item.periodSalary);
                    return (
                      <tr key={item.id} className="py-2">
                        <td className="py-2">
                          {format(item.period.startDate, "dd/MM")} – {format(item.period.endDate, "dd/MM/yyyy")}
                        </td>
                        <td className="py-2">
                          <Badge variant="outline" className="text-xs">
                            {periodTypeLabel[item.period.type] ?? item.period.type}
                          </Badge>
                        </td>
                        <td className="py-2 text-right">{formatCurrency(gross)}</td>
                        <td className="py-2 text-right font-semibold">{formatCurrency(Number(item.totalAmount))}</td>
                        <td className="py-2">
                          <Badge variant={item.period.status === "FINALIZED" ? "default" : "secondary"} className="text-xs">
                            {item.period.status === "FINALIZED" ? "Finalizada" : "Borrador"}
                          </Badge>
                        </td>
                        <td className="py-2 text-right">
                          <Link href={`/${businessId}/payroll/${item.period.id}`}>
                            <Button variant="ghost" size="sm">Ver</Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Historial salarial */}
      {salaryHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Historial salarial</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {salaryHistory.map((h) => (
                <div key={h.id} className="flex items-center justify-between py-1 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{formatCurrency(Number(h.salary))}</p>
                    {h.note && <p className="text-xs text-muted-foreground">{h.note}</p>}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {format(h.validFrom, "dd/MM/yyyy", { locale: es })}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legajo digital */}
      <EmployeeLegajo
        employeeId={employeeId}
        businessId={businessId}
        notes={employee.notes ?? ""}
        documents={documents.map((d) => ({
          id: d.id,
          title: d.title,
          type: d.type,
          url: d.url ?? undefined,
          date: format(d.date, "yyyy-MM-dd"),
          notes: d.notes ?? undefined,
        }))}
        canEdit={canEdit}
      />
    </div>
  );
}
