interface Attendance {
  id?: string;
  date: string;
  startTime: string;
  endTime: string;
  staffId: string;
  workHours: number;
}

interface BulkAttendanceItem {
  staffId: string;
  startTime?: string;
  endTime?: string;
  workHours?: number;
}

// 一括出勤記録のバリデーション
export function validateBulkAttendanceRequest(
  date: unknown,
  attendanceList: unknown
): { valid: boolean; error?: string } {
  if (!date || typeof date !== 'string') {
    return { valid: false, error: "date is required and must be a string" };
  }

  if (!Array.isArray(attendanceList)) {
    return { valid: false, error: "attendanceList must be an array" };
  }

  if (attendanceList.length === 0) {
    return { valid: true }; // 空の配列は許可
  }

  // 各アイテムのバリデーション
  for (let i = 0; i < attendanceList.length; i++) {
    const item = attendanceList[i];
    if (!item || typeof item !== 'object') {
      return { valid: false, error: `attendanceList[${i}] must be an object` };
    }

    const bulkItem = item as BulkAttendanceItem;
    if (!bulkItem.staffId || typeof bulkItem.staffId !== 'string') {
      return { valid: false, error: `attendanceList[${i}].staffId is required` };
    }
  }

  return { valid: true };
}

// BulkAttendanceItemをAttendanceレコードに変換
export function convertBulkItemToAttendance(
  item: BulkAttendanceItem,
  date: string
): Omit<Attendance, "id"> {
  return {
    date: date,
    staffId: item.staffId,
    startTime: item.startTime || "00:00:00",
    endTime: item.endTime || "00:00:00",
    workHours: item.workHours || 0,
  };
}

// 一括出勤記録リストをAttendanceレコード配列に変換
export function convertBulkAttendanceList(
  attendanceList: BulkAttendanceItem[],
  date: string
): Omit<Attendance, "id">[] {
  return attendanceList.map((item) => convertBulkItemToAttendance(item, date));
}

// 単一出勤記録のバリデーション
export function validateAttendance(attendance: Partial<Attendance>): {
  valid: boolean;
  error?: string;
} {
  if (!attendance.date || typeof attendance.date !== 'string') {
    return { valid: false, error: "date is required" };
  }

  if (!attendance.startTime || typeof attendance.startTime !== 'string') {
    return { valid: false, error: "startTime is required" };
  }

  if (!attendance.endTime || typeof attendance.endTime !== 'string') {
    return { valid: false, error: "endTime is required" };
  }

  if (!attendance.staffId || typeof attendance.staffId !== 'string') {
    return { valid: false, error: "staffId is required" };
  }

  if (attendance.workHours === undefined || typeof attendance.workHours !== 'number') {
    return { valid: false, error: "workHours is required and must be a number" };
  }

  return { valid: true };
}

