import { PrismaClient, PayFrequency, MemberRole, OvertimeType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Usuario owner
  const hashedPassword = await bcrypt.hash("password123", 12);

  const owner = await prisma.user.upsert({
    where: { email: "admin@demo.com" },
    update: {},
    create: {
      email: "admin@demo.com",
      name: "Admin Demo",
      password: hashedPassword,
    },
  });

  const viewer = await prisma.user.upsert({
    where: { email: "viewer@demo.com" },
    update: {},
    create: {
      email: "viewer@demo.com",
      name: "Viewer Demo",
      password: hashedPassword,
    },
  });

  // Negocio demo
  const business = await prisma.business.upsert({
    where: { slug: "empresa-demo" },
    update: {},
    create: {
      name: "Empresa Demo S.A.",
      slug: "empresa-demo",
      currency: "ARS",
    },
  });

  // Config del negocio
  await prisma.businessConfig.upsert({
    where: { businessId: business.id },
    update: {},
    create: {
      businessId: business.id,
      extraRate50: 1.5,
      extraRate100: 2.0,
      extraRateHoliday: 2.0,
      hourlyFormulaType: "MONTHLY_200",
      monthlyHours: 200,
      dailyHours: 8,
      workingDaysPerMonth: 25,
    },
  });

  // Membresías
  await prisma.businessMember.upsert({
    where: { userId_businessId: { userId: owner.id, businessId: business.id } },
    update: {},
    create: { userId: owner.id, businessId: business.id, role: MemberRole.OWNER },
  });

  await prisma.businessMember.upsert({
    where: { userId_businessId: { userId: viewer.id, businessId: business.id } },
    update: {},
    create: { userId: viewer.id, businessId: business.id, role: MemberRole.VIEWER },
  });

  // Feriados
  const holidays = [
    { date: new Date("2025-01-01"), name: "Año Nuevo" },
    { date: new Date("2025-03-03"), name: "Carnaval" },
    { date: new Date("2025-03-04"), name: "Carnaval" },
    { date: new Date("2025-04-02"), name: "Día del Veterano" },
    { date: new Date("2025-04-18"), name: "Viernes Santo" },
    { date: new Date("2025-05-01"), name: "Día del Trabajador" },
    { date: new Date("2025-05-25"), name: "Día de la Patria" },
    { date: new Date("2025-07-09"), name: "Día de la Independencia" },
    { date: new Date("2025-12-25"), name: "Navidad" },
  ];

  for (const h of holidays) {
    await prisma.holiday.upsert({
      where: { businessId_date: { businessId: business.id, date: h.date } },
      update: {},
      create: { businessId: business.id, ...h },
    });
  }

  // ─── EMPLEADOS CON DISTINTAS FRECUENCIAS ─────────────────────────────────

  // Empleado 1: Mensual - Ana García
  const ana = await prisma.employee.upsert({
    where: { id: "seed-emp-01" },
    update: {},
    create: {
      id: "seed-emp-01",
      businessId: business.id,
      name: "Ana García",
      dni: "30111222",
      position: "Contadora",
      startDate: new Date("2022-03-01"),
      baseSalary: 800000,
      payFrequency: PayFrequency.MONTHLY,
      dailyHours: 8,
      status: "ACTIVE",
    },
  });

  // Empleado 2: Quincenal - Carlos López
  const carlos = await prisma.employee.upsert({
    where: { id: "seed-emp-02" },
    update: {},
    create: {
      id: "seed-emp-02",
      businessId: business.id,
      name: "Carlos López",
      dni: "28333444",
      position: "Operario",
      startDate: new Date("2023-06-15"),
      baseSalary: 600000,
      payFrequency: PayFrequency.BIWEEKLY,
      dailyHours: 8,
      status: "ACTIVE",
    },
  });

  // Empleado 3: Semanal - María Torres
  const maria = await prisma.employee.upsert({
    where: { id: "seed-emp-03" },
    update: {},
    create: {
      id: "seed-emp-03",
      businessId: business.id,
      name: "María Torres",
      dni: "35555666",
      position: "Vendedora",
      startDate: new Date("2024-01-08"),
      baseSalary: 500000,
      payFrequency: PayFrequency.WEEKLY,
      dailyHours: 8,
      status: "ACTIVE",
    },
  });

  // ─── HORAS EXTRAS (Enero 2025) ────────────────────────────────────────────

  const overtimeData = [
    // Ana - MENSUAL
    { employeeId: ana.id, date: new Date("2025-01-07"), hours: 3, type: OvertimeType.EXTRA_50, note: "Cierre trimestral" },
    { employeeId: ana.id, date: new Date("2025-01-14"), hours: 2, type: OvertimeType.EXTRA_100, note: "Urgencia auditoría" },
    { employeeId: ana.id, date: new Date("2025-01-01"), hours: 4, type: OvertimeType.HOLIDAY, note: "Feriado Año Nuevo" },
    // Carlos - QUINCENAL (primera quincena)
    { employeeId: carlos.id, date: new Date("2025-01-06"), hours: 5, type: OvertimeType.EXTRA_50, note: "Producción urgente" },
    { employeeId: carlos.id, date: new Date("2025-01-10"), hours: 3, type: OvertimeType.EXTRA_50, note: "" },
    { employeeId: carlos.id, date: new Date("2025-01-13"), hours: 2, type: OvertimeType.EXTRA_100, note: "Turno nocturno" },
    // María - SEMANAL (semana 6-12 enero)
    { employeeId: maria.id, date: new Date("2025-01-07"), hours: 4, type: OvertimeType.EXTRA_50, note: "Inventario" },
    { employeeId: maria.id, date: new Date("2025-01-08"), hours: 2, type: OvertimeType.EXTRA_50, note: "" },
    { employeeId: maria.id, date: new Date("2025-01-11"), hours: 3, type: OvertimeType.EXTRA_100, note: "Liquidación mensual" },
  ];

  for (const ot of overtimeData) {
    const existing = await prisma.overtime.findFirst({
      where: {
        employeeId: ot.employeeId,
        date: ot.date,
        type: ot.type,
      },
    });
    if (!existing) {
      await prisma.overtime.create({
        data: { ...ot, businessId: business.id },
      });
    }
  }

  // Anticipos
  const advances = [
    { employeeId: carlos.id, date: new Date("2025-01-10"), amount: 50000, isDiscount: false, note: "Anticipo enero" },
    { employeeId: maria.id, date: new Date("2025-01-08"), amount: 30000, isDiscount: true, note: "Descuento uniforme" },
  ];

  for (const adv of advances) {
    const existing = await prisma.advance.findFirst({
      where: { employeeId: adv.employeeId, date: adv.date },
    });
    if (!existing) {
      await prisma.advance.create({
        data: { ...adv, businessId: business.id },
      });
    }
  }

  console.log("✅ Seed completado.");
  console.log("   Login: admin@demo.com / password123");
  console.log("   Login: viewer@demo.com / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
