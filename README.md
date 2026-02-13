# Kura Backend

スタッフ管理、出勤記録管理、システム設定管理、給与計算を行うSupabaseベースのバックエンドAPIです。

## 機能

- **Staff（スタッフ管理）**: スタッフ情報のCRUD操作
- **Attendance（出勤記録管理）**: 出勤記録の登録、更新、削除、一括登録
- **System Settings（システム設定管理）**: 労働時間、残業設定、給与設定の管理
- **Payroll（給与計算）**: 月次給与の自動計算と管理

## 必要な環境

- Node.js 18以上
- Supabase CLI
- Docker（ローカル開発用）

## セットアップ

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd backend
```

### 2. Supabase CLIのインストール

```bash
# macOS
brew install supabase/tap/supabase

# または npm経由
npm install -g supabase
```

### 3. ローカル開発環境の起動

```bash
# Supabaseローカル環境を起動
supabase start
```

このコマンドで以下が起動します：
- PostgreSQL データベース（ポート: 54322）
- Supabase Studio（ポート: 54323）
- API Gateway（ポート: 54321）
- Edge Functions Runtime

### 4. データベースマイグレーションの実行

```bash
# マイグレーションを実行
supabase db reset
```

または、既存のデータベースに適用する場合：

```bash
supabase migration up
```

### 5. Edge Functionsの起動

```bash
# すべてのEdge Functionsを起動
supabase functions serve

# または個別に起動
supabase functions serve staff
supabase functions serve attendance
supabase functions serve system-settings
supabase functions serve payroll
supabase functions serve profile
```

### 6. 動作確認

- **Supabase Studio**: http://localhost:54323
- **API Base URL**: http://localhost:54321/functions/v1

## 環境変数

ローカル開発では、Supabase CLIが自動的に環境変数を設定します。

本番環境では、以下の環境変数を設定してください：

- `SUPABASE_URL`: SupabaseプロジェクトのURL
- `SUPABASE_ANON_KEY`: Supabaseの匿名キー
- `SUPABASE_SERVICE_ROLE_KEY`: Supabaseのサービスロールキー（必要に応じて）

## デプロイ

### Supabaseにデプロイ

#### 1. Supabaseプロジェクトにログイン

```bash
supabase login
```

#### 2. プロジェクトをリンク

```bash
supabase link --project-ref <your-project-ref>
```

プロジェクト参照IDは、Supabaseダッシュボードのプロジェクト設定から取得できます。

#### 3. データベースマイグレーションのデプロイ

```bash
# マイグレーションをリモートに適用
supabase db push
```

#### 4. Edge Functionsのデプロイ

```bash
# すべてのEdge Functionsをデプロイ
supabase functions deploy

# または個別にデプロイ
supabase functions deploy staff
supabase functions deploy attendance
supabase functions deploy system-settings
supabase functions deploy payroll
supabase functions deploy profile
```

#### 5. 環境変数の設定（必要に応じて）

```bash
# Edge Functionの環境変数を設定
supabase secrets set KEY_NAME=value
```

## APIエンドポイント

### Staff（スタッフ管理）

- `GET /staff` - スタッフ一覧取得
- `GET /staff/{id}` - スタッフ単一取得
- `POST /staff` - スタッフ登録
- `PATCH /staff/{id}` - スタッフ更新
- `DELETE /staff/{id}` - スタッフ削除

### Attendance（出勤記録管理）

- `GET /attendance` - 出勤記録一覧取得
- `GET /attendance/{idOrDate}` - 出勤記録取得（IDまたは日付指定）
- `POST /attendance` - 出勤記録登録
- `POST /attendance/bulk` - 出勤記録一括登録
- `PATCH /attendance/{id}` - 出勤記録更新
- `DELETE /attendance/{id}` - 出勤記録削除

### System Settings（システム設定管理）

- `GET /system-settings` - システム設定一覧取得
- `GET /system-settings/{id}` - システム設定単一取得
- `POST /system-settings` - システム設定登録
- `PATCH /system-settings` または `PATCH /system-settings/{id}` - システム設定更新
- `DELETE /system-settings/{id}` - システム設定削除

### Payroll（給与計算・管理）

- `GET /payroll/{month}` - 月次給与データ取得
- `POST /payroll/calculate` - 給与計算
- `POST /payroll` - 給与データ登録
- `PATCH /payroll/{id}` - 給与データ更新
- `DELETE /payroll/{id}` - 給与データ削除

### Profile（プロフィール管理）

- `GET /profile` - プロフィール一覧取得
- `GET /profile/{id}` - プロフィール単一取得
- `GET /profile/roles` - 権限リスト取得
- `POST /profile` - プロフィール登録
- `PATCH /profile/{id}` - プロフィール更新
- `DELETE /profile/{id}` - プロフィール削除

### Work Analysis（勤務時間分析）

- `POST /work-analysis` - 勤務時間分析（早出残業・残業・早上・深夜残業時間を算出）

詳細なAPI仕様は `openapi.yaml` を参照してください。

## データベース構造

### テーブル

- `staff` - スタッフ情報
- `attendance` - 出勤記録
- `system_settings` - システム設定
- `payroll` - 給与データ
- `profile` - プロフィール（認証ユーザー情報）

マイグレーションファイルは `supabase/migrations/` ディレクトリにあります。

## 開発

### マイグレーションの作成

```bash
# 新しいマイグレーションファイルを作成
supabase migration new <migration_name>
```

### Edge Functionの開発

Edge Functionsは `supabase/functions/` ディレクトリにあります。

- `staff/index.ts` - スタッフ管理API
- `attendance/index.ts` - 出勤記録管理API
- `system-settings/index.ts` - システム設定管理API
- `payroll/index.ts` - 給与計算・管理API
- `profile/index.ts` - プロフィール管理API
- `work-analysis/index.ts` - 勤務時間分析API

### ユニットテスト

ロジック関数のユニットテストが `supabase/functions/_shared/__tests__/` ディレクトリにあります。

```bash
# すべてのテストを実行
deno test supabase/functions/_shared/__tests__/

# 特定のテストファイルを実行
deno test supabase/functions/_shared/__tests__/utils.test.ts
deno test supabase/functions/_shared/__tests__/staff-utils.test.ts
deno test supabase/functions/_shared/__tests__/attendance-utils.test.ts
deno test supabase/functions/_shared/__tests__/payroll-utils.test.ts
deno test supabase/functions/_shared/__tests__/work-analysis-utils.test.ts

# カバレッジ付きで実行
deno test --coverage=coverage supabase/functions/_shared/__tests__/
```

テスト対象のロジック関数：
- `getErrorMessage` - エラーメッセージ取得
- `isUUID`, `isDate`, `isMonth` - 形式判定
- `normalizeDateFields` - 日付フィールド正規化
- `generateStaffId` - スタッフID生成
- `validateBulkAttendanceRequest` - 一括出勤記録バリデーション
- `convertBulkAttendanceList` - 一括出勤記録変換
- `analyzeWorkTime` - 勤務時間分析（早出残業・残業・早上・深夜残業）
- `validateAttendance` - 出勤記録バリデーション
- `calculatePayroll` - 給与計算ロジック

### ローカルでのテスト

```bash
# 特定のEdge Functionを起動してテスト
supabase functions serve <function-name>

# 別のターミナルでテスト
curl http://localhost:54321/functions/v1/staff
```

## トラブルシューティング

### ローカル環境が起動しない

```bash
# Supabaseローカル環境をリセット
supabase stop
supabase start
```

### マイグレーションエラー

```bash
# データベースをリセットして再実行
supabase db reset
```

### Edge Functionのエラー

```bash
# ログを確認
supabase functions logs <function-name>
```

## ライセンス

[ライセンス情報を記載]

