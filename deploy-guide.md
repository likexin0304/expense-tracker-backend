# Vercel 部署指南

## 🚀 快速部署步骤

### 1. 完成 Vercel 部署
在终端中完成当前的部署过程。

### 2. 在 Vercel Dashboard 添加环境变量

访问：https://vercel.com/dashboard

找到您的项目 → Settings → Environment Variables

### 3. 添加以下环境变量

**NODE_ENV**
```
production
```

**JWT_SECRET**
```
expense_tracker_jwt_secret_2024_production_change_this_in_real_deployment
```

**SUPABASE_URL**
```
https://nlrtjnvwgsaavtpfccxg.supabase.co
```

**SUPABASE_ANON_KEY**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5scnRqbnZ3Z3NhYXZ0cGZjY3hnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwNzU3MDgsImV4cCI6MjA2NTY1MTcwOH0.5r2tzDOV1T1Lkz_Mtujq35VBBfo77SCh6H__rUSHQCo
```

**SUPABASE_SERVICE_ROLE_KEY**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5scnRqbnZ3Z3NhYXZ0cGZjY3hnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDA3NTcwOCwiZXhwIjoyMDY1NjUxNzA4fQ.j71A2nthbWaSzULxnUd9U7nOeXd0u6ru0CJmu90Vcdk
```

### 4. 重新部署
添加环境变量后，在 Vercel Dashboard 中重新部署项目。

### 5. 测试部署
部署完成后，访问您的 API URL：
```
https://your-project-name.vercel.app/health
```

应该返回：
```json
{
  "status": "OK",
  "timestamp": "2024-06-17T...",
  "env": "production"
}
```

## 📱 iOS 应用配置

部署完成后，在您的 iOS 应用中更新 API 基础 URL：

```swift
// 生产环境 API URL
let productionBaseURL = "https://your-project-name.vercel.app"
```

## 🔧 故障排除

如果遇到问题：
1. 检查 Vercel 部署日志
2. 确认所有环境变量都已正确添加
3. 检查 Supabase 连接状态
4. 验证 API 端点响应 