-- Profileテーブルを作成
CREATE TABLE IF NOT EXISTS public.profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uid UUID NOT NULL UNIQUE,
  username TEXT,
  role TEXT NOT NULL DEFAULT '一般' CHECK (role IN ('システム管理者', '管理者', '一般')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- RLSを有効化
ALTER TABLE public.profile ENABLE ROW LEVEL SECURITY;

-- ポリシー: すべてのユーザーが自分のプロフィールを読み取れる
CREATE POLICY "Users can read their own profile"
  ON public.profile
  FOR SELECT
  USING (auth.uid() = uid);

-- ポリシー: すべてのユーザーが自分のプロフィールを更新できる
CREATE POLICY "Users can update their own profile"
  ON public.profile
  FOR UPDATE
  USING (auth.uid() = uid);

-- ポリシー: 認証済みユーザーは自分のプロフィールを作成できる
CREATE POLICY "Users can insert their own profile"
  ON public.profile
  FOR INSERT
  WITH CHECK (auth.uid() = uid);

-- ポリシー: システム管理者はすべてのプロフィールを読み取れる
CREATE POLICY "System admins can read all profiles"
  ON public.profile
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profile
      WHERE uid = auth.uid() AND role = 'システム管理者'
    )
  );

-- ポリシー: システム管理者はすべてのプロフィールを更新できる
CREATE POLICY "System admins can update all profiles"
  ON public.profile
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profile
      WHERE uid = auth.uid() AND role = 'システム管理者'
    )
  );

-- ポリシー: システム管理者はすべてのプロフィールを削除できる
CREATE POLICY "System admins can delete all profiles"
  ON public.profile
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profile
      WHERE uid = auth.uid() AND role = 'システム管理者'
    )
  );

-- updated_atを自動更新するトリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profile_updated_at
  BEFORE UPDATE ON public.profile
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- インデックス
CREATE INDEX IF NOT EXISTS idx_profile_uid ON public.profile(uid);
CREATE INDEX IF NOT EXISTS idx_profile_role ON public.profile(role);

