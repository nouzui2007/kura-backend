import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

interface BulkAttendanceRequest {
  date: string;
  attendanceList: BulkAttendanceItem[];
}

// エラーメッセージを文字列として取得する関数
function getErrorMessage(error: unknown): string {
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    // Extract ID or date from path if present (e.g., /attendance/{id} or /attendance/{date} or /attendance/bulk)
    const pathParts = path.split("/");
    const pathValue = pathParts.length > 2 ? pathParts[2] : null;
    const isBulk = pathValue === "bulk";

    // UUID形式かどうかを判定する関数
    const isUUID = (str: string): boolean => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return uuidRegex.test(str);
    };

    // 日付形式かどうかを判定する関数
    const isDate = (str: string): boolean => {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(str)) return false;
      const date = new Date(str);
      return !isNaN(date.getTime());
    };

    // Handle different HTTP methods
    switch (method) {
      case "GET":
        // 一覧取得 or 単一取得 or 日付指定取得
        if (pathValue) {
          // UUIDの場合は単一取得
          if (isUUID(pathValue)) {
            const { data, error } = await supabaseClient
              .from("attendance")
              .select("*")
              .eq("id", pathValue)
              .single();

            if (error) {
              return new Response(
                JSON.stringify({
                  error: getErrorMessage(error),
                }),
                {
                  headers: { ...corsHeaders, "Content-Type": "application/json" },
                  status: 400,
                }
              );
            }

            return new Response(
              JSON.stringify(data),
              {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
              }
            );
          }
          // 日付形式の場合は日付で検索
          else if (isDate(pathValue)) {
            try {
              const { data, error } = await supabaseClient
                .from("attendance")
                .select("*")
                .eq("date", pathValue)
                .order("startTime", { ascending: false });

              if (error) {
                return new Response(
                  JSON.stringify({
                    success: false,
                    error: getErrorMessage(error),
                  }),
                  {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                    status: 200,
                  }
                );
              }

              return new Response(
                JSON.stringify({
                  success: true,
                  data: data || [],
                }),
                {
                  headers: { ...corsHeaders, "Content-Type": "application/json" },
                  status: 200,
                }
              );
            } catch (error) {
              return new Response(
                JSON.stringify({
                  success: false,
                  error: getErrorMessage(error),
                }),
                {
                  headers: { ...corsHeaders, "Content-Type": "application/json" },
                  status: 200,
                }
              );
            }
          }
          // どちらでもない場合はエラー
          else {
            return new Response(
              JSON.stringify({
                success: false,
                error: "無効なIDまたは日付形式です。IDはUUID形式、日付はYYYY-MM-DD形式で指定してください。",
              }),
              {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
              }
            );
          }
        } else {
          // 一覧取得（クエリパラメータでstaffIdやdateでフィルタリング可能）
          try {
            const staffId = url.searchParams.get("staffId");
            const date = url.searchParams.get("date");

            let query = supabaseClient
              .from("attendance")
              .select("*")
              .order("date", { ascending: false })
              .order("startTime", { ascending: false });

            if (staffId) {
              query = query.eq("staffId", staffId);
            }

            if (date) {
              query = query.eq("date", date);
            }

            const { data, error } = await query;

            if (error) {
              return new Response(
                JSON.stringify({
                  success: false,
                  error: getErrorMessage(error),
                }),
                {
                  headers: { ...corsHeaders, "Content-Type": "application/json" },
                  status: 200,
                }
              );
            }

            return new Response(
              JSON.stringify({
                success: true,
                data: data || [],
              }),
              {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
              }
            );
          } catch (error) {
            return new Response(
              JSON.stringify({
                success: false,
                error: getErrorMessage(error),
              }),
              {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
              }
            );
          }
        }

      case "POST": {
        // 一括保存の処理
        if (isBulk) {
          try {
            const body: BulkAttendanceRequest = await req.json();
            const { date, attendanceList } = body;

            // バリデーション
            if (!date || !Array.isArray(attendanceList)) {
              return new Response(
                JSON.stringify({
                  success: false,
                  error: "date and attendanceList array are required",
                }),
                {
                  headers: { ...corsHeaders, "Content-Type": "application/json" },
                  status: 400,
                }
              );
            }

            // attendanceListが空の場合は成功を返す
            if (attendanceList.length === 0) {
              return new Response(
                JSON.stringify({
                  success: true,
                }),
                {
                  headers: { ...corsHeaders, "Content-Type": "application/json" },
                  status: 200,
                }
              );
            }

            // 各attendanceレコードを準備
            const attendanceRecords: Omit<Attendance, "id">[] = attendanceList.map((item: BulkAttendanceItem) => ({
              date: date,
              staffId: item.staffId,
              startTime: item.startTime || "00:00:00",
              endTime: item.endTime || "00:00:00",
              workHours: item.workHours || 0,
            }));

            // 必須フィールドのバリデーション
            for (const record of attendanceRecords) {
              if (!record.staffId) {
                return new Response(
                  JSON.stringify({
                    success: false,
                    error: "attendanceList内の各レコードにstaffIdが必要です",
                  }),
                  {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                    status: 400,
                  }
                );
              }
            }

            // 一括保存
            const { data: insertData, error: insertError } = await supabaseClient
              .from("attendance")
              .insert(attendanceRecords)
              .select();

            if (insertError) {
              return new Response(
                JSON.stringify({
                  success: false,
                  error: getErrorMessage(insertError),
                }),
                {
                  headers: { ...corsHeaders, "Content-Type": "application/json" },
                  status: 200,
                }
              );
            }

            return new Response(
              JSON.stringify({
                success: true,
                data: insertData,
              }),
              {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
              }
            );
          } catch (error) {
            return new Response(
              JSON.stringify({
                success: false,
                error: getErrorMessage(error),
              }),
              {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 500,
              }
            );
          }
        }

        // 通常の登録
        const newAttendance: Attendance = await req.json();

        // バリデーション
        if (
          !newAttendance.date ||
          !newAttendance.startTime ||
          !newAttendance.endTime ||
          !newAttendance.staffId ||
          newAttendance.workHours === undefined
        ) {
          return new Response(
            JSON.stringify({
              error:
                "必須フィールドが不足しています: date, startTime, endTime, staffId, workHours",
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            }
          );
        }

        // staffIdが存在するか確認
        const { data: staffData, error: staffError } = await supabaseClient
          .from("staff")
          .select("id")
          .eq("id", newAttendance.staffId)
          .single();

        if (staffError || !staffData) {
          return new Response(
            JSON.stringify({ error: "指定されたstaffIdが存在しません" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            }
          );
        }

        const { data: insertData, error: insertError } = await supabaseClient
          .from("attendance")
          .insert(newAttendance)
          .select()
          .single();

        if (insertError) {
          return new Response(
            JSON.stringify({
              error: getErrorMessage(insertError),
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            }
          );
        }

        return new Response(
          JSON.stringify(insertData),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 201,
          }
        );
      }

      case "PATCH": {
        // 更新
        if (!pathValue || !isUUID(pathValue)) {
          return new Response(
            JSON.stringify({ error: "有効なID（UUID形式）が必要です" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            }
          );
        }

        const updateData: Partial<Attendance> = await req.json();

        // staffIdが更新される場合、存在確認
        if (updateData.staffId) {
          const { data: staffData, error: staffError } = await supabaseClient
            .from("staff")
            .select("id")
            .eq("id", updateData.staffId)
            .single();

          if (staffError || !staffData) {
            return new Response(
              JSON.stringify({ error: "指定されたstaffIdが存在しません" }),
              {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
              }
            );
          }
        }

        const { data: patchData, error: patchError } = await supabaseClient
          .from("attendance")
          .update(updateData)
          .eq("id", pathValue)
          .select()
          .single();

        if (patchError) {
          return new Response(
            JSON.stringify({
              error: getErrorMessage(patchError),
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            }
          );
        }

        if (!patchData) {
          return new Response(
            JSON.stringify({ error: "出勤記録が見つかりません" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 404,
            }
          );
        }

        return new Response(
          JSON.stringify(patchData),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }

      case "DELETE": {
        // 削除
        if (!pathValue || !isUUID(pathValue)) {
          return new Response(
            JSON.stringify({ error: "有効なID（UUID形式）が必要です" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            }
          );
        }

        const { error: deleteError } = await supabaseClient
          .from("attendance")
          .delete()
          .eq("id", pathValue);

        if (deleteError) {
          return new Response(
            JSON.stringify({
              error: getErrorMessage(deleteError),
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            }
          );
        }

        return new Response(
          JSON.stringify({ message: "削除されました", id: pathValue }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }

      default: {
        return new Response(
          JSON.stringify({ error: "サポートされていないHTTPメソッドです" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 405,
          }
        );
      }
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: getErrorMessage(error) }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

