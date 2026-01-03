interface Staff {
  id?: string;
  name: string;
  email?: string;
  hireDate?: string;
  birthDate?: string;
  retireDate?: string;
  [key: string]: unknown;
}

// 日付フィールドを正規化する関数（空文字列をnullに変換、日付形式を検証）
export function normalizeDateFields<T extends { hireDate?: string; birthDate?: string; retireDate?: string }>(
  staff: T
): T {
  const normalized = { ...staff };
  
  // 日付フィールドのリスト
  const dateFields = ['hireDate', 'birthDate', 'retireDate'] as const;
  
  for (const field of dateFields) {
    const value = normalized[field];
    if (value === '' || value === null || value === undefined) {
      // 空文字列、null、undefinedの場合はundefinedに設定（PostgreSQLではNULLとして扱われる）
      delete normalized[field];
    } else if (typeof value === 'string') {
      // 日付形式の検証（YYYY-MM-DD形式）
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(value)) {
        throw new Error(`${field}の形式が正しくありません。YYYY-MM-DD形式で指定してください。`);
      }
      // 有効な日付かチェック
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new Error(`${field}が無効な日付です。`);
      }
    }
  }
  
  return normalized;
}

// スタッフIDを自動生成する関数
export function generateStaffId(): string {
  const uuid = crypto.randomUUID();
  // UUIDの最初の8文字を使用してstaff_プレフィックスを付ける
  return `staff_${uuid.substring(0, 8)}`;
}

