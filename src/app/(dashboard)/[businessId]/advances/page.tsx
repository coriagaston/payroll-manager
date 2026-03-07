import { getAuthSession, requireBusinessAccess } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { AdvancesTable } from "@/components/advances/advances-table";
import { format } from "date-fns";

interface Props { params: Promise<{ businessId: string }> }

export default async function AdvancesPage({ params }: Props) {
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

  const [advances, employees, business] = await Promise.all([
    prisma.advance.findMany({
      where: { businessId },
      include: { employee: { select: { name: true } } },
      orderBy: { date: "desc" },
    }),
    prisma.employee.findMany({
      where: { businessId, status: "ACTIVE" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.business.findUnique({
      where: { id: businessId },
      select: { currency: true },
    }),
  ]);

  const rows = advances.map((a) => ({
    id: a.id,
    employeeId: a.employeeId,
    employee: { name: a.employee.name },
    date: format(a.date, "yyyy-MM-dd"),
    amount: Number(a.amount),
    isDiscount: a.isDiscount,
    note: a.note,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Anticipos y Descuentos</h1>
        <p className="text-muted-foreground text-sm">{rows.length} registros · Se descuentan automáticamente en la liquidación del período</p>
      </div>

      <AdvancesTable
        advances={rows}
        employees={employees}
        businessId={businessId}
        canEdit={canEdit}
        currency={business?.currency ?? "ARS"}
      />
    </div>
  );
}
