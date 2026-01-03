import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getErrorMessage, isUUID } from "../_shared/utils.ts";

// 権限リスト
const ROLES = [
  { value: "user", label: "一般" },
  { value: "admin", label: "管理者" },
  { value: "system-admin", label: "システム管理者" },
] as const;

interface Profile {
  id?: string;
  uid: string;
  username?: string;
  role: (typeof ROLES)[number]["value"];
}

interface AuthUser {
  id: string;
  email?: string;
  phone?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

interface ProfileWithAuth {
  id: string | null;
  uid: string;
  email?: string;
  username: string | null;
  role: (typeof ROLES)[number]["value"] | null;
  has_profile: boolean;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

    // Create Supabase Admin client for Authentication API
    const supabaseAdminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Authenticationユーザー情報を取得する関数
    const getAuthUser = async (uid: string): Promise<AuthUser | null> => {
      try {
        const { data, error } = await supabaseAdminClient.auth.admin.getUserById(uid);
        if (error || !data?.user) {
          return null;
        }
        return {
          id: data.user.id,
          email: data.user.email,
          phone: data.user.phone,
          created_at: data.user.created_at,
          updated_at: data.user.updated_at,
        };
      } catch {
        return null;
      }
    };

    // Profile情報を取得する関数
    const getProfileByUid = async (uid: string): Promise<Profile | null> => {
      try {
        const { data, error } = await supabaseClient
          .from("profile")
          .select("*")
          .eq("uid", uid)
          .single();
        
        if (error || !data) {
          return null;
        }
        return data as Profile;
      } catch {
        return null;
      }
    };

    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    // Extract ID from path if present (e.g., /profile/{id} or /profile/roles)
    const pathParts = path.split("/");
    const pathValue = pathParts.length > 2 ? pathParts[2] : null;
    const isRoles = pathValue === "roles";

    // Handle different HTTP methods
    switch (method) {
      case "GET": {
        // 権限リスト取得
        if (isRoles) {
          return new Response(
            JSON.stringify({
              success: true,
              data: ROLES,
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 200,
            }
          );
        }

        // 一覧取得 or 単一取得
        if (pathValue) {
          // 単一取得（UIDで指定）
          if (!isUUID(pathValue)) {
            return new Response(
              JSON.stringify({ error: "有効なUID（UUID形式）が必要です" }),
              {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
              }
            );
          }

          // Authenticationユーザー情報を取得
          const authUser = await getAuthUser(pathValue);
          if (!authUser) {
            return new Response(
              JSON.stringify({ error: "ユーザーが見つかりません" }),
              {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 404,
              }
            );
          }

          // Profile情報を取得（なければnull）
          const profile = await getProfileByUid(pathValue);

          const profileWithAuth: ProfileWithAuth = {
            id: profile?.id ?? null,
            uid: authUser.id,
            email: authUser.email,
            username: profile?.username ?? null,
            role: profile?.role ?? null,
            has_profile: profile !== null,
          };

          return new Response(
            JSON.stringify(profileWithAuth),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 200,
            }
          );
        } else {
          // 一覧取得
          try {
            // Authenticationから全ユーザーを取得
            const { data: usersData, error: usersError } = await supabaseAdminClient.auth.admin.listUsers();

            if (usersError) {
              return new Response(
                JSON.stringify({
                  success: false,
                  error: getErrorMessage(usersError),
                }),
                {
                  headers: { ...corsHeaders, "Content-Type": "application/json" },
                  status: 200,
                }
              );
            }

            // 各ユーザーに対してProfile情報を取得
            const profilesWithAuth: ProfileWithAuth[] = await Promise.all(
              (usersData?.users || []).map(async (user) => {

                const profile = await getProfileByUid(user.id);
                
                return {
                  id: profile?.id ?? null,
                  uid: user.id,
                  email: user.email,
                  username: profile?.username ?? null,
                  role: profile?.role ?? null,
                  has_profile: profile !== null,
                };
              })
            );

            return new Response(
              JSON.stringify({
                success: true,
                data: profilesWithAuth,
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
        const newProfile: Profile = await req.json();

        // バリデーション
        if (!newProfile.uid) {
          return new Response(
            JSON.stringify({ error: "必須フィールドが不足しています: uid" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            }
          );
        }

        // 権限のバリデーション
        if (
          newProfile.role &&
          !ROLES.map((role) => role.value).includes(newProfile.role)
        ) {
          return new Response(
            JSON.stringify({
              error: `無効な権限です。有効な権限: ${ROLES.map((role) => role.value).join(", ")}`,
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            }
          );
        }

        // デフォルト権限を設定
        if (!newProfile.role) {
          newProfile.role = "user";
        }

        const { data: insertData, error: insertError } = await supabaseClient
          .from("profile")
          .insert(newProfile)
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

        const updateData: Partial<Profile> = await req.json();

        // 権限のバリデーション
        if (
          updateData.role &&
          !ROLES.map((role) => role.value).includes(updateData.role)
        ) {
          return new Response(
            JSON.stringify({
              error: `無効な権限です。有効な権限: ${ROLES.map(r => r.value).join(", ")}`,
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            }
          );
        }

        const { data: patchData, error: patchError } = await supabaseClient
          .from("profile")
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
            JSON.stringify({ error: "プロフィールが見つかりません" }),
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
          .from("profile")
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

