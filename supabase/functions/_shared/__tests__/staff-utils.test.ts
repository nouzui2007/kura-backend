import { assertEquals, assertThrows } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { normalizeDateFields, generateStaffId } from "../staff-utils.ts";

Deno.test("normalizeDateFields - Empty string to undefined", () => {
  const staff = {
    name: "Test",
    employeeId: "EMP001",
    hireDate: "",
    birthDate: "",
    retireDate: "",
  };
  const result = normalizeDateFields(staff);
  assertEquals(result.hireDate, undefined);
  assertEquals(result.birthDate, undefined);
  assertEquals(result.retireDate, undefined);
});

Deno.test("normalizeDateFields - Null to undefined", () => {
  const staff = {
    name: "Test",
    employeeId: "EMP001",
    hireDate: undefined,
    birthDate: undefined,
  };
  const result = normalizeDateFields(staff);
  assertEquals(result.hireDate, undefined);
  assertEquals(result.birthDate, undefined);
});

Deno.test("normalizeDateFields - Valid date strings", () => {
  const staff = {
    name: "Test",
    employeeId: "EMP001",
    hireDate: "2020-04-01",
    birthDate: "1985-04-15",
    retireDate: "2025-12-31",
  };
  const result = normalizeDateFields(staff);
  assertEquals(result.hireDate, "2020-04-01");
  assertEquals(result.birthDate, "1985-04-15");
  assertEquals(result.retireDate, "2025-12-31");
});

Deno.test("normalizeDateFields - Invalid date format", () => {
  const staff = {
    name: "Test",
    employeeId: "EMP001",
    hireDate: "2020/04/01",
  };
  assertThrows(
    () => normalizeDateFields(staff),
    Error,
    "hireDateの形式が正しくありません。YYYY-MM-DD形式で指定してください。"
  );
});

Deno.test("normalizeDateFields - Invalid date value", () => {
  const staff = {
    name: "Test",
    employeeId: "EMP001",
    hireDate: "2025-13-01", // 13月は存在しない
  };
  assertThrows(
    () => normalizeDateFields(staff),
    Error,
    "hireDateが無効な日付です。"
  );
});

Deno.test("normalizeDateFields - Mixed valid and empty", () => {
  const staff = {
    name: "Test",
    employeeId: "EMP001",
    hireDate: "2020-04-01",
    birthDate: "",
    retireDate: undefined,
  };
  const result = normalizeDateFields(staff);
  assertEquals(result.hireDate, "2020-04-01");
  assertEquals(result.birthDate, undefined);
  assertEquals(result.retireDate, undefined);
});

Deno.test("normalizeDateFields - No date fields", () => {
  const staff = {
    name: "Test",
    employeeId: "EMP001",
  };
  const result = normalizeDateFields(staff as { hireDate?: string; birthDate?: string; retireDate?: string });
  // 日付フィールドがない場合でも、元のオブジェクトのプロパティは保持される
  assertEquals((result as typeof staff).name, "Test");
  assertEquals((result as typeof staff).employeeId, "EMP001");
});

Deno.test("generateStaffId - Generates valid format", () => {
  const id = generateStaffId();
  assertEquals(id.startsWith("staff_"), true);
  assertEquals(id.length, 14); // "staff_" (6) + 8 characters = 14
  assertEquals(/^staff_[0-9a-f]{8}$/i.test(id), true);
});

Deno.test("generateStaffId - Generates unique IDs", () => {
  const id1 = generateStaffId();
  const id2 = generateStaffId();
  // UUIDベースなので、異なるIDが生成される（非常に低い確率で同じになる可能性はあるが、実用的には無視できる）
  assertEquals(id1 !== id2, true);
});

