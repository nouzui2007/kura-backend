-- Profileテーブルのroleカラムの値を変更
-- CHECK制約を削除
ALTER TABLE public.profile
  DROP CONSTRAINT IF EXISTS profile_role_check;

-- 既存の値を新しい値に変換
UPDATE public.profile
SET role = CASE
  WHEN role = 'システム管理者' THEN 'system-admin'
  WHEN role = '管理者' THEN 'admin'
  WHEN role = '一般' THEN 'user'
  ELSE role
END
WHERE role IN ('システム管理者', '管理者', '一般');

-- CHECK制約を作成
ALTER TABLE public.profile
  ADD CONSTRAINT profile_role_check CHECK (role IN ('system-admin', 'admin', 'user'));

-- デフォルト値を更新
ALTER TABLE public.profile
  ALTER COLUMN role SET DEFAULT 'user';

-- RLSポリシーを更新（システム管理者のチェック条件を更新）
DROP POLICY IF EXISTS "System admins can read all profiles" ON public.profile;
DROP POLICY IF EXISTS "System admins can update all profiles" ON public.profile;
DROP POLICY IF EXISTS "System admins can delete all profiles" ON public.profile;

CREATE POLICY "System admins can read all profiles"
  ON public.profile
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profile
      WHERE uid = auth.uid() AND role = 'system-admin'
    )
  );

CREATE POLICY "System admins can update all profiles"
  ON public.profile
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profile
      WHERE uid = auth.uid() AND role = 'system-admin'
    )
  );

CREATE POLICY "System admins can delete all profiles"
  ON public.profile
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profile
      WHERE uid = auth.uid() AND role = 'system-admin'
    )
  );

