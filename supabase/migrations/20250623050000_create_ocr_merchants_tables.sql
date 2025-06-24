-- 创建商户数据库表
create table if not exists merchants (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  category text not null,
  keywords text[] default '{}',
  confidence_score decimal default 1.0 check (confidence_score between 0 and 1),
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 启用全文搜索扩展（如果尚未启用）
create extension if not exists pg_trgm;

-- 创建商户名称索引
create index if not exists idx_merchants_name on merchants using gin(name gin_trgm_ops);
create index if not exists idx_merchants_keywords on merchants using gin(keywords);
create index if not exists idx_merchants_category on merchants(category);

-- 创建OCR记录表
create table if not exists ocr_records (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  original_text text not null,
  parsed_data jsonb,
  confidence_score decimal default 0.0 check (confidence_score between 0 and 1),
  status text not null check (status in ('processing', 'success', 'failed', 'confirmed')) default 'processing',
  error_message text,
  expense_id uuid references expenses(id),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 创建OCR记录索引
create index if not exists idx_ocr_records_user_id on ocr_records(user_id);
create index if not exists idx_ocr_records_status on ocr_records(status);
create index if not exists idx_ocr_records_created_at on ocr_records(created_at desc);

-- 为商户表添加RLS策略
alter table merchants enable row level security;

-- 商户表的RLS策略（所有用户都可以读取商户数据）
create policy "merchants_select_policy" on merchants
  for select using (true);

-- 只允许管理员插入/更新/删除商户数据（暂时允许所有认证用户，后续可以限制）
create policy "merchants_insert_policy" on merchants
  for insert with check (auth.uid() is not null);

create policy "merchants_update_policy" on merchants
  for update using (auth.uid() is not null);

create policy "merchants_delete_policy" on merchants
  for delete using (auth.uid() is not null);

-- 为OCR记录表添加RLS策略
alter table ocr_records enable row level security;

-- OCR记录的RLS策略（用户只能访问自己的记录）
create policy "ocr_records_select_policy" on ocr_records
  for select using (auth.uid() = user_id);

create policy "ocr_records_insert_policy" on ocr_records
  for insert with check (auth.uid() = user_id);

create policy "ocr_records_update_policy" on ocr_records
  for update using (auth.uid() = user_id);

create policy "ocr_records_delete_policy" on ocr_records
  for delete using (auth.uid() = user_id);

-- 添加触发器函数更新updated_at字段
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language 'plpgsql';

-- 为merchants表添加updated_at触发器
create trigger update_merchants_updated_at before update on merchants
    for each row execute procedure update_updated_at_column();

-- 为ocr_records表添加updated_at触发器  
create trigger update_ocr_records_updated_at before update on ocr_records
    for each row execute procedure update_updated_at_column(); 