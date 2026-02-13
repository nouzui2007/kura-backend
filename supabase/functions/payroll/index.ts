import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getErrorMessage, isUUID, isMonth } from "../_shared/utils.ts";
import { calculatePayroll } from "../_shared/payroll-utils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Payroll {
  id?: string;
  month: string;
  staffId: string;
  data?: Record<string, unknown>;
}

interface SystemSettings {
  regularHoursPerDay: number;
  defaultBreakMinutes: number;
  breakMinutesFor6Hours: number;
  breakMinutesFor8Hours: number;
  overtimeThreshold: number;
  overtimeRate: number;
  excessOvertimeRate: number;
  lateNightRate: number;
  holidayRate: number;
  lateNightStartHour: number;
  lateNightEndHour: number;
  earlyOvertimeStandardHour: number;
  earlyLeaveStandardHour: number;
  overtimeStandardHour: number;
  defaultHourlyRate: number;
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

    // Extract month, id, or action from path (e.g., /payroll/2025-01, /payroll/{id}, /payroll/calculate)
    const pathParts = path.split("/");
    const pathValue = pathParts.length > 2 ? pathParts[2] : null;
    const isCalculate = pathValue === "calculate";


    // Handle different HTTP methods
    switch (method) {
      case "GET": {
        // 月次給与データを取得
        if (!pathValue) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "月（YYYY-MM形式）が必要です",
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            }
          );
        }

        // 月の形式を検証（YYYY-MM）
        if (!isMonth(pathValue)) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "月の形式が正しくありません。YYYY-MM形式で指定してください。",
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            }
          );
        }

        try {
          const { data, error } = await supabaseClient
            .from("payroll")
            .select("*")
            .eq("month", pathValue)
            .order("created_at", { ascending: false });

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
              status: 500,
            }
          );
        }
      }

      case "POST": {
        // 給与計算
        if (isCalculate) {
          try {
            const body: { "target-month": string } = await req.json();
            const targetMonth = body["target-month"];

            // バリデーション
            if (!targetMonth) {
              return new Response(
                JSON.stringify({
                  success: false,
                  error: "target-monthが必要です",
                }),
                {
                  headers: { ...corsHeaders, "Content-Type": "application/json" },
                  status: 400,
                }
              );
            }

            // 月の形式を検証
            if (!isMonth(targetMonth)) {
              return new Response(
                JSON.stringify({
                  success: false,
                  error: "月の形式が正しくありません。YYYY-MM形式で指定してください。",
                }),
                {
                  headers: { ...corsHeaders, "Content-Type": "application/json" },
                  status: 400,
                }
              );
            }

            // 1. payrollテーブルから指定年月のレコードを削除
            const { error: deleteError } = await supabaseClient
              .from("payroll")
              .delete()
              .eq("month", targetMonth);

            if (deleteError) {
              return new Response(
                JSON.stringify({
                  success: false,
                  error: getErrorMessage(deleteError),
                }),
                {
                  headers: { ...corsHeaders, "Content-Type": "application/json" },
                  status: 200,
                }
              );
            }

            // 2. target-monthの1日から月末までの期間のattendanceテーブルのレコードを取得
            const [year, month] = targetMonth.split("-").map(Number);
            const startDate = `${targetMonth}-01`;
            const lastDay = new Date(year, month, 0).getDate();
            const endDate = `${targetMonth}-${String(lastDay).padStart(2, "0")}`;

            const { data: attendanceData, error: attendanceError } = await supabaseClient
              .from("attendance")
              .select("*")
              .gte("date", startDate)
              .lte("date", endDate)
              .order("date", { ascending: true });

            if (attendanceError) {
              return new Response(
                JSON.stringify({
                  success: false,
                  error: getErrorMessage(attendanceError),
                }),
                {
                  headers: { ...corsHeaders, "Content-Type": "application/json" },
                  status: 200,
                }
              );
            }

            if (!attendanceData || attendanceData.length === 0) {
              return new Response(
                JSON.stringify({
                  success: true,
                  message: "該当月の勤怠データがありません",
                  data: [],
                }),
                {
                  headers: { ...corsHeaders, "Content-Type": "application/json" },
                  status: 200,
                }
              );
            }

            // 3. staffごとに勤怠情報を集計
            const staffAttendanceMap = new Map<string, typeof attendanceData>();
            for (const attendance of attendanceData) {
              const staffId = attendance.staffId;
              if (!staffAttendanceMap.has(staffId)) {
                staffAttendanceMap.set(staffId, []);
              }
              staffAttendanceMap.get(staffId)!.push(attendance);
            }

            // システム設定を取得
            const { data: systemSettingsData, error: settingsError } = await supabaseClient
              .from("system_settings")
              .select("*")
              .limit(1)
              .single();

            if (settingsError) {
              return new Response(
                JSON.stringify({
                  success: false,
                  error: `システム設定の取得に失敗しました: ${getErrorMessage(settingsError)}`,
                }),
                {
                  headers: { ...corsHeaders, "Content-Type": "application/json" },
                  status: 200,
                }
              );
            }

            const systemSettings = systemSettingsData as SystemSettings;

            // 4. staffごとに給与計算
            const payrollResults: Payroll[] = [];

            for (const [staffId, attendances] of staffAttendanceMap.entries()) {
              // staff情報を取得
              const { data: staffData, error: staffError } = await supabaseClient
                .from("staff")
                .select("*")
                .eq("id", staffId)
                .single();

              if (staffError || !staffData) {
                continue; // staffが見つからない場合はスキップ
              }

              // 給与計算
              const calculatedData = calculatePayroll(
                staffData,
                attendances,
                systemSettings
              );

              payrollResults.push({
                month: targetMonth,
                staffId: staffId,
                data: calculatedData,
              });
            }

            // 5. 出来上がった結果をpayrollテーブルに追加
            if (payrollResults.length > 0) {
              const { data: insertData, error: insertError } = await supabaseClient
                .from("payroll")
                .insert(payrollResults)
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
                  message: `${payrollResults.length}件の給与データを計算しました`,
                  data: insertData,
                }),
                {
                  headers: { ...corsHeaders, "Content-Type": "application/json" },
                  status: 200,
                }
              );
            } else {
              return new Response(
                JSON.stringify({
                  success: true,
                  message: "給与計算対象のスタッフがありませんでした",
                  data: [],
                }),
                {
                  headers: { ...corsHeaders, "Content-Type": "application/json" },
                  status: 200,
                }
              );
            }
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

        // 登録
        const newPayroll: Payroll = await req.json();

        // バリデーション
        if (!newPayroll.month || !newPayroll.staffId) {
          return new Response(
            JSON.stringify({
              error: "必須フィールドが不足しています: month, staffId",
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            }
          );
        }

        // 月の形式を検証
        if (!isMonth(newPayroll.month)) {
          return new Response(
            JSON.stringify({
              error: "月の形式が正しくありません。YYYY-MM形式で指定してください。",
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
          .eq("id", newPayroll.staffId)
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
          .from("payroll")
          .insert(newPayroll)
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

        const updateData: Partial<Payroll> = await req.json();

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

        // 月が更新される場合、形式検証
        if (updateData.month && !isMonth(updateData.month)) {
          return new Response(
            JSON.stringify({
              error: "月の形式が正しくありません。YYYY-MM形式で指定してください。",
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            }
          );
        }

        const { data: patchData, error: patchError } = await supabaseClient
          .from("payroll")
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
            JSON.stringify({ error: "給与データが見つかりません" }),
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
          .from("payroll")
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

