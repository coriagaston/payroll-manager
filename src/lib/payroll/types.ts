export type PayFrequency = "WEEKLY" | "BIWEEKLY" | "MONTHLY";
export type OvertimeType = "EXTRA_50" | "EXTRA_100" | "HOLIDAY";
export type HourlyFormulaType = "MONTHLY_200" | "DAILY_HOURS";
export type ConceptType = "EARNING" | "DEDUCTION";

export interface PayrollConfig {
  extraRate50: number;
  extraRate100: number;
  extraRateHoliday: number;
  hourlyFormulaType: HourlyFormulaType;
  monthlyHours: number;
  dailyHours: number;
  workingDaysPerMonth: number;
  jubilacionRate: number;
  obraSocialRate: number;
  pamiRate: number;
}

export interface OvertimeEntry {
  date: string;
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

export interface AbsenceEntry {
  date: string;
  days: number;
  note?: string;
}

export interface ExtraConcept {
  name: string;
  type: ConceptType;
  amount: number;
}

export interface EmployeePayrollInput {
  id: string;
  name: string;
  cuil?: string | null;
  baseSalary: number;
  payFrequency: PayFrequency;
  hourlyRate: number | null;
  dailyHours: number;
  cbu?: string | null;
  overtimes: OvertimeEntry[];
  advances: AdvanceEntry[];
  absences: AbsenceEntry[];
}

export interface PayrollPeriod {
  startDate: string;
  endDate: string;
  frequency: PayFrequency;
}

export interface OvertimeBreakdown {
  type: OvertimeType;
  hours: number;
  rate: number;
  hourlyRate: number;
  amount: number;
}

export interface RetentionBreakdown {
  base: number;
  jubilacion: number;
  obraSocial: number;
  pami: number;
  total: number;
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
  grossAmount: number;
  retentions: RetentionBreakdown;
  advances: number;
  discounts: number;
  absences: number;
  absenceDeduction: number;
  extraConcepts: ExtraConcept[];
  totalAmount: number;
}

export interface PayrollResult {
  employeeId: string;
  employeeName: string;
  cuil?: string | null;
  baseSalary: number;
  periodSalary: number;
  hourlyRate: number;
  extra50Hours: number;
  extra50Amount: number;
  extra100Hours: number;
  extra100Amount: number;
  holidayHours: number;
  holidayAmount: number;
  grossAmount: number;
  retentions: RetentionBreakdown;
  advances: number;
  discounts: number;
  absences: number;
  absenceDeduction: number;
  extraConcepts: ExtraConcept[];
  totalAmount: number;
  formula: PayrollFormula;
  cbu?: string | null;
}
