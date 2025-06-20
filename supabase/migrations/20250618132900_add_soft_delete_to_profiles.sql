-- 为profiles表添加软删除支持
-- 迁移文件：添加is_deleted和deleted_at字段

-- 1. 添加软删除字段到profiles表
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- 2. 创建索引优化软删除查询
CREATE INDEX IF NOT EXISTS idx_profiles_is_deleted ON public.profiles(is_deleted);
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON public.profiles(deleted_at);

-- 3. 更新RLS策略以排除已删除用户
DROP POLICY IF EXISTS "用户只能访问自己的资料" ON public.profiles;

CREATE POLICY "用户只能访问自己的未删除资料" ON public.profiles
  FOR ALL USING (auth.uid() = id AND is_deleted = FALSE);

-- 4. 创建管理员策略（用于软删除操作）
CREATE POLICY "管理员可以访问所有资料" ON public.profiles
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- 5. 创建函数：软删除用户资料
CREATE OR REPLACE FUNCTION public.soft_delete_user_profile(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.profiles 
  SET 
    is_deleted = TRUE,
    deleted_at = NOW(),
    updated_at = NOW()
  WHERE id = user_uuid;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. 创建函数：恢复已删除的用户资料
CREATE OR REPLACE FUNCTION public.restore_user_profile(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.profiles 
  SET 
    is_deleted = FALSE,
    deleted_at = NULL,
    updated_at = NOW()
  WHERE id = user_uuid;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. 更新现有数据（确保所有现有用户的is_deleted为FALSE）
UPDATE public.profiles 
SET is_deleted = FALSE 
WHERE is_deleted IS NULL; 