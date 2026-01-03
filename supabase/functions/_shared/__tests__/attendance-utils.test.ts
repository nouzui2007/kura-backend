import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  validateBulkAttendanceRequest,
  convertBulkItemToAttendance,
  convertBulkAttendanceList,
  validateAttendance,
} from "../attendance-utils.ts";

Deno.test("validateBulkAttendanceRequest - Valid request", () => {
  const result = validateBulkAttendanceRequest("2025-01-01", [
    { staffId: "staff_001" },
  ]);
  assertEquals(result.valid, true);
  assertEquals(result.error, undefined);
});

Deno.test("validateBulkAttendanceRequest - Empty attendanceList", () => {
  const result = validateBulkAttendanceRequest("2025-01-01", []);
  assertEquals(result.valid, true);
});

Deno.test("validateBulkAttendanceRequest - Missing date", () => {
  const result = validateBulkAttendanceRequest(null, []);
  assertEquals(result.valid, false);
  assertEquals(result.error?.includes("date"), true);
});

Deno.test("validateBulkAttendanceRequest - Invalid date type", () => {
  const result = validateBulkAttendanceRequest(123, []);
  assertEquals(result.valid, false);
  assertEquals(result.error?.includes("date"), true);
});

Deno.test("validateBulkAttendanceRequest - Missing attendanceList", () => {
  const result = validateBulkAttendanceRequest("2025-01-01", null);
  assertEquals(result.valid, false);
  assertEquals(result.error?.includes("array"), true);
});

Deno.test("validateBulkAttendanceRequest - Invalid attendanceList type", () => {
  const result = validateBulkAttendanceRequest("2025-01-01", "not-an-array");
  assertEquals(result.valid, false);
  assertEquals(result.error?.includes("array"), true);
});

Deno.test("validateBulkAttendanceRequest - Missing staffId in item", () => {
  const result = validateBulkAttendanceRequest("2025-01-01", [
    { startTime: "09:00" },
  ]);
  assertEquals(result.valid, false);
  assertEquals(result.error?.includes("staffId"), true);
});

Deno.test("validateBulkAttendanceRequest - Invalid item type", () => {
  const result = validateBulkAttendanceRequest("2025-01-01", ["not-an-object"]);
  assertEquals(result.valid, false);
  assertEquals(result.error?.includes("object"), true);
});

Deno.test("validateBulkAttendanceRequest - Multiple items with one invalid", () => {
  const result = validateBulkAttendanceRequest("2025-01-01", [
    { staffId: "staff_001" },
    { startTime: "09:00" }, // staffId missing
  ]);
  assertEquals(result.valid, false);
  assertEquals(result.error?.includes("staffId"), true);
});

Deno.test("convertBulkItemToAttendance - With all fields", () => {
  const item = {
    staffId: "staff_001",
    startTime: "09:00:00",
    endTime: "18:00:00",
    workHours: 8,
  };
  const result = convertBulkItemToAttendance(item, "2025-01-01");

  assertEquals(result.date, "2025-01-01");
  assertEquals(result.staffId, "staff_001");
  assertEquals(result.startTime, "09:00:00");
  assertEquals(result.endTime, "18:00:00");
  assertEquals(result.workHours, 8);
});

Deno.test("convertBulkItemToAttendance - With default values", () => {
  const item = {
    staffId: "staff_001",
  };
  const result = convertBulkItemToAttendance(item, "2025-01-01");

  assertEquals(result.date, "2025-01-01");
  assertEquals(result.staffId, "staff_001");
  assertEquals(result.startTime, "00:00:00");
  assertEquals(result.endTime, "00:00:00");
  assertEquals(result.workHours, 0);
});

Deno.test("convertBulkItemToAttendance - Partial fields", () => {
  const item = {
    staffId: "staff_001",
    startTime: "09:00:00",
    // endTime and workHours missing
  };
  const result = convertBulkItemToAttendance(item, "2025-01-01");

  assertEquals(result.startTime, "09:00:00");
  assertEquals(result.endTime, "00:00:00"); // default
  assertEquals(result.workHours, 0); // default
});

Deno.test("convertBulkAttendanceList - Multiple items", () => {
  const attendanceList = [
    { staffId: "staff_001", startTime: "09:00:00", workHours: 8 },
    { staffId: "staff_002", endTime: "18:00:00" },
    { staffId: "staff_003" },
  ];
  const result = convertBulkAttendanceList(attendanceList, "2025-01-01");

  assertEquals(result.length, 3);
  assertEquals(result[0].staffId, "staff_001");
  assertEquals(result[0].startTime, "09:00:00");
  assertEquals(result[0].workHours, 8);
  assertEquals(result[1].staffId, "staff_002");
  assertEquals(result[1].endTime, "18:00:00");
  assertEquals(result[1].startTime, "00:00:00"); // default
  assertEquals(result[2].staffId, "staff_003");
  assertEquals(result[2].workHours, 0); // default
});

Deno.test("convertBulkAttendanceList - Empty list", () => {
  const result = convertBulkAttendanceList([], "2025-01-01");
  assertEquals(result.length, 0);
});

Deno.test("validateAttendance - Valid attendance", () => {
  const attendance = {
    date: "2025-01-01",
    startTime: "09:00:00",
    endTime: "18:00:00",
    staffId: "staff_001",
    workHours: 8,
  };
  const result = validateAttendance(attendance);
  assertEquals(result.valid, true);
  assertEquals(result.error, undefined);
});

Deno.test("validateAttendance - Missing date", () => {
  const attendance = {
    startTime: "09:00:00",
    endTime: "18:00:00",
    staffId: "staff_001",
    workHours: 8,
  };
  const result = validateAttendance(attendance);
  assertEquals(result.valid, false);
  assertEquals(result.error?.includes("date"), true);
});

Deno.test("validateAttendance - Missing startTime", () => {
  const attendance = {
    date: "2025-01-01",
    endTime: "18:00:00",
    staffId: "staff_001",
    workHours: 8,
  };
  const result = validateAttendance(attendance);
  assertEquals(result.valid, false);
  assertEquals(result.error?.includes("startTime"), true);
});

Deno.test("validateAttendance - Missing endTime", () => {
  const attendance = {
    date: "2025-01-01",
    startTime: "09:00:00",
    staffId: "staff_001",
    workHours: 8,
  };
  const result = validateAttendance(attendance);
  assertEquals(result.valid, false);
  assertEquals(result.error?.includes("endTime"), true);
});

Deno.test("validateAttendance - Missing staffId", () => {
  const attendance = {
    date: "2025-01-01",
    startTime: "09:00:00",
    endTime: "18:00:00",
    workHours: 8,
  };
  const result = validateAttendance(attendance);
  assertEquals(result.valid, false);
  assertEquals(result.error?.includes("staffId"), true);
});

Deno.test("validateAttendance - Missing workHours", () => {
  const attendance = {
    date: "2025-01-01",
    startTime: "09:00:00",
    endTime: "18:00:00",
    staffId: "staff_001",
  };
  const result = validateAttendance(attendance);
  assertEquals(result.valid, false);
  assertEquals(result.error?.includes("workHours"), true);
});

Deno.test("validateAttendance - Invalid workHours type", () => {
  const attendance = {
    date: "2025-01-01",
    startTime: "09:00:00",
    endTime: "18:00:00",
    staffId: "staff_001",
    workHours: "8" as unknown as number, // string instead of number (type cast for testing)
  };
  const result = validateAttendance(attendance);
  assertEquals(result.valid, false);
  assertEquals(result.error?.includes("workHours"), true);
});

Deno.test("validateAttendance - workHours is 0 (valid)", () => {
  const attendance = {
    date: "2025-01-01",
    startTime: "09:00:00",
    endTime: "18:00:00",
    staffId: "staff_001",
    workHours: 0,
  };
  const result = validateAttendance(attendance);
  assertEquals(result.valid, true);
});

