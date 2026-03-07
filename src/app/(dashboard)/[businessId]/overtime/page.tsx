import { getAuthSession, requireBusinessAccess } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { OvertimeTable } from "@/components/overtime/overtime-table";
import { OvertimeFormDialog } from "@/components/overtime/overtime-form-dialog";
import { OvertimeCsvImport } from "@/components/overtime/overtime-csv-import";
import { format, startOfMonth, endOfMonth } from "date-fns";

interface Props {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{ from?: string; to?: string; employeeId?: string }>;
}

export default async function OvertimePage({ params, searchParams }: Props) {
  const session = await getAuthSession();
  if (!session) redirect("/login");

  const { businessId } = await params;
  const sp = await searchParams;

  let membership;
  try {
    membership = await requireBusinessAccess(businessId, session.user.id);
  } catch {
    notFound();
  }

  const canEdit = membership.role === "OWNER" || membership.role === "ADMIN";

  const now = new Date();
  const from = sp.from ?? format(startOfMonth(now), "yyyy-MM-dd");
  const to = sp.to ?? format(endOfMonth(now), "yyyy-MM-dd");

  const [overtimes, employees] = await Promise.all([
    prisma.overtime.findMany({
      where: {
        businessId,
        date: { gte: new Date(from), lte: new Date(to) },
        ...(sp.employeeId && { employeeId: sp.employeeId }),
      },
      include: { employee: { select: { name: true, position: true } } },
      orderBy: [{ date: "desc" }, { employee: { name: "asc" } }],
    }),
    prisma.employee.findMany({
      where: { businessId, status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const rows = overtimes.map((ot) => ({
    id: ot.id,
    employeeId: ot.employeeId,
    employeeName: ot.employee.name,
    date: format(ot.date, "yyyy-MM-dd"),
    hours: Number(ot.hours),
    type: ot.type,
    note: ot.note ?? "",
  }));

  const totalHours = rows.reduce((s, r) => s + r.hours, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Horas Extras</h1>
          <p className="text-muted-foreground text-sm">
            {rows.length} registros · {totalHours.toFixed(1)} hs totales
          </p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <OvertimeCsvImport businessId={businessId} />
            <OvertimeFormDialog businessId={businessId} employees={employees} />
          </div>
        )}
      </div>

      <OvertimeTable
        rows={rows}
        employees={employees}
        businessId={businessId}
        canEdit={canEdit}
        defaultFrom={from}
        defaultTo={to}
      />
    </div>
  );
}
