// エラーメッセージを文字列として取得する関数
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'object' && error !== null) {
    // Supabaseのエラーオブジェクトの場合
    const err = error as Record<string, unknown>;
    if (err.message && typeof err.message === 'string') {
      return err.message;
    }
    if (err.details && typeof err.details === 'string') {
      return err.details;
    }
    if (err.hint && typeof err.hint === 'string') {
      return err.hint;
    }
    // オブジェクトの場合はJSON文字列化を試みる
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }
  return String(error);
}

// UUID形式かどうかを判定する関数
export function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// 日付形式かどうかを判定する関数
export function isDate(str: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(str)) return false;
  
  // 年月日の値を抽出
  const parts = str.split("-");
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  
  // 月が1-12の範囲内かチェック
  if (month < 1 || month > 12) return false;
  
  // 日付オブジェクトを作成して検証
  const date = new Date(year, month - 1, day);
  
  // 元の年月日と一致するかチェック（自動補正を検出）
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return false;
  }
  
  return !isNaN(date.getTime());
}

// 月の形式かどうかを判定する関数
export function isMonth(str: string): boolean {
  const monthRegex = /^\d{4}-\d{2}$/;
  if (!monthRegex.test(str)) return false;
  
  // 年月の値を抽出
  const parts = str.split("-");
  const month = parseInt(parts[1], 10);
  
  // 月が1-12の範囲内かチェック
  return month >= 1 && month <= 12;
}

