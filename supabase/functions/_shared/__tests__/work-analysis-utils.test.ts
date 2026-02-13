import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { analyzeWorkTime } from "../work-analysis-utils.ts";

const defaultSystemSettings = {
  regularHoursPerDay: 8,
  earlyOvertimeStandardHour: 7,
  earlyLeaveStandardHour: 17,
  lateNightStartHour: 22,
  lateNightEndHour: 5,
};

Deno.test("analyzeWorkTime - 早出残業あり（6時開始）", () => {
  const result = analyzeWorkTime(
    { workStartTime: "06:00", workEndTime: "15:00", date: "2025-02-12" },
    defaultSystemSettings
  );
  assertEquals(result.earlyOvertime, true); // 6 < 7
  assertEquals(result.overtime, true); // 6+8=14, 15>14で残業あり
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
  assertEquals(result.overtime, true); // 9+8=17, 18>17
  assertEquals(result.earlyLeave, true); // 18>17（退勤が基準時刻を上回る）
});

Deno.test("analyzeWorkTime - 残業なし（9時開始17時終了）", () => {
  const result = analyzeWorkTime(
    { workStartTime: "09:00", workEndTime: "17:00", date: "2025-02-12" },
    defaultSystemSettings
  );
  assertEquals(result.overtime, false); // 9+8=17, 17>=17 で残業なし
  assertEquals(result.earlyLeave, false);
});

Deno.test("analyzeWorkTime - 早上がりあり（12時開始18時終了）", () => {
  const result = analyzeWorkTime(
    { workStartTime: "12:00", workEndTime: "18:00", date: "2025-02-12" },
    defaultSystemSettings
  );
  assertEquals(result.earlyLeave, true); // 18>17（退勤が基準時刻を上回る）
  assertEquals(result.overtime, false); // 12+8=20, 18<20
});

Deno.test("analyzeWorkTime - 早上がりなし（9時開始16時終了）", () => {
  const result = analyzeWorkTime(
    { workStartTime: "09:00", workEndTime: "16:00", date: "2025-02-12" },
    defaultSystemSettings
  );
  assertEquals(result.earlyLeave, false); // 16<=17（退勤が基準時刻を上回らない）
  assertEquals(result.overtime, false);
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
