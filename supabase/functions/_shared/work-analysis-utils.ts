/**
 * 勤務時間分析の計算ロジック
 * - 早出残業: 勤務開始が早出残業基準時刻より前
 * - 残業: 法定終了時刻より後に勤務終了
 * - 早上がり: 退勤時間が早上がり手当基準時刻を上回っている場合
 * - 深夜残業時間: 勤務終了が深夜開始時刻を超えた場合の重複時間
 */

export interface SystemSettingsForWorkAnalysis {
  regularHoursPerDay: number;
  earlyOvertimeStandardHour: number;
  earlyLeaveStandardHour: number;
  lateNightStartHour: number;
  lateNightEndHour: number;
}

export interface WorkAnalysisInput {
  workStartTime: string; // "HH:mm" or "HH:mm:ss"
  workEndTime: string;   // "HH:mm" or "HH:mm:ss"
  date: string;          // "YYYY-MM-DD"（跨日判定に使用）
}

export interface WorkAnalysisResult {
  earlyOvertime: boolean;      // 早出残業あり
  overtime: boolean;           // 残業あり
  earlyLeave: boolean;          // 早上がり
  lateNightOvertimeHours: number; // 深夜残業時間（時間）
}

/** 時刻文字列を「0時からの分数」に変換 */
function timeToMinutes(timeStr: string): number {
  const parts = timeStr.trim().split(/:|\./);
  const hours = parseInt(parts[0] || "0", 10);
  const minutes = parseInt(parts[1] || "0", 10);
  const seconds = parseInt(parts[2] || "0", 10) / 60;
  return hours * 60 + minutes + seconds;
}

/** 勤務時間を分析 */
export function analyzeWorkTime(
  input: WorkAnalysisInput,
  systemSettings: SystemSettingsForWorkAnalysis
): WorkAnalysisResult {
  const startMinutes = timeToMinutes(input.workStartTime);
  const endMinutes = timeToMinutes(input.workEndTime);

  // 跨日の場合: 終了時刻が開始時刻より前なら翌日とする
  const effectiveEndMinutes = endMinutes < startMinutes
    ? endMinutes + 24 * 60  // 翌日
    : endMinutes;

  const startHourDecimal = startMinutes / 60;

  // 1. 早出残業: 勤務開始時刻が早出残業基準時刻より前
  const earlyOvertime = startHourDecimal < systemSettings.earlyOvertimeStandardHour;

  // 2. 法定終了時刻 = 勤務開始 + 法定労働時間
  const regularEndMinutes = startMinutes + systemSettings.regularHoursPerDay * 60;

  // 3. 残業: 勤務終了 > 法定終了
  const overtime = effectiveEndMinutes > regularEndMinutes;

  // 4. 早上がり: 退勤時間が早上がり手当基準時刻を上回っていたら true
  const endHourDecimal = effectiveEndMinutes / 60;
  const earlyLeave = endHourDecimal > systemSettings.earlyLeaveStandardHour;

  // 5. 深夜残業時間: 勤務終了が深夜開始時刻を超えた場合、勤務時間と深夜帯の重複時間
  const lateNightStartMinutes = systemSettings.lateNightStartHour * 60;
  // 深夜終了が翌朝（例: 5時）の場合は 24*60 + lateNightEndHour*60
  const lateNightEndMinutes = systemSettings.lateNightEndHour <= systemSettings.lateNightStartHour
    ? (24 + systemSettings.lateNightEndHour) * 60
    : systemSettings.lateNightEndHour * 60;

  const overlapStart = Math.max(startMinutes, lateNightStartMinutes);
  const overlapEnd = Math.min(effectiveEndMinutes, lateNightEndMinutes);
  const lateNightOvertimeMinutes = Math.max(0, overlapEnd - overlapStart);

  return {
    earlyOvertime,
    overtime,
    earlyLeave,
    lateNightOvertimeHours: Math.round(lateNightOvertimeMinutes / 60 * 100) / 100,
  };
}
