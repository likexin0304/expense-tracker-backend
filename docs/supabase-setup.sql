-- Supabase数据库设置SQL
-- 此文件包含设置费用追踪应用所需的所有表、视图、函数和权限

-- 1. 创建profiles表 (扩展auth.users)
create table if not exists profiles (
  id uuid references auth.users primary key,
  email text not null,
  is_deleted boolean default false,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 启用RLS策略
alter table profiles enable row level security;

-- 创建策略
create policy "用户可以查看自己的资料" on profiles
  for select using (auth.uid() = id);
  
create policy "用户可以更新自己的资料" on profiles
  for update using (auth.uid() = id);

-- 2. 创建expenses表 (支出记录)
create table if not exists expenses (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  amount decimal not null check (amount > 0),
  category text not null,
  description text not null check (char_length(description) <= 200),
  date timestamp with time zone default now(),
  location text check (char_length(location) <= 100),
  payment_method text default 'cash',
  is_recurring boolean default false,
  tags text[] default '{}',
  notes text default '' check (char_length(notes) <= 500),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 创建索引
create index expenses_user_id_idx on expenses(user_id);
create index expenses_date_idx on expenses(date);
create index expenses_category_idx on expenses(category);

-- 启用RLS策略
alter table expenses enable row level security;

-- 创建策略
create policy "用户可以管理自己的支出" on expenses
  for all using (auth.uid() = user_id);

-- 3. 创建budgets表 (预算)
create table if not exists budgets (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  amount decimal not null check (amount > 0),
  year integer not null,
  month integer not null check (month between 1 and 12),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(user_id, year, month)
);

-- 创建索引
create index budgets_user_id_idx on budgets(user_id);
create index budgets_year_month_idx on budgets(year, month);

-- 启用RLS策略
alter table budgets enable row level security;

-- 创建策略
create policy "用户可以管理自己的预算" on budgets
  for all using (auth.uid() = user_id);

-- 4. 创建月度支出统计视图
create or replace view monthly_expense_stats as
select
  user_id,
  date_trunc('month', date) as month,
  sum(amount) as total_amount,
  count(*) as transaction_count,
  avg(amount) as average_amount,
  category,
  count(*) filter (where payment_method = 'cash') as cash_count,
  count(*) filter (where payment_method = 'card') as card_count,
  count(*) filter (where payment_method = 'online') as online_count
from expenses
group by user_id, date_trunc('month', date), category;

-- 5. 创建预算使用情况函数
create or replace function get_budget_usage(user_uuid uuid, year_param int, month_param int)
returns table (
  budget_amount decimal,
  spent_amount decimal,
  remaining_amount decimal,
  usage_percentage decimal
) language plpgsql security definer as $$
begin
  return query
  with budget as (
    select amount from budgets
    where user_id = user_uuid and year = year_param and month = month_param
  ),
  expenses as (
    select sum(amount) as total
    from expenses
    where user_id = user_uuid
    and extract(year from date) = year_param
    and extract(month from date) = month_param
  )
  select
    b.amount as budget_amount,
    coalesce(e.total, 0) as spent_amount,
    b.amount - coalesce(e.total, 0) as remaining_amount,
    case when b.amount > 0 then
      round((coalesce(e.total, 0) / b.amount) * 100, 2)
    else
      0
    end as usage_percentage
  from budget b cross join expenses e;
end;
$$;

-- 6. 创建支出分类统计函数
create or replace function get_expense_stats_by_category(user_uuid uuid, start_date timestamp, end_date timestamp)
returns table (
  category text,
  total decimal,
  count bigint,
  avg_amount decimal
) language plpgsql security definer as $$
begin
  return query
  select
    e.category,
    sum(e.amount) as total,
    count(*) as count,
    avg(e.amount) as avg_amount
  from expenses e
  where e.user_id = user_uuid
    and e.date >= start_date
    and e.date <= end_date
  group by e.category
  order by total desc;
end;
$$;

-- 7. 创建支出趋势函数
create or replace function get_expense_trends(user_uuid uuid, months_back int)
returns table (
  month_date date,
  total_amount decimal,
  transaction_count bigint
) language plpgsql security definer as $$
begin
  return query
  with month_series as (
    select generate_series(
      date_trunc('month', now()) - ((months_back - 1) || ' month')::interval,
      date_trunc('month', now()),
      '1 month'::interval
    ) as month_date
  )
  select
    ms.month_date::date,
    coalesce(sum(e.amount), 0) as total_amount,
    count(e.id) as transaction_count
  from month_series ms
  left join expenses e on 
    date_trunc('month', e.date) = ms.month_date and
    e.user_id = user_uuid
  group by ms.month_date
  order by ms.month_date;
end;
$$;

-- 8. 创建用户注册触发器 (自动创建profile)
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

-- 创建触发器
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 9. 设置实时订阅
-- 启用expenses表的实时功能
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime for table expenses, budgets;
commit;

-- 10. 初始化支出分类
-- 创建支出分类枚举类型
do $$
begin
  if not exists (select 1 from pg_type where typname = 'expense_category') then
    create type expense_category as enum (
      'food',        -- 餐饮
      'transport',   -- 交通
      'entertainment', -- 娱乐
      'shopping',    -- 购物
      'bills',       -- 账单
      'healthcare',  -- 医疗
      'education',   -- 教育
      'travel',      -- 旅行
      'other'        -- 其他
    );
  end if;
end
$$;

-- 11. 初始化支付方式
-- 创建支付方式枚举类型
do $$
begin
  if not exists (select 1 from pg_type where typname = 'payment_method') then
    create type payment_method as enum (
      'cash',    -- 现金
      'card',    -- 银行卡
      'online',  -- 在线支付
      'other'    -- 其他
    );
  end if;
end
$$; 