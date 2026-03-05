import { z } from "zod";

export const overtimeSchema = z.object({
  employeeId: z.string().min(1, "Empleado requerido"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  hours: z.coerce.number().positive("Las horas deben ser mayor a 0").max(24),
  type: z.enum(["EXTRA_50", "EXTRA_100", "HOLIDAY"]),
  note: z.string().optional(),
});

export type OvertimeFormData = z.infer<typeof overtimeSchema>;

export const overtimeCsvRowSchema = z.object({
  empleado_id: z.string().min(1),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  horas: z.coerce.number().positive().max(24),
  tipo: z.enum(["EXTRA_50", "EXTRA_100", "HOLIDAY"]),
  nota: z.string().optional().default(""),
});
