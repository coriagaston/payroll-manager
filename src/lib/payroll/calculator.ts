/**
 * CALCULADOR DE LIQUIDACIONES
 * Todas las funciones son puras y testeables.
 * Fechas: siempre se trabaja con YYYY-MM-DD como strings para evitar problemas de TZ.
 */

import type {
  PayFrequency,
  OvertimeType,
  PayrollConfig,
  OvertimeEntry,
  AdvanceEntry,
  EmployeePayrollInput,
  PayrollPeriod,
  PayrollResult,
  PayrollFormula,
  OvertimeBreakdown,
} from "./types";

// ─── UTILIDADES DE FECHA (TZ-safe) ────────────────────────────────────────────

/** Parsea YYYY-MM-DD sin conversión de zona horaria */
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Retorna YYYY-MM-DD de un Date local */
export function toLocalDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Días entre dos fechas (inclusive ambas) */
export function daysBetween(start: string, end: string): number {
  const s = parseLocalDate(start);
  const e = parseLocalDate(end);
  const diff = e.getTime() - s.getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24)) + 1;
}

/** Días en el mes de una fecha YYYY-MM-DD */
export function daysInMonth(dateStr: string): number {
  const [y, m] = dateStr.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

// ─── CÁLCULO DE VALOR HORA ────────────────────────────────────────────────────

/**
 * Calcula el valor hora base según la config del negocio.
 * Opción A: sueldo / 200 (default argentino)
 * Opción B: sueldo / (horas_diarias × días_laborales_mes)
 */
export function calculateHourlyRate(
  baseSalary: number,
  config: Pick<PayrollConfig, "hourlyFormulaType" | "monthlyHours" | "dailyHours" | "workingDaysPerMonth">
): { rate: number; formula: string } {
  if (config.hourlyFormulaType === "MONTHLY_200") {
    return {
      rate: baseSalary / config.monthlyHours,
      formula: `${baseSalary} / ${config.monthlyHours}h = ${(baseSalary / config.monthlyHours).toFixed(4)}`,
    };
  }
  const divisor = config.dailyHours * config.workingDaysPerMonth;
  return {
    rate: baseSalary / divisor,
    formula: `${baseSalary} / (${config.dailyHours}h × ${config.workingDaysPerMonth}d) = ${(baseSalary / divisor).toFixed(4)}`,
  };
}

// ─── CÁLCULO DE SUELDO PROPORCIONAL AL PERÍODO ────────────────────────────────

/**
 * Calcula el sueldo proporcional al período.
 *
 * Semanal:   baseSalary / (365.25/7/12) ≈ baseSalary / 4.345 → usamos 4 semanas
 *            Más preciso: baseSalary * 12 / 52
 * Quincenal: baseSalary / 2
 * Mensual:   baseSalary * (días del período / días del mes)
 *            → Para período mensual completo = baseSalary
 */
export function calculatePeriodSalary(
  baseSalary: number,
  frequency: PayFrequency,
  period: PayrollPeriod
): { amount: number; periodDays: number; calendarDays: number } {
  const periodDays = daysBetween(period.startDate, period.endDate);

  switch (frequency) {
    case "WEEKLY": {
      // Una semana = baseSalary * 12 / 52 (semanas exactas por año)
      const amount = (baseSalary * 12) / 52;
      return { amount, periodDays, calendarDays: 7 };
    }
    case "BIWEEKLY": {
      const amount = baseSalary / 2;
      return { amount, periodDays, calendarDays: 15 };
    }
    case "MONTHLY": {
      const totalDays = daysInMonth(period.startDate);
      const amount = baseSalary * (periodDays / totalDays);
      return { amount, periodDays, calendarDays: totalDays };
    }
  }
}

// ─── CÁLCULO DE HORAS EXTRAS ──────────────────────────────────────────────────

export function getOvertimeMultiplier(type: OvertimeType, config: PayrollConfig): number {
  switch (type) {
    case "EXTRA_50":  return config.extraRate50;
    case "EXTRA_100": return config.extraRate100;
    case "HOLIDAY":   return config.extraRateHoliday;
  }
}

/**
 * Calcula el importe de horas extra para un tipo dado.
 * Fórmula: horas × valorHora × multiplicador
 */
export function calculateOvertimeAmount(
  hours: number,
  type: OvertimeType,
  hourlyRate: number,
  config: PayrollConfig
): number {
  const multiplier = getOvertimeMultiplier(type, config);
  return hours * hourlyRate * multiplier;
}

/**
 * Agrupa y calcula horas extra filtradas en el período indicado.
 */
export function calculateOvertimeBreakdown(
  overtimes: OvertimeEntry[],
  period: PayrollPeriod,
  hourlyRate: number,
  config: PayrollConfig
): OvertimeBreakdown[] {
  const filtered = overtimes.filter(
    (ot) => ot.date >= period.startDate && ot.date <= period.endDate
  );

  const groups: Record<OvertimeType, { hours: number }> = {
    EXTRA_50: { hours: 0 },
    EXTRA_100: { hours: 0 },
    HOLIDAY: { hours: 0 },
  };

  for (const ot of filtered) {
    groups[ot.type].hours += ot.hours;
  }

  return (Object.keys(groups) as OvertimeType[])
    .filter((type) => groups[type].hours > 0)
    .map((type) => {
      const { hours } = groups[type];
      const rate = getOvertimeMultiplier(type, config);
      const amount = calculateOvertimeAmount(hours, type, hourlyRate, config);
      return { type, hours, rate, hourlyRate, amount };
    });
}

// ─── CÁLCULO DE ANTICIPOS Y DESCUENTOS ───────────────────────────────────────

export function calculateAdvancesAndDiscounts(
  advances: AdvanceEntry[],
  period: PayrollPeriod
): { totalAdvances: number; totalDiscounts: number } {
  const filtered = advances.filter(
    (a) => a.date >= period.startDate && a.date <= period.endDate
  );

  return filtered.reduce(
    (acc, adv) => {
      if (adv.isDiscount) acc.totalDiscounts += adv.amount;
      else acc.totalAdvances += adv.amount;
      return acc;
    },
    { totalAdvances: 0, totalDiscounts: 0 }
  );
}

// ─── CALCULADOR PRINCIPAL ──────────────────────────────────────────────────────

/**
 * Calcula la liquidación completa de un empleado para un período dado.
 * Todas las operaciones son TZ-safe (strings YYYY-MM-DD).
 *
 * Total = sueldo_período + extras50 + extras100 + holiday - anticipos - descuentos
 */
export function calculateEmployeePayroll(
  employee: EmployeePayrollInput,
  period: PayrollPeriod,
  config: PayrollConfig
): PayrollResult {
  // 1. Valor hora
  const hourlyRateCalc =
    employee.hourlyRate != null
      ? {
          rate: employee.hourlyRate,
          formula: `Valor hora fijo: ${employee.hourlyRate}`,
        }
      : calculateHourlyRate(employee.baseSalary, config);

  const hourlyRate = hourlyRateCalc.rate;

  // 2. Sueldo del período
  const { amount: periodSalary, periodDays, calendarDays } = calculatePeriodSalary(
    employee.baseSalary,
    employee.payFrequency,
    period
  );

  // 3. Horas extras
  const overtimeBreakdown = calculateOvertimeBreakdown(
    employee.overtimes,
    period,
    hourlyRate,
    config
  );

  const extra50 = overtimeBreakdown.find((b) => b.type === "EXTRA_50");
  const extra100 = overtimeBreakdown.find((b) => b.type === "EXTRA_100");
  const holiday = overtimeBreakdown.find((b) => b.type === "HOLIDAY");

  const totalOvertimeAmount = overtimeBreakdown.reduce((s, b) => s + b.amount, 0);

  // 4. Anticipos y descuentos
  const { totalAdvances, totalDiscounts } = calculateAdvancesAndDiscounts(
    employee.advances,
    period
  );

  // 5. Total final
  const totalAmount = periodSalary + totalOvertimeAmount - totalAdvances - totalDiscounts;

  // 6. Fórmula para transparencia
  const formula: PayrollFormula = {
    baseSalary: employee.baseSalary,
    frequency: employee.payFrequency,
    periodDays,
    calendarDays,
    periodSalary,
    hourlyRateFormula: hourlyRateCalc.formula,
    hourlyRate,
    overtimeBreakdown,
    totalOvertimeAmount,
    advances: totalAdvances,
    discounts: totalDiscounts,
    totalAmount,
  };

  return {
    employeeId: employee.id,
    employeeName: employee.name,
    baseSalary: employee.baseSalary,
    periodSalary,
    hourlyRate,
    extra50Hours: extra50?.hours ?? 0,
    extra50Amount: extra50?.amount ?? 0,
    extra100Hours: extra100?.hours ?? 0,
    extra100Amount: extra100?.amount ?? 0,
    holidayHours: holiday?.hours ?? 0,
    holidayAmount: holiday?.amount ?? 0,
    advances: totalAdvances,
    discounts: totalDiscounts,
    totalAmount,
    formula,
  };
}

/**
 * Calcula la liquidación de múltiples empleados para el mismo período.
 */
export function calculatePayrollBatch(
  employees: EmployeePayrollInput[],
  period: PayrollPeriod,
  config: PayrollConfig
): PayrollResult[] {
  return employees.map((e) => calculateEmployeePayroll(e, period, config));
}

// ─── HELPERS DE PERÍODO ───────────────────────────────────────────────────────

/** Devuelve el período semanal (lunes-domingo) que contiene la fecha dada */
export function getWeekPeriod(dateStr: string, weekStartDay = 1): PayrollPeriod {
  const d = parseLocalDate(dateStr);
  const day = d.getDay(); // 0=dom, 1=lun...
  const diff = (day - weekStartDay + 7) % 7;
  const start = new Date(d);
  start.setDate(d.getDate() - diff);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return {
    startDate: toLocalDateStr(start),
    endDate: toLocalDateStr(end),
    frequency: "WEEKLY",
  };
}

/** Devuelve el período quincenal para una fecha */
export function getBiweeklyPeriod(
  dateStr: string,
  firstStart = 1,
  firstEnd = 15
): PayrollPeriod {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (d <= firstEnd) {
    return {
      startDate: `${y}-${String(m).padStart(2, "0")}-${String(firstStart).padStart(2, "0")}`,
      endDate: `${y}-${String(m).padStart(2, "0")}-${String(firstEnd).padStart(2, "0")}`,
      frequency: "BIWEEKLY",
    };
  }
  const lastDay = new Date(y, m, 0).getDate();
  return {
    startDate: `${y}-${String(m).padStart(2, "0")}-${String(firstEnd + 1).padStart(2, "0")}`,
    endDate: `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
    frequency: "BIWEEKLY",
  };
}

/** Devuelve el período mensual completo para una fecha */
export function getMonthlyPeriod(dateStr: string): PayrollPeriod {
  const [y, m] = dateStr.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return {
    startDate: `${y}-${String(m).padStart(2, "0")}-01`,
    endDate: `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
    frequency: "MONTHLY",
  };
}

// ─── FORMATO MONEDA ───────────────────────────────────────────────────────────

export function formatCurrency(amount: number, currency = "ARS"): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

/** Redondea a 2 decimales para evitar problemas de punto flotante */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
