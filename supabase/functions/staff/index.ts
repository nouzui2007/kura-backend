import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getErrorMessage } from "../_shared/utils.ts";
import { normalizeDateFields, generateStaffId } from "../_shared/staff-utils.ts";

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

        // IDが指定されていない場合、自動生成
        if (!newStaff.id) {
          newStaff.id = generateStaffId();
        }

        // 日付フィールドを正規化
        const normalizedNewStaff = normalizeDateFields<Staff>(newStaff);

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

