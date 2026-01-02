import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH,DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Staff {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  gender?: string;
  address?: string;
  postalCode?: string;
  lastName?: string;
  firstName?: string;
  lastNameKana?: string;
  firstNameKana?: string;
  employeeId: string;
  hireDate?: string;
  birthDate?: string;
  workType?: string;
  workLocation?: string;
  department?: string;
  branchName?: string;
  employmentType?: string;
  hourlyRate?: number;
  monthlySalary?: number;
  bankName?: string;
  accountType?: string;
  accountNumber?: string;
  retireDate?: string;
  allowances?: Array<{ name: string; amount: number }>;
  deductions?: Array<{ name: string; amount: number }>;
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

// 日付フィールドを正規化する関数（空文字列をnullに変換、日付形式を検証）
function normalizeDateFields(staff: Staff | Partial<Staff>): Staff | Partial<Staff> {
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

    // Extract ID from path if present (e.g., /staff/staff_002)
    const pathParts = path.split("/");
    const id = pathParts.length > 2 ? pathParts[2] : null;

    // Handle different HTTP methods
    switch (method) {
      case "GET": {
        // 一覧取得 or 単一取得
        if (id) {
          // 単一取得
          const { data, error } = await supabaseClient
            .from("staff")
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
          // 一覧取得
          try {
            const { data, error } = await supabaseClient
              .from("staff")
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
        const newStaff: Staff = await req.json();

        // バリデーション
        if (!newStaff.name || !newStaff.employeeId) {
          return new Response(
            JSON.stringify({ error: "必須フィールドが不足しています: name, employeeId" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            }
          );
        }

        // IDが指定されていない場合、自動生成（staff_プレフィックス + UUIDの最初の8文字）
        if (!newStaff.id) {
          const uuid = crypto.randomUUID();
          // UUIDの最初の8文字を使用してstaff_プレフィックスを付ける
          newStaff.id = `staff_${uuid.substring(0, 8)}`;
        }

        // 日付フィールドを正規化
        const normalizedNewStaff = normalizeDateFields(newStaff) as Staff;

        const { data: insertData, error: insertError } = await supabaseClient
          .from("staff")
          .insert(normalizedNewStaff)
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
        if (!id) {
          return new Response(
            JSON.stringify({ error: "IDが必要です" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            }
          );
        }

        const updateData: Partial<Staff> = await req.json();

        // 日付フィールドを正規化
        const normalizedUpdateData = normalizeDateFields(updateData) as Partial<Staff>;

        const { data: patchData, error: patchError } = await supabaseClient
          .from("staff")
          .update(normalizedUpdateData)
          .eq("id", id)
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
            JSON.stringify({ error: "スタッフが見つかりません" }),
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
          .from("staff")
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

