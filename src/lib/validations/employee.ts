import { z } from "zod";

export const employeeSchema = z.object({
  name: z.string().min(2, "Nombre requerido (mín. 2 caracteres)"),
  cuil: z.string().optional(),
  dni: z.string().optional(),
  cbu: z.string().max(22).optional(),
  position: z.string().min(1, "Puesto requerido"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD)"),
  baseSalary: z.coerce.number().positive("El sueldo debe ser mayor a 0"),
  payFrequency: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY"]),
  hourlyRate: z.coerce.number().positive().optional().nullable(),
  dailyHours: z.coerce.number().int().min(1).max(24).default(8),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  employmentType: z.enum(["FORMAL", "INFORMAL"]).default("FORMAL"),
});

export type EmployeeFormData = z.infer<typeof employeeSchema>;
