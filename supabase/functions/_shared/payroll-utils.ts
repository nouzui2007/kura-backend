interface SystemSettings {
  regularHoursPerDay: number;
  defaultBreakMinutes: number;
  breakMinutesFor6Hours: number;
  breakMinutesFor8Hours: number;
  overtimeThreshold: number;
  overtimeRate: number;
  excessOvertimeRate: number;
  lateNightRate: number;
  holidayRate: number;
  lateNightStartHour: number;
  lateNightEndHour: number;
  earlyOvertimeStandardHour: number;
  earlyLeaveStandardHour: number;
  defaultHourlyRate: number;
}

interface Staff {
  monthlySalary?: number;
  hourlyRate?: number;
  allowances?: Array<{ name: string; amount: number }>;
  deductions?: Array<{ name: string; amount: number }>;
}

interface Attendance {
  workHours: number;
}

// 給与計算を行う関数
export function calculatePayroll(
  staff: Staff,
  attendances: Attendance[],
  systemSettings: SystemSettings
): Record<string, unknown> {
  // 勤怠情報を集計
  let totalWorkHours = 0;
  const totalDays = attendances.length;

  for (const attendance of attendances) {
    totalWorkHours += Number(attendance.workHours) || 0;
  }

  let calculatedData: Record<string, unknown> = {};

  if (staff.monthlySalary) {
    // 月給計算
    const regularHours = systemSettings.regularHoursPerDay * totalDays;
    const overtimeHours = Math.max(0, totalWorkHours - regularHours);

    calculatedData = {
      baseSalary: staff.monthlySalary,
      workDays: totalDays,
      totalWorkHours: totalWorkHours,
      regularHours: regularHours,
      overtimeHours: overtimeHours,
      overtimePay: 0, // 月給の場合は残業代は別途計算が必要
      deductions: staff.deductions || [],
      allowances: staff.allowances || [],
      total: staff.monthlySalary,
    };
  } else if (staff.hourlyRate) {
    // 時給計算
    const hourlyRate = staff.hourlyRate;
    const regularHours = Math.min(totalWorkHours, systemSettings.regularHoursPerDay * totalDays);
    const overtimeHours = Math.max(0, totalWorkHours - regularHours);
    const basePay = regularHours * hourlyRate;
    const overtimePay = overtimeHours * hourlyRate * (1 + systemSettings.overtimeRate / 100);

    calculatedData = {
      hourlyRate: hourlyRate,
      workDays: totalDays,
      totalWorkHours: totalWorkHours,
      regularHours: regularHours,
      overtimeHours: overtimeHours,
      basePay: basePay,
      overtimePay: overtimePay,
      deductions: staff.deductions || [],
      allowances: staff.allowances || [],
      total: basePay + overtimePay,
    };
  } else {
    // 時給が設定されていない場合はシステム設定のデフォルト時給を使用
    const hourlyRate = systemSettings.defaultHourlyRate;
    const regularHours = Math.min(totalWorkHours, systemSettings.regularHoursPerDay * totalDays);
    const overtimeHours = Math.max(0, totalWorkHours - regularHours);
    const basePay = regularHours * hourlyRate;
    const overtimePay = overtimeHours * hourlyRate * (1 + systemSettings.overtimeRate / 100);

    calculatedData = {
      hourlyRate: hourlyRate,
      workDays: totalDays,
      totalWorkHours: totalWorkHours,
      regularHours: regularHours,
      overtimeHours: overtimeHours,
      basePay: basePay,
      overtimePay: overtimePay,
      deductions: staff.deductions || [],
      allowances: staff.allowances || [],
      total: basePay + overtimePay,
    };
  }

  // 手当と控除を合計に反映
  const allowancesTotal = (staff.allowances || []).reduce(
    (sum: number, item: { amount: number }) => sum + (item.amount || 0),
    0
  );
  const deductionsTotal = (staff.deductions || []).reduce(
    (sum: number, item: { amount: number }) => sum + (item.amount || 0),
    0
  );

  calculatedData.total = (calculatedData.total as number) + allowancesTotal - deductionsTotal;
  calculatedData.allowancesTotal = allowancesTotal;
  calculatedData.deductionsTotal = deductionsTotal;

  return calculatedData;
}

