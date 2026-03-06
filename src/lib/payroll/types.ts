export type PayFrequency = "WEEKLY" | "BIWEEKLY" | "MONTHLY";
export type OvertimeType = "EXTRA_50" | "EXTRA_100" | "HOLIDAY";
export type HourlyFormulaType = "MONTHLY_200" | "DAILY_HOURS";

export interface PayrollConfig {
  extraRate50: number;
  extraRate100: number;
  extraRateHoliday: number;
  hourlyFormulaType: HourlyFormulaType;
  monthlyHours: number;
  dailyHours: number;
  workingDaysPerMonth: number;
}

export interface OvertimeEntry {
  date: string; // ISO date string YYYY-MM-DD (UTC normalized)
  hours: number;
  type: OvertimeType;
  note?: string;
}

export interface AdvanceEntry {
  date: string;
  amount: number;
  isDiscount: boolean;
  note?: string;
}

export interface EmployeePayrollInput {
  id: string;
  name: string;
  baseSalary: number;
  payFrequency: PayFrequency;
  hourlyRate: number | null; // null = auto-calculado
  dailyHours: number;
  cbu?: string | null;
  overtimes: OvertimeEntry[];
  advances: AdvanceEntry[];
}

export interface PayrollPeriod {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  frequency: PayFrequency;
}

export interface OvertimeBreakdown {
  type: OvertimeType;
  hours: number;
  rate: number;       // multiplicador efectivo (ej: 1.5)
  hourlyRate: number; // valor hora base
  amount: number;
}

export interface PayrollFormula {
  baseSalary: number;
  frequency: PayFrequency;
  periodDays: number;
  calendarDays: number;
  periodSalary: number;
  hourlyRateFormula: string;
  hourlyRate: number;
  overtimeBreakdown: OvertimeBreakdown[];
  totalOvertimeAmount: number;
  advances: number;
  discounts: number;
  totalAmount: number;
}

export interface PayrollResult {
  employeeId: string;
  employeeName: string;
  baseSalary: number;
  periodSalary: number;
  hourlyRate: number;
  extra50Hours: number;
  extra50Amount: number;
  extra100Hours: number;
  extra100Amount: number;
  holidayHours: number;
  holidayAmount: number;
  advances: number;
  discounts: number;
  totalAmount: number;
  formula: PayrollFormula;
  cbu?: string | null;
}
