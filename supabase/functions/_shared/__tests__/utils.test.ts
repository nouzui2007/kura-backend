import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { getErrorMessage, isUUID, isDate, isMonth } from "../utils.ts";

Deno.test("getErrorMessage - Error instance", () => {
  const error = new Error("Test error message");
  assertEquals(getErrorMessage(error), "Test error message");
});

Deno.test("getErrorMessage - Supabase error object with message", () => {
  const error = { message: "Database error", code: "PGRST116" };
  assertEquals(getErrorMessage(error), "Database error");
});

Deno.test("getErrorMessage - Supabase error object with details", () => {
  const error = { details: "Detailed error information" };
  assertEquals(getErrorMessage(error), "Detailed error information");
});

Deno.test("getErrorMessage - Supabase error object with hint", () => {
  const error = { hint: "Hint message" };
  assertEquals(getErrorMessage(error), "Hint message");
});

Deno.test("getErrorMessage - Plain object", () => {
  const error = { code: "ERROR", data: { key: "value" } };
  const result = getErrorMessage(error);
  assertEquals(typeof result, "string");
  assertEquals(result.includes("ERROR") || result.includes("key"), true);
});

Deno.test("getErrorMessage - String", () => {
  assertEquals(getErrorMessage("Simple string error"), "Simple string error");
});

Deno.test("getErrorMessage - Number", () => {
  assertEquals(getErrorMessage(404), "404");
});

Deno.test("getErrorMessage - Null", () => {
  assertEquals(getErrorMessage(null), "null");
});

Deno.test("isUUID - Valid UUID", () => {
  assertEquals(isUUID("550e8400-e29b-41d4-a716-446655440000"), true);
  assertEquals(isUUID("550E8400-E29B-41D4-A716-446655440000"), true);
});

Deno.test("isUUID - Invalid UUID", () => {
  assertEquals(isUUID("not-a-uuid"), false);
  assertEquals(isUUID("550e8400-e29b-41d4-a716"), false);
  assertEquals(isUUID("staff_001"), false);
  assertEquals(isUUID("2025-01-01"), false);
});

Deno.test("isDate - Valid date", () => {
  assertEquals(isDate("2025-01-01"), true);
  assertEquals(isDate("2025-12-31"), true);
  assertEquals(isDate("2024-02-29"), true); // うるう年
});

Deno.test("isDate - Invalid date format", () => {
  assertEquals(isDate("2025/01/01"), false);
  assertEquals(isDate("01-01-2025"), false);
  assertEquals(isDate("2025-1-1"), false);
  assertEquals(isDate("not-a-date"), false);
});

Deno.test("isDate - Invalid date value", () => {
  assertEquals(isDate("2025-13-01"), false); // 13月は存在しない
  assertEquals(isDate("2025-02-30"), false); // 2月30日は存在しない
  assertEquals(isDate("2025-04-31"), false); // 4月31日は存在しない
});

Deno.test("isMonth - Valid month", () => {
  assertEquals(isMonth("2025-01"), true);
  assertEquals(isMonth("2025-12"), true);
  assertEquals(isMonth("2024-02"), true);
});

Deno.test("isMonth - Invalid month format", () => {
  assertEquals(isMonth("2025/01"), false);
  assertEquals(isMonth("01-2025"), false);
  assertEquals(isMonth("2025-1"), false);
  assertEquals(isMonth("2025-001"), false);
  assertEquals(isMonth("not-a-month"), false);
});

Deno.test("isMonth - Invalid month value", () => {
  assertEquals(isMonth("2025-13"), false); // 13月は存在しない
  assertEquals(isMonth("2025-00"), false); // 0月は存在しない
});

