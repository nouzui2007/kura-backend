import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { calculatePayroll } from "../payroll-utils.ts";

const defaultSystemSettings = {
  regularHoursPerDay: 8,
  defaultBreakMinutes: 60,
  breakMinutesFor6Hours: 45,
  breakMinutesFor8Hours: 60,
  overtimeThreshold: 45,
  overtimeRate: 25,
  excessOvertimeRate: 50,
  lateNightRate: 25,
  holidayRate: 35,
  lateNightStartHour: 22,
  lateNightEndHour: 5,
  earlyOvertimeStandardHour: 7,
  earlyLeaveStandardHour: 17,
  overtimeStandardHour: 17,
  defaultHourlyRate: 1200,
};

Deno.test("calculatePayroll - Monthly salary calculation", () => {
  const staff = {
    monthlySalary: 300000,
    allowances: [{ name: "交通費", amount: 15000 }],
    deductions: [{ name: "社会保険", amount: 35000 }],
  };
  const attendances = [
    { workHours: 8 },
    { workHours: 8 },
    { workHours: 8 },
  ];
  
  const result = calculatePayroll(staff, attendances, defaultSystemSettings);
  
  assertEquals(result.baseSalary, 300000);
  assertEquals(result.workDays, 3);
  assertEquals(result.totalWorkHours, 24);
  assertEquals(result.regularHours, 24);
  assertEquals(result.overtimeHours, 0);
  assertEquals(result.allowancesTotal, 15000);
  assertEquals(result.deductionsTotal, 35000);
  assertEquals(result.total, 280000); // 300000 + 15000 - 35000
});

Deno.test("calculatePayroll - Hourly rate calculation", () => {
  const staff = {
    hourlyRate: 1500,
    allowances: [{ name: "交通費", amount: 10000 }],
    deductions: [{ name: "社会保険", amount: 12000 }],
  };
  const attendances = [
    { workHours: 8 },
    { workHours: 8 },
    { workHours: 8 },
  ];
  
  const result = calculatePayroll(staff, attendances, defaultSystemSettings);
  
  assertEquals(result.hourlyRate, 1500);
  assertEquals(result.workDays, 3);
  assertEquals(result.totalWorkHours, 24);
  assertEquals(result.regularHours, 24);
  assertEquals(result.overtimeHours, 0);
  assertEquals(result.basePay, 36000); // 24 * 1500
  assertEquals(result.overtimePay, 0);
  assertEquals(result.allowancesTotal, 10000);
  assertEquals(result.deductionsTotal, 12000);
  assertEquals(result.total, 34000); // 36000 + 10000 - 12000
});

Deno.test("calculatePayroll - Hourly rate with overtime", () => {
  const staff = {
    hourlyRate: 1500,
  };
  const attendances = [
    { workHours: 10 }, // 2時間残業
    { workHours: 9 },  // 1時間残業
    { workHours: 8 },
  ];
  
  const result = calculatePayroll(staff, attendances, defaultSystemSettings);
  
  assertEquals(result.totalWorkHours, 27);
  assertEquals(result.regularHours, 24); // 8 * 3
  assertEquals(result.overtimeHours, 3); // 27 - 24
  assertEquals(result.basePay, 36000); // 24 * 1500
  assertEquals(result.overtimePay, 5625); // 3 * 1500 * 1.25
  assertEquals(result.total, 41625); // 36000 + 5625
});

Deno.test("calculatePayroll - Default hourly rate when not set", () => {
  const staff = {
    // hourlyRateもmonthlySalaryも設定されていない
  };
  const attendances = [
    { workHours: 8 },
  ];
  
  const result = calculatePayroll(staff, attendances, defaultSystemSettings);
  
  assertEquals(result.hourlyRate, 1200); // defaultHourlyRate
  assertEquals(result.basePay, 9600); // 8 * 1200
  assertEquals(result.total, 9600);
});

Deno.test("calculatePayroll - Multiple allowances and deductions", () => {
  const staff = {
    monthlySalary: 300000,
    allowances: [
      { name: "交通費", amount: 15000 },
      { name: "住宅手当", amount: 30000 },
    ],
    deductions: [
      { name: "社会保険", amount: 35000 },
      { name: "厚生年金", amount: 32000 },
    ],
  };
  const attendances = [{ workHours: 8 }];
  
  const result = calculatePayroll(staff, attendances, defaultSystemSettings);
  
  assertEquals(result.allowancesTotal, 45000);
  assertEquals(result.deductionsTotal, 67000);
  assertEquals(result.total, 278000); // 300000 + 45000 - 67000
});

Deno.test("calculatePayroll - Empty attendances", () => {
  const staff = {
    hourlyRate: 1500,
  };
  const attendances: Array<{ workHours: number }> = [];
  
  const result = calculatePayroll(staff, attendances, defaultSystemSettings);
  
  assertEquals(result.workDays, 0);
  assertEquals(result.totalWorkHours, 0);
  assertEquals(result.regularHours, 0);
  assertEquals(result.overtimeHours, 0);
  assertEquals(result.basePay, 0);
  assertEquals(result.total, 0);
});

Deno.test("calculatePayroll - Overtime rate calculation", () => {
  const staff = {
    hourlyRate: 1000,
  };
  const attendances = [
    { workHours: 9 }, // 1時間残業
  ];
  
  const result = calculatePayroll(staff, attendances, defaultSystemSettings);
  
  assertEquals(result.overtimeHours, 1);
  assertEquals(result.basePay, 8000); // 8 * 1000
  assertEquals(result.overtimePay, 1250); // 1 * 1000 * 1.25 (25%割増)
  assertEquals(result.total, 9250);
});

