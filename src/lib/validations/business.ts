import { z } from "zod";

export const businessSchema = z.object({
  name: z.string().min(2, "Nombre del negocio requerido"),
  cuit: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  industry: z.string().optional(),
  currency: z.string().default("ARS"),
});

export const businessConfigSchema = z.object({
  extraRate50: z.coerce.number().positive().default(1.5),
  extraRate100: z.coerce.number().positive().default(2.0),
  extraRateHoliday: z.coerce.number().positive().default(2.0),
  hourlyFormulaType: z.enum(["MONTHLY_200", "DAILY_HOURS"]).default("MONTHLY_200"),
  monthlyHours: z.coerce.number().int().positive().default(200),
  dailyHours: z.coerce.number().int().min(1).max(24).default(8),
  workingDaysPerMonth: z.coerce.number().int().min(1).max(31).default(25),
  weekStartDay: z.coerce.number().int().min(0).max(6).default(1),
  biweeklyFirstStart: z.coerce.number().int().min(1).max(15).default(1),
  biweeklyFirstEnd: z.coerce.number().int().min(1).max(20).default(15),
  jubilacionRate: z.coerce.number().min(0).max(1).default(0.11),
  obraSocialRate: z.coerce.number().min(0).max(1).default(0.03),
  pamiRate: z.coerce.number().min(0).max(1).default(0.03),
});

export const holidaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  name: z.string().min(1, "Nombre del feriado requerido"),
});

export const advanceSchema = z.object({
  employeeId: z.string().min(1, "Empleado requerido"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  amount: z.coerce.number().positive("El monto debe ser mayor a 0"),
  isDiscount: z.boolean().default(false),
  note: z.string().optional(),
});

export const payrollGenerateSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha de inicio inválida"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha de fin inválida"),
  frequency: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY"]),
  employeeIds: z.array(z.string()).optional(),
});

export const payrollConceptSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  type: z.enum(["EARNING", "DEDUCTION"]),
});

export type BusinessFormData = z.infer<typeof businessSchema>;
export type BusinessConfigFormData = z.infer<typeof businessConfigSchema>;
export type HolidayFormData = z.infer<typeof holidaySchema>;
export type AdvanceFormData = z.infer<typeof advanceSchema>;
export type PayrollGenerateData = z.infer<typeof payrollGenerateSchema>;
export type PayrollConceptFormData = z.infer<typeof payrollConceptSchema>;
