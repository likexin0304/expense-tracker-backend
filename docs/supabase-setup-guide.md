# Supabase设置指南

本文档将指导您完成为费用追踪应用设置Supabase项目的步骤。

## 1. 创建Supabase账号和项目

1. 访问 [Supabase官网](https://supabase.com/) 并注册账号
2. 登录后，点击"New Project"创建新项目
3. 填写项目详情：
   - 项目名称：`expense-tracker`（或您喜欢的名称）
   - 数据库密码：设置一个强密码并保存
   - 地区：选择离您用户最近的地区
4. 点击"Create new project"，等待项目创建完成

## 2. 获取项目凭证

项目创建完成后，您需要获取以下凭证：

1. 在项目控制面板左侧菜单，点击"Settings"（设置）
2. 点击"API"
3. 记录以下信息：
   - **Project URL**: `https://[your-project-id].supabase.co`
   - **anon public key**: 用于客户端访问的公钥
   - **service_role key**: 具有管理权限的密钥（保密存储）

## 3. 配置环境变量

1. 在项目根目录创建`.env`文件（如果尚未创建）
2. 添加以下内容，替换为您的实际值：

```
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
```

## 4. 设置数据库结构

1. 在Supabase控制面板，点击"SQL Editor"（SQL编辑器）
2. 点击"New Query"（新查询）
3. 将`docs/supabase-setup.sql`文件中的SQL代码复制并粘贴到编辑器中
4. 点击"Run"（运行）执行SQL脚本

## 5. 配置认证设置

1. 在Supabase控制面板左侧菜单，点击"Authentication"（认证）
2. 点击"Settings"（设置）
3. 配置以下选项：
   - **Site URL**: 设置为您的前端应用URL
   - **Redirect URLs**: 添加您的应用重定向URL
   - **Email templates**: 根据需要自定义邮件模板

4. 在"Providers"（提供商）部分：
   - 确保"Email"已启用
   - 如需其他登录方式（如微信），可在此配置

## 6. 设置存储桶（可选）

如果您的应用需要文件上传功能：

1. 在Supabase控制面板左侧菜单，点击"Storage"（存储）
2. 点击"Create bucket"（创建存储桶）
3. 创建名为`expense-receipts`的公共存储桶
4. 配置存储桶权限：
   ```sql
   -- 在SQL编辑器中运行
   create policy "用户可以上传自己的收据"
     on storage.objects for insert
     with check (auth.uid() = owner);
   
   create policy "用户可以查看自己的收据"
     on storage.objects for select
     using (auth.uid() = owner);
   ```

## 7. 启用实时功能

1. 在Supabase控制面板左侧菜单，点击"Database"（数据库）
2. 点击"Replication"（复制）
3. 在"Supabase Realtime"部分，确保已启用并包含`expenses`和`budgets`表

## 8. 测试配置

完成以上步骤后，您可以使用以下命令测试连接：

```javascript
// 在项目根目录运行
node -e "const { supabase } = require('./src/utils/supabase'); supabase.from('profiles').select('*').then(console.log).catch(console.error);"
```

如果配置正确，您应该能看到查询结果或空数组（如果没有数据）。

## 9. 后续步骤

完成Supabase设置后，您可以：

1. 更新iOS Swift应用以使用Supabase客户端
2. 迁移现有数据到Supabase（如果有）
3. 测试所有功能是否正常工作

## 常见问题

### 数据库表未创建成功

确保您以正确的顺序运行SQL脚本，并检查SQL编辑器中的错误消息。

### 认证不起作用

检查环境变量是否正确设置，以及Supabase URL和密钥是否正确。

### 实时更新不工作

确保已正确配置实时发布，并且客户端已正确订阅频道。 