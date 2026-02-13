import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { analyzeWorkTime } from "../work-analysis-utils.ts";

const defaultSystemSettings = {
  earlyOvertimeStandardHour: 7,
  earlyLeaveStandardHour: 17,
  overtimeStandardHour: 17,
  lateNightStartHour: 22,
  lateNightEndHour: 5,
};

Deno.test("analyzeWorkTime - 早出残業あり（6時開始）", () => {
  const result = analyzeWorkTime(
    { workStartTime: "06:00", workEndTime: "15:00", date: "2025-02-12" },
    defaultSystemSettings
  );
  assertEquals(result.earlyOvertime, true); // 6 < 7
  assertEquals(result.overtime, false); // 15<=17（退勤が残業基準時刻を超えない）
});

Deno.test("analyzeWorkTime - 早出残業なし（7時開始）", () => {
  const result = analyzeWorkTime(
    { workStartTime: "07:00", workEndTime: "16:00", date: "2025-02-12" },
    defaultSystemSettings
  );
  assertEquals(result.earlyOvertime, false);
});

Deno.test("analyzeWorkTime - 残業あり（9時開始18時終了）", () => {
  const result = analyzeWorkTime(
    { workStartTime: "09:00", workEndTime: "18:00", date: "2025-02-12" },
    defaultSystemSettings
  );
  assertEquals(result.overtime, true); // 18>17（退勤が残業基準時刻を超える）
  assertEquals(result.earlyLeave, false); // 18>=17（退勤が基準時刻を下回っていない）
});

Deno.test("analyzeWorkTime - 残業なし・早上がりなし（9時開始17時終了）", () => {
  const result = analyzeWorkTime(
    { workStartTime: "09:00", workEndTime: "17:00", date: "2025-02-12" },
    defaultSystemSettings
  );
  assertEquals(result.overtime, false); // 17<=17（退勤が残業基準時刻を超えない）
  assertEquals(result.earlyLeave, false); // 17>=17（退勤が基準時刻を下回っていない）
});

Deno.test("analyzeWorkTime - 残業あり・早上がりなし（12時開始18時終了）", () => {
  const result = analyzeWorkTime(
    { workStartTime: "12:00", workEndTime: "18:00", date: "2025-02-12" },
    defaultSystemSettings
  );
  assertEquals(result.earlyLeave, false); // 18>=17（退勤が基準時刻を下回っていない）
  assertEquals(result.overtime, true); // 18>17（退勤が残業基準時刻を超える）
});

Deno.test("analyzeWorkTime - 早上がりあり（9時開始16時終了）", () => {
  const result = analyzeWorkTime(
    { workStartTime: "09:00", workEndTime: "16:00", date: "2025-02-12" },
    defaultSystemSettings
  );
  assertEquals(result.earlyLeave, true); // 16<17（退勤が基準時刻を下回る）
  assertEquals(result.overtime, false);
});

Deno.test("analyzeWorkTime - earlyLeaveStandardHour:19 のケース", () => {
  const settings19 = { ...defaultSystemSettings, earlyLeaveStandardHour: 19 };
  assertEquals(
    analyzeWorkTime({ workStartTime: "09:00", workEndTime: "19:00", date: "2025-02-12" }, settings19).earlyLeave,
    false
  ); // 19:00 >= 19
  assertEquals(
    analyzeWorkTime({ workStartTime: "09:00", workEndTime: "18:30", date: "2025-02-12" }, settings19).earlyLeave,
    true
  ); // 18:30 < 19
  assertEquals(
    analyzeWorkTime({ workStartTime: "09:00", workEndTime: "19:30", date: "2025-02-12" }, settings19).earlyLeave,
    false
  ); // 19:30 >= 19
});

Deno.test("analyzeWorkTime - 深夜残業1時間（21時開始23時終了）", () => {
  const result = analyzeWorkTime(
    { workStartTime: "21:00", workEndTime: "23:00", date: "2025-02-12" },
    defaultSystemSettings
  );
  assertEquals(result.lateNightOvertimeHours, 1); // 22-23の1時間
});

Deno.test("analyzeWorkTime - 深夜残業4時間（21時開始翌2時終了）", () => {
  const result = analyzeWorkTime(
    { workStartTime: "21:00", workEndTime: "02:00", date: "2025-02-12" },
    defaultSystemSettings
  );
  assertEquals(result.lateNightOvertimeHours, 4); // 22:00-02:00
});

Deno.test("analyzeWorkTime - 深夜残業なし（9時開始17時終了）", () => {
  const result = analyzeWorkTime(
    { workStartTime: "09:00", workEndTime: "17:00", date: "2025-02-12" },
    defaultSystemSettings
  );
  assertEquals(result.lateNightOvertimeHours, 0);
});
