import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getErrorMessage } from "../_shared/utils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SystemSettings {
  id?: string;
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

    // Extract ID from path if present (e.g., /system-settings/{id})
    const pathParts = path.split("/");
    const id = pathParts.length > 2 ? pathParts[2] : null;

    // Handle different HTTP methods
    switch (method) {
      case "GET": {
        // 一覧取得 or 単一取得
        if (id) {
          // 単一取得
          const { data, error } = await supabaseClient
            .from("system_settings")
            .select("*")
            .eq("id", id)
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
        } else {
          // 一覧取得（通常は1件のみ）
          try {
            const { data, error } = await supabaseClient
              .from("system_settings")
              .select("*")
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
                status: 200,
              }
            );
          }
        }
      }

      case "POST": {
        // 登録
        const newSettings: SystemSettings = await req.json();

        // バリデーション
        if (
          newSettings.regularHoursPerDay === undefined ||
          newSettings.defaultBreakMinutes === undefined ||
          newSettings.breakMinutesFor6Hours === undefined ||
          newSettings.breakMinutesFor8Hours === undefined ||
          newSettings.overtimeThreshold === undefined ||
          newSettings.overtimeRate === undefined ||
          newSettings.excessOvertimeRate === undefined ||
          newSettings.lateNightRate === undefined ||
          newSettings.holidayRate === undefined ||
          newSettings.lateNightStartHour === undefined ||
          newSettings.lateNightEndHour === undefined ||
          newSettings.earlyOvertimeStandardHour === undefined ||
          newSettings.earlyLeaveStandardHour === undefined ||
          newSettings.overtimeStandardHour === undefined ||
          newSettings.defaultHourlyRate === undefined
        ) {
          return new Response(
            JSON.stringify({
              error: "すべてのフィールドが必要です",
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            }
          );
        }

        const { data: insertData, error: insertError } = await supabaseClient
          .from("system_settings")
          .insert(newSettings)
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
        // 更新（IDが指定されていない場合は最初のレコードを更新）
        const updateData: Partial<SystemSettings> = await req.json();

        let query = supabaseClient
          .from("system_settings")
          .update(updateData)
          .select()
          .single();

        if (id) {
          query = query.eq("id", id);
        }

        const { data: patchData, error: patchError } = await query;

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
            JSON.stringify({ error: "システム設定が見つかりません" }),
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
        if (!id) {
          return new Response(
            JSON.stringify({ error: "IDが必要です" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            }
          );
        }

        const { error: deleteError } = await supabaseClient
          .from("system_settings")
          .delete()
          .eq("id", id);

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
          JSON.stringify({ message: "削除されました", id }),
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

