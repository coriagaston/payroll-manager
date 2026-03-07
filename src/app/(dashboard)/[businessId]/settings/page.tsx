import { getAuthSession, requireBusinessAccess } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { BusinessConfigForm } from "@/components/layout/business-config-form";
import { HolidaysManager } from "@/components/layout/holidays-manager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

interface Props { params: Promise<{ businessId: string }> }

export default async function SettingsPage({ params }: Props) {
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

  const [business, config, holidays] = await Promise.all([
    prisma.business.findUnique({ where: { id: businessId }, select: { name: true, currency: true } }),
    prisma.businessConfig.findUnique({ where: { businessId } }),
    prisma.holiday.findMany({
      where: { businessId },
      orderBy: { date: "asc" },
    }),
  ]);

  if (!business) notFound();

  const configData = config
    ? {
        extraRate50: Number(config.extraRate50),
        extraRate100: Number(config.extraRate100),
        extraRateHoliday: Number(config.extraRateHoliday),
        hourlyFormulaType: config.hourlyFormulaType,
        monthlyHours: config.monthlyHours,
        dailyHours: config.dailyHours,
        workingDaysPerMonth: config.workingDaysPerMonth,
        weekStartDay: config.weekStartDay,
        biweeklyFirstStart: config.biweeklyFirstStart,
        biweeklyFirstEnd: config.biweeklyFirstEnd,
      }
    : null;

  const holidayRows = holidays.map((h) => ({
    id: h.id,
    date: format(h.date, "yyyy-MM-dd"),
    name: h.name,
  }));

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configuración</h1>
        <p className="text-muted-foreground text-sm">{business.name}</p>
      </div>

      <Tabs defaultValue="config">
        <TabsList>
          <TabsTrigger value="config">Parámetros de liquidación</TabsTrigger>
          <TabsTrigger value="holidays">Feriados</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="pt-4">
          <BusinessConfigForm
            businessId={businessId}
            defaultValues={configData}
            canEdit={canEdit}
          />
        </TabsContent>

        <TabsContent value="holidays" className="pt-4">
          <HolidaysManager
            businessId={businessId}
            holidays={holidayRows}
            canEdit={canEdit}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
