/**
 * TESTS DE UNIDAD - Calculador de Liquidaciones
 *
 * Escenarios con 3 empleados (seed):
 *   Ana García    - MENSUAL  - $800.000
 *   Carlos López  - QUINCENAL - $600.000
 *   María Torres  - SEMANAL  - $500.000
 *
 * Período: Enero 2025
 */

import { describe, it, expect } from "vitest";
import {
  calculateHourlyRate,
  calculatePeriodSalary,
  calculateOvertimeAmount,
  calculateOvertimeBreakdown,
  calculateAdvancesAndDiscounts,
  calculateEmployeePayroll,
  getWeekPeriod,
  getBiweeklyPeriod,
  getMonthlyPeriod,
  daysBetween,
  round2,
} from "./calculator";
import type { PayrollConfig, EmployeePayrollInput, PayrollPeriod } from "./types";

// ─── CONFIG DE PRUEBA ─────────────────────────────────────────────────────────

const defaultConfig: PayrollConfig = {
  extraRate50: 1.5,
  extraRate100: 2.0,
  extraRateHoliday: 2.0,
  hourlyFormulaType: "MONTHLY_200",
  monthlyHours: 200,
  dailyHours: 8,
  workingDaysPerMonth: 25,
};

// ─── TESTS DE UTILIDADES ──────────────────────────────────────────────────────

describe("daysBetween", () => {
  it("mismo día = 1", () => {
    expect(daysBetween("2025-01-01", "2025-01-01")).toBe(1);
  });

  it("semana completa = 7", () => {
    expect(daysBetween("2025-01-06", "2025-01-12")).toBe(7);
  });

  it("enero completo = 31", () => {
    expect(daysBetween("2025-01-01", "2025-01-31")).toBe(31);
  });

  it("quincena 1-15 = 15", () => {
    expect(daysBetween("2025-01-01", "2025-01-15")).toBe(15);
  });
});

// ─── TESTS DE VALOR HORA ──────────────────────────────────────────────────────

describe("calculateHourlyRate", () => {
  it("formula MONTHLY_200: 800000 / 200 = 4000", () => {
    const { rate } = calculateHourlyRate(800000, defaultConfig);
    expect(rate).toBe(4000);
  });

  it("formula DAILY_HOURS: 800000 / (8 * 25) = 4000", () => {
    const { rate } = calculateHourlyRate(800000, {
      ...defaultConfig,
      hourlyFormulaType: "DAILY_HOURS",
    });
    expect(rate).toBe(4000);
  });

  it("formula DAILY_HOURS con distintos parámetros: 600000 / (8 * 22) = 3409.09", () => {
    const { rate } = calculateHourlyRate(600000, {
      ...defaultConfig,
      hourlyFormulaType: "DAILY_HOURS",
      dailyHours: 8,
      workingDaysPerMonth: 22,
    });
    expect(rate).toBeCloseTo(3409.09, 1);
  });
});

// ─── TESTS DE PERÍODO ─────────────────────────────────────────────────────────

describe("getWeekPeriod", () => {
  it("semana del 6 al 12 de enero 2025 (lun-dom)", () => {
    const period = getWeekPeriod("2025-01-08", 1);
    expect(period.startDate).toBe("2025-01-06");
    expect(period.endDate).toBe("2025-01-12");
    expect(period.frequency).toBe("WEEKLY");
  });

  it("lunes mismo día = inicio de semana", () => {
    const period = getWeekPeriod("2025-01-06", 1);
    expect(period.startDate).toBe("2025-01-06");
    expect(period.endDate).toBe("2025-01-12");
  });
});

describe("getBiweeklyPeriod", () => {
  it("primera quincena: 1-15", () => {
    const period = getBiweeklyPeriod("2025-01-10");
    expect(period.startDate).toBe("2025-01-01");
    expect(period.endDate).toBe("2025-01-15");
  });

  it("segunda quincena: 16-31", () => {
    const period = getBiweeklyPeriod("2025-01-20");
    expect(period.startDate).toBe("2025-01-16");
    expect(period.endDate).toBe("2025-01-31");
  });
});

describe("getMonthlyPeriod", () => {
  it("enero 2025: 1-31", () => {
    const period = getMonthlyPeriod("2025-01-15");
    expect(period.startDate).toBe("2025-01-01");
    expect(period.endDate).toBe("2025-01-31");
  });

  it("febrero 2025 (no bisiesto): 1-28", () => {
    const period = getMonthlyPeriod("2025-02-10");
    expect(period.endDate).toBe("2025-02-28");
  });
});

// ─── TESTS DE SUELDO DE PERÍODO ───────────────────────────────────────────────

describe("calculatePeriodSalary - MENSUAL", () => {
  const period: PayrollPeriod = {
    startDate: "2025-01-01",
    endDate: "2025-01-31",
    frequency: "MONTHLY",
  };

  it("enero completo = sueldo base completo", () => {
    const { amount } = calculatePeriodSalary(800000, "MONTHLY", period);
    expect(amount).toBe(800000);
  });

  it("período parcial (15 días) = proporcional", () => {
    const partial: PayrollPeriod = {
      startDate: "2025-01-01",
      endDate: "2025-01-15",
      frequency: "MONTHLY",
    };
    const { amount } = calculatePeriodSalary(800000, "MONTHLY", partial);
    expect(round2(amount)).toBe(round2((800000 * 15) / 31));
  });
});

describe("calculatePeriodSalary - QUINCENAL", () => {
  const period: PayrollPeriod = {
    startDate: "2025-01-01",
    endDate: "2025-01-15",
    frequency: "BIWEEKLY",
  };

  it("quincenal = sueldo / 2", () => {
    const { amount } = calculatePeriodSalary(600000, "BIWEEKLY", period);
    expect(amount).toBe(300000);
  });
});

describe("calculatePeriodSalary - SEMANAL", () => {
  const period: PayrollPeriod = {
    startDate: "2025-01-06",
    endDate: "2025-01-12",
    frequency: "WEEKLY",
  };

  it("semanal = sueldo * 12 / 52", () => {
    const { amount } = calculatePeriodSalary(500000, "WEEKLY", period);
    expect(round2(amount)).toBe(round2((500000 * 12) / 52));
    // ≈ 115_384.62
  });
});

// ─── TESTS DE HORAS EXTRA ─────────────────────────────────────────────────────

describe("calculateOvertimeAmount", () => {
  it("EXTRA_50: 3h × 4000 × 1.5 = 18000", () => {
    const amount = calculateOvertimeAmount(3, "EXTRA_50", 4000, defaultConfig);
    expect(amount).toBe(18000);
  });

  it("EXTRA_100: 2h × 4000 × 2.0 = 16000", () => {
    const amount = calculateOvertimeAmount(2, "EXTRA_100", 4000, defaultConfig);
    expect(amount).toBe(16000);
  });

  it("HOLIDAY: 4h × 4000 × 2.0 = 32000", () => {
    const amount = calculateOvertimeAmount(4, "HOLIDAY", 4000, defaultConfig);
    expect(amount).toBe(32000);
  });
});

describe("calculateOvertimeBreakdown", () => {
  const period: PayrollPeriod = {
    startDate: "2025-01-01",
    endDate: "2025-01-31",
    frequency: "MONTHLY",
  };

  const overtimes = [
    { date: "2025-01-07", hours: 3, type: "EXTRA_50" as const, note: "" },
    { date: "2025-01-14", hours: 2, type: "EXTRA_100" as const, note: "" },
    { date: "2025-01-01", hours: 4, type: "HOLIDAY" as const, note: "" },
    // Fuera del período - no debe contar
    { date: "2025-02-01", hours: 5, type: "EXTRA_50" as const, note: "" },
  ];

  it("filtra horas fuera del período", () => {
    const breakdown = calculateOvertimeBreakdown(overtimes, period, 4000, defaultConfig);
    const extra50 = breakdown.find((b) => b.type === "EXTRA_50");
    expect(extra50?.hours).toBe(3); // No incluye las 5h del 2025-02-01
  });

  it("calcula totales correctamente", () => {
    const breakdown = calculateOvertimeBreakdown(overtimes, period, 4000, defaultConfig);
    const extra50 = breakdown.find((b) => b.type === "EXTRA_50");
    const extra100 = breakdown.find((b) => b.type === "EXTRA_100");
    const holiday = breakdown.find((b) => b.type === "HOLIDAY");

    expect(extra50?.amount).toBe(18000);   // 3 × 4000 × 1.5
    expect(extra100?.amount).toBe(16000);  // 2 × 4000 × 2.0
    expect(holiday?.amount).toBe(32000);   // 4 × 4000 × 2.0
  });
});

// ─── TESTS DE ANTICIPOS ───────────────────────────────────────────────────────

describe("calculateAdvancesAndDiscounts", () => {
  const period: PayrollPeriod = {
    startDate: "2025-01-01",
    endDate: "2025-01-15",
    frequency: "BIWEEKLY",
  };

  const advances = [
    { date: "2025-01-10", amount: 50000, isDiscount: false, note: "Anticipo" },
    { date: "2025-01-12", amount: 10000, isDiscount: true, note: "Descuento" },
    { date: "2025-01-20", amount: 20000, isDiscount: false, note: "Fuera de período" },
  ];

  it("suma anticipos y descuentos dentro del período", () => {
    const { totalAdvances, totalDiscounts } = calculateAdvancesAndDiscounts(advances, period);
    expect(totalAdvances).toBe(50000);
    expect(totalDiscounts).toBe(10000);
  });

  it("ignora movimientos fuera del período", () => {
    const { totalAdvances } = calculateAdvancesAndDiscounts(advances, period);
    expect(totalAdvances).toBe(50000); // No incluye los 20000 del día 20
  });
});

// ─── TESTS DE LIQUIDACIÓN COMPLETA ───────────────────────────────────────────

describe("calculateEmployeePayroll - ANA (MENSUAL)", () => {
  // Ana García: $800.000 mensual
  // Enero 2025 completo
  // Extras: 3h al 50%, 2h al 100%, 4h feriado
  // Sin anticipos

  const period: PayrollPeriod = getMonthlyPeriod("2025-01-15");

  const ana: EmployeePayrollInput = {
    id: "seed-emp-01",
    name: "Ana García",
    baseSalary: 800000,
    payFrequency: "MONTHLY",
    hourlyRate: null, // auto
    dailyHours: 8,
    overtimes: [
      { date: "2025-01-07", hours: 3, type: "EXTRA_50", note: "Cierre trimestral" },
      { date: "2025-01-14", hours: 2, type: "EXTRA_100", note: "Auditoría" },
      { date: "2025-01-01", hours: 4, type: "HOLIDAY", note: "Año Nuevo" },
    ],
    advances: [],
  };

  it("sueldo período = 800000 (mes completo)", () => {
    const result = calculateEmployeePayroll(ana, period, defaultConfig);
    expect(result.periodSalary).toBe(800000);
  });

  it("valor hora = 800000 / 200 = 4000", () => {
    const result = calculateEmployeePayroll(ana, period, defaultConfig);
    expect(result.hourlyRate).toBe(4000);
  });

  it("extras 50%: 3h × 4000 × 1.5 = 18000", () => {
    const result = calculateEmployeePayroll(ana, period, defaultConfig);
    expect(result.extra50Amount).toBe(18000);
  });

  it("extras 100%: 2h × 4000 × 2.0 = 16000", () => {
    const result = calculateEmployeePayroll(ana, period, defaultConfig);
    expect(result.extra100Amount).toBe(16000);
  });

  it("horas feriado: 4h × 4000 × 2.0 = 32000", () => {
    const result = calculateEmployeePayroll(ana, period, defaultConfig);
    expect(result.holidayAmount).toBe(32000);
  });

  it("total = 800000 + 18000 + 16000 + 32000 = 866000", () => {
    const result = calculateEmployeePayroll(ana, period, defaultConfig);
    expect(result.totalAmount).toBe(866000);
  });
});

describe("calculateEmployeePayroll - CARLOS (QUINCENAL)", () => {
  // Carlos López: $600.000 quincenal
  // Primera quincena: 1-15 de enero 2025
  // Extras: 8h al 50%, 2h al 100%
  // Anticipo: $50.000 (10 enero), sin descuentos

  const period: PayrollPeriod = getBiweeklyPeriod("2025-01-10");

  const carlos: EmployeePayrollInput = {
    id: "seed-emp-02",
    name: "Carlos López",
    baseSalary: 600000,
    payFrequency: "BIWEEKLY",
    hourlyRate: null,
    dailyHours: 8,
    overtimes: [
      { date: "2025-01-06", hours: 5, type: "EXTRA_50", note: "" },
      { date: "2025-01-10", hours: 3, type: "EXTRA_50", note: "" },
      { date: "2025-01-13", hours: 2, type: "EXTRA_100", note: "" },
    ],
    advances: [
      { date: "2025-01-10", amount: 50000, isDiscount: false, note: "Anticipo" },
    ],
  };

  const hourlyRate = 600000 / 200; // 3000

  it("sueldo período = 300000 (600000 / 2)", () => {
    const result = calculateEmployeePayroll(carlos, period, defaultConfig);
    expect(result.periodSalary).toBe(300000);
  });

  it("valor hora = 600000 / 200 = 3000", () => {
    const result = calculateEmployeePayroll(carlos, period, defaultConfig);
    expect(result.hourlyRate).toBe(3000);
  });

  it("extras 50%: 8h × 3000 × 1.5 = 36000", () => {
    const result = calculateEmployeePayroll(carlos, period, defaultConfig);
    expect(result.extra50Hours).toBe(8);
    expect(result.extra50Amount).toBe(36000);
  });

  it("extras 100%: 2h × 3000 × 2.0 = 12000", () => {
    const result = calculateEmployeePayroll(carlos, period, defaultConfig);
    expect(result.extra100Amount).toBe(12000);
  });

  it("anticipo = 50000", () => {
    const result = calculateEmployeePayroll(carlos, period, defaultConfig);
    expect(result.advances).toBe(50000);
  });

  it("total = 300000 + 36000 + 12000 - 50000 = 298000", () => {
    const result = calculateEmployeePayroll(carlos, period, defaultConfig);
    expect(result.totalAmount).toBe(298000);
  });
});

describe("calculateEmployeePayroll - MARÍA (SEMANAL)", () => {
  // María Torres: $500.000 mensual → semanal
  // Semana 6-12 enero 2025
  // Extras: 6h al 50%, 3h al 100%
  // Descuento: $30.000

  const period: PayrollPeriod = getWeekPeriod("2025-01-08", 1);

  const maria: EmployeePayrollInput = {
    id: "seed-emp-03",
    name: "María Torres",
    baseSalary: 500000,
    payFrequency: "WEEKLY",
    hourlyRate: null,
    dailyHours: 8,
    overtimes: [
      { date: "2025-01-07", hours: 4, type: "EXTRA_50", note: "" },
      { date: "2025-01-08", hours: 2, type: "EXTRA_50", note: "" },
      { date: "2025-01-11", hours: 3, type: "EXTRA_100", note: "" },
    ],
    advances: [
      { date: "2025-01-08", amount: 30000, isDiscount: true, note: "Descuento uniforme" },
    ],
  };

  const weeklyBase = (500000 * 12) / 52;
  const hourlyRate = 500000 / 200; // 2500

  it("sueldo semanal = 500000 * 12 / 52 ≈ 115384.62", () => {
    const result = calculateEmployeePayroll(maria, period, defaultConfig);
    expect(round2(result.periodSalary)).toBe(round2(weeklyBase));
  });

  it("valor hora = 500000 / 200 = 2500", () => {
    const result = calculateEmployeePayroll(maria, period, defaultConfig);
    expect(result.hourlyRate).toBe(2500);
  });

  it("extras 50%: 6h × 2500 × 1.5 = 22500", () => {
    const result = calculateEmployeePayroll(maria, period, defaultConfig);
    expect(result.extra50Hours).toBe(6);
    expect(result.extra50Amount).toBe(22500);
  });

  it("extras 100%: 3h × 2500 × 2.0 = 15000", () => {
    const result = calculateEmployeePayroll(maria, period, defaultConfig);
    expect(result.extra100Amount).toBe(15000);
  });

  it("descuento = 30000", () => {
    const result = calculateEmployeePayroll(maria, period, defaultConfig);
    expect(result.discounts).toBe(30000);
  });

  it("total = weeklyBase + 22500 + 15000 - 30000", () => {
    const result = calculateEmployeePayroll(maria, period, defaultConfig);
    expect(round2(result.totalAmount)).toBe(round2(weeklyBase + 22500 + 15000 - 30000));
  });
});

describe("Casos borde", () => {
  it("empleado sin extras: total = sueldo período", () => {
    const emp: EmployeePayrollInput = {
      id: "test",
      name: "Test",
      baseSalary: 500000,
      payFrequency: "MONTHLY",
      hourlyRate: null,
      dailyHours: 8,
      overtimes: [],
      advances: [],
    };
    const period = getMonthlyPeriod("2025-01-15");
    const result = calculateEmployeePayroll(emp, period, defaultConfig);
    expect(result.totalAmount).toBe(500000);
  });

  it("empleado con hourlyRate fijo no usa fórmula de config", () => {
    const emp: EmployeePayrollInput = {
      id: "test2",
      name: "Test Fixed",
      baseSalary: 800000,
      payFrequency: "MONTHLY",
      hourlyRate: 5000, // fijo, diferente a 800000/200=4000
      dailyHours: 8,
      overtimes: [{ date: "2025-01-07", hours: 2, type: "EXTRA_50", note: "" }],
      advances: [],
    };
    const period = getMonthlyPeriod("2025-01-15");
    const result = calculateEmployeePayroll(emp, period, defaultConfig);
    expect(result.hourlyRate).toBe(5000);
    expect(result.extra50Amount).toBe(2 * 5000 * 1.5); // 15000
  });

  it("extras fuera del período no se incluyen", () => {
    const emp: EmployeePayrollInput = {
      id: "test3",
      name: "Test Period",
      baseSalary: 600000,
      payFrequency: "BIWEEKLY",
      hourlyRate: null,
      dailyHours: 8,
      overtimes: [
        { date: "2025-01-20", hours: 10, type: "EXTRA_50", note: "" }, // segunda quincena
      ],
      advances: [],
    };
    const period = getBiweeklyPeriod("2025-01-10"); // primera quincena
    const result = calculateEmployeePayroll(emp, period, defaultConfig);
    expect(result.extra50Hours).toBe(0);
    expect(result.extra50Amount).toBe(0);
  });
});
