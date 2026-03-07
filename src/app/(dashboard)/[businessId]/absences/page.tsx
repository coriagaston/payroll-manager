import { getAuthSession, requireBusinessAccess } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { format } from "date-fns";
import { AbsencesTable } from "@/components/absences/absences-table";
import { AbsenceFormDialog } from "@/components/absences/absence-form-dialog";

interface Props { params: Promise<{ businessId: string }> }

export default async function AbsencesPage({ params }: Props) {
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

  const [absences, employees] = await Promise.all([
    prisma.absence.findMany({
      where: { businessId },
      include: { employee: { select: { name: true } } },
      orderBy: { date: "desc" },
    }),
    prisma.employee.findMany({
      where: { businessId, status: "ACTIVE" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const rows = absences.map((a) => ({
    id: a.id,
    date: format(a.date, "yyyy-MM-dd"),
    days: Number(a.days),
    note: a.note,
    employee: { name: a.employee.name },
  }));

  const totalDays = rows.reduce((s, a) => s + a.days, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inasistencias</h1>
          <p className="text-slate-500 text-sm">
            {absences.length} registros · {totalDays} días en total
          </p>
        </div>
        {canEdit && <AbsenceFormDialog businessId={businessId} employees={employees} />}
      </div>

      <AbsencesTable absences={rows} businessId={businessId} canEdit={canEdit} />
    </div>
  );
}
