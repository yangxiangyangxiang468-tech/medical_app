-- sessionsテーブル作成
create table sessions (
  id               uuid        default gen_random_uuid() primary key,
  subject_code     text,
  grid_size        int,
  flash_count      int,
  speed_ms         int,
  result           text,
  elapsed_time_ms  int,
  total_mistakes   int,
  sequence         jsonb,
  play_log         jsonb,
  created_at       timestamptz default now()
);

-- Row Level Security を有効化
alter table sessions enable row level security;

-- 誰でもinsert可（患者側・ログイン不要）
create policy "anyone can insert"
  on sessions for insert
  with check (true);

-- 閲覧はログイン済みユーザーのみ（医師側）
create policy "auth users can select"
  on sessions for select
  using (auth.role() = 'authenticated');

-- 削除もログイン済みユーザーのみ
create policy "auth users can delete"
  on sessions for delete
  using (auth.role() = 'authenticated');
