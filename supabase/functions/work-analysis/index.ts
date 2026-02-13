import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getErrorMessage, isUUID } from "../_shared/utils.ts";
import {
  analyzeWorkTime,
  type SystemSettingsForWorkAnalysis,
} from "../_shared/work-analysis-utils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WorkAnalysisRequest {
  staffId: string;
  workStartTime: string; // "HH:mm" or "HH:mm:ss"
  workEndTime: string;
  date: string; // "YYYY-MM-DD"
}

const TIME_REGEX = /^\d{1,2}:\d{2}(:\d{2})?$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function validateWorkAnalysisRequest(
  body: unknown
): { valid: boolean; error?: string } {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "リクエストボディが必要です" };
  }

  const req = body as Record<string, unknown>;

  if (!req.staffId || typeof req.staffId !== "string") {
    return { valid: false, error: "staffId が必須です" };
  }

  if (!req.workStartTime || typeof req.workStartTime !== "string") {
    return { valid: false, error: "workStartTime が必須です" };
  }
  if (!TIME_REGEX.test(req.workStartTime)) {
    return {
      valid: false,
      error:
        "workStartTime は HH:mm または HH:mm:ss 形式で指定してください",
    };
  }

  if (!req.workEndTime || typeof req.workEndTime !== "string") {
    return { valid: false, error: "workEndTime が必須です" };
  }
  if (!TIME_REGEX.test(req.workEndTime)) {
    return {
      valid: false,
      error: "workEndTime は HH:mm または HH:mm:ss 形式で指定してください",
    };
  }

  if (!req.date || typeof req.date !== "string") {
    return { valid: false, error: "date が必須です" };
  }
  if (!DATE_REGEX.test(req.date)) {
    return {
      valid: false,
      error: "date は YYYY-MM-DD 形式で指定してください",
    };
  }

  return { valid: true };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "POSTメソッドのみサポートしています" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 405,
        }
      );
    }

    const body: unknown = await req.json();
    const validation = validateWorkAnalysisRequest(body);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    const { staffId, workStartTime, workEndTime, date } = body as WorkAnalysisRequest;

    // スタッフの存在確認
    const { data: staffData, error: staffError } = await supabaseClient
      .from("staff")
      .select("id")
      .eq("id", staffId)
      .single();

    if (staffError || !staffData) {
      return new Response(
        JSON.stringify({ error: "指定されたスタッフが存在しません" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // システム設定を取得
    const { data: settingsData, error: settingsError } = await supabaseClient
      .from("system_settings")
      .select(
        "earlyOvertimeStandardHour, earlyLeaveStandardHour, overtimeStandardHour, lateNightStartHour, lateNightEndHour"
      )
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (settingsError || !settingsData) {
      return new Response(
        JSON.stringify({ error: "システム設定の取得に失敗しました" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    const systemSettings: SystemSettingsForWorkAnalysis = {
      earlyOvertimeStandardHour: Number(settingsData.earlyOvertimeStandardHour),
      earlyLeaveStandardHour: Number(settingsData.earlyLeaveStandardHour),
      overtimeStandardHour: Number(settingsData.overtimeStandardHour),
      lateNightStartHour: Number(settingsData.lateNightStartHour),
      lateNightEndHour: Number(settingsData.lateNightEndHour),
    };

    const result = analyzeWorkTime(
      { workStartTime, workEndTime, date },
      systemSettings
    );

    return new Response(
      JSON.stringify({
        staffId,
        date,
        workStartTime,
        workEndTime,
        ...result,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
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
