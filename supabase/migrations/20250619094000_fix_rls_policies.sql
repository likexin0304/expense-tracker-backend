-- 修复RLS策略以支持service role访问
-- 这个迁移将允许使用service role key的后端API正常访问数据

-- 1. 删除现有的RLS策略
DROP POLICY IF EXISTS "用户只能访问自己的预算" ON budgets;
DROP POLICY IF EXISTS "用户只能访问自己的支出" ON expenses;

-- 2. 创建新的RLS策略，支持service role访问
-- 预算表策略
CREATE POLICY "预算访问策略" ON budgets
  FOR ALL 
  USING (
    -- 允许service role访问所有数据
    current_setting('role') = 'service_role'
    OR 
    -- 或者用户只能访问自己的数据
    auth.uid() = user_id
  );

-- 支出表策略  
CREATE POLICY "支出访问策略" ON expenses
  FOR ALL 
  USING (
    -- 允许service role访问所有数据
    current_setting('role') = 'service_role'
    OR 
    -- 或者用户只能访问自己的数据
    auth.uid() = user_id
  );

-- 3. 确保RLS仍然启用
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY; 