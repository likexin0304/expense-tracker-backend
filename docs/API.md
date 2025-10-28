# 记账应用后端 API 文档

## 目录
- [基本信息](#基本信息)
- [认证说明](#认证说明)
- [公共接口](#公共接口)
- [认证相关 API](#认证相关-api)
- [预算管理 API](#预算管理-api)
- [支出记录 API](#支出记录-api)
- [OCR自动识别 API](#ocr自动识别-api)
- [数据模型](#数据模型)
- [错误码说明](#错误码说明)
- [Supabase集成](#supabase集成)
- [iOS客户端集成指南](#ios客户端集成指南)
- [部署信息](#部署信息)

## 基本信息

**生产环境 URL:** `https://expense-tracker-backend-1mnvyo1le-likexin0304s-projects.vercel.app`  
**开发环境 URL:** `http://localhost:3000`

### ⚠️ 重要：前端URL配置更新

**问题**: 如果你的前端使用了错误的URL，会导致OCR自动记账功能失败。

**错误URL（请立即更新）**: `https://expense-tracker-backend-mocrhvaay-likexin0304s-projects.vercel.app`  
**正确URL**: `https://expense-tracker-backend-1mnvyo1le-likexin0304s-projects.vercel.app`

#### 🔧 前端立即修复步骤

1. **检查并更新API配置**:
   ```swift
   // ❌ 如果你的代码中有这个URL，请立即更新
   static let baseURL = "https://expense-tracker-backend-mocrhvaay-likexin0304s-projects.vercel.app"
   
   // ✅ 更新为正确的URL
   static let baseURL = "https://expense-tracker-backend-1mnvyo1le-likexin0304s-projects.vercel.app"
   ```

2. **验证修复**:
   ```swift
   // 测试健康检查端点
   let testURL = "\(APIConfig.baseURL)/health"
   // 应该返回: {"status":"OK",...}
   ```

3. **测试OCR自动记账功能**:
   ```swift
   // 确保OCR自动记账API正常工作
   let ocrURL = "\(APIConfig.baseURL)/api/ocr/parse-auto"
   ```

### 🔧 动态配置端点（推荐使用）

为避免URL混淆问题，强烈推荐使用动态配置：

**配置信息**: `GET /api/config`
```bash
curl https://expense-tracker-backend-1mnvyo1le-likexin0304s-projects.vercel.app/api/config
```

**Swift代码**: `GET /api/config/swift`
```bash
curl https://expense-tracker-backend-1mnvyo1le-likexin0304s-projects.vercel.app/api/config/swift
```

详细集成指南请参考: [前端配置指南](./frontend-config-guide.md)

**内容类型:** `application/json`

**认证方式:** Bearer Token (Supabase JWT)

**数据库:** Supabase PostgreSQL (已完成初始化)

**认证系统:** Supabase Auth + 自定义用户管理

**项目配置:**
- **Supabase 项目 ID:** `nlrtjnvwgsaavtpfccxg`
- **Supabase URL:** `https://nlrtjnvwgsaavtpfccxg.supabase.co`
- **数据库状态:** ✅ 已初始化完成
- **认证方式:** Supabase JWT Access Token
- **API 端点数量:** 29个 (包括8个OCR自动识别端点)

**响应格式:** 所有 API 返回统一的 JSON 格式：

```json
{
  "success": boolean,
  "message": string,
  "data": object | array (可选)
}
```

## ⚠️ 重要：URL格式和请求体要求

### 🔗 URL格式规范

**所有带有ID参数的API端点必须使用路径参数而不是查询参数：**

#### ✅ 正确的URL格式
```
GET /api/expense/8dbf136d-84d3-4b72-84bf-d7eb78c2dca0
PUT /api/expense/8dbf136d-84d3-4b72-84bf-d7eb78c2dca0
DELETE /api/expense/8dbf136d-84d3-4b72-84bf-d7eb78c2dca0
```

#### ❌ 错误的URL格式
```
GET /api/expense?id=8dbf136d-84d3-4b72-84bf-d7eb78c2dca0
PUT /api/expense?id=8dbf136d-84d3-4b72-84bf-d7eb78c2dca0
DELETE /api/expense?id=8dbf136d-84d3-4b72-84bf-d7eb78c2dca0
```

#### 📱 iOS客户端URL构建示例
```swift
// ✅ 正确的URL构建
let baseURL = "https://your-api-domain.com"
let expenseId = "8dbf136d-84d3-4b72-84bf-d7eb78c2dca0"
let url = "\(baseURL)/api/expense/\(expenseId)"  // 使用路径参数

// ❌ 错误的URL构建
let url = "\(baseURL)/api/expense?id=\(expenseId)"  // 使用查询参数
```

#### 🔧 URL格式错误响应
如果使用了错误的URL格式，服务器会返回详细的错误信息：
```json
{
  "success": false,
  "message": "URL格式错误",
  "error": {
    "received": "/api/expense?id=8dbf136d-84d3-4b72-84bf-d7eb78c2dca0",
    "correct": "/api/expense/8dbf136d-84d3-4b72-84bf-d7eb78c2dca0",
    "method": "DELETE",
    "description": "DELETE请求应使用路径参数而不是查询参数"
  },
  "help": {
    "correctFormat": "DELETE /api/expense/8dbf136d-84d3-4b72-84bf-d7eb78c2dca0",
    "incorrectFormat": "DELETE /api/expense?id=8dbf136d-84d3-4b72-84bf-d7eb78c2dca0",
    "documentation": "/api/debug/routes"
  }
}
```

### 📋 请求体格式规范

**所有POST/PUT/PATCH请求必须遵循以下格式要求：**

#### ✅ 正确格式
```javascript
// 请求头
Content-Type: application/json
Authorization: Bearer <your_jwt_token> // 如需认证

// 请求体 - 直接发送JSON对象
{
  "email": "user@example.com",
  "password": "yourpassword",
  "amount": 10000
}
```

#### ❌ 错误格式
```javascript
// 🚫 不要进行Base64编码
"eyJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20ifQ=="

// 🚫 不要进行双重JSON字符串化
"\"{\\\"email\\\":\\\"user@example.com\\\"}\""

// 🚫 不要发送字符串格式的JSON
"{\"email\":\"user@example.com\"}"
```

#### 📝 客户端发送示例
```javascript
// ✅ 正确的发送方式
fetch('/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your_token_here' // 如需认证
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'yourpassword'
  })
});

// ✅ 使用curl
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"yourpassword"}'
```

### 🔍 JSON解析错误处理

服务器提供智能的JSON解析错误检测和友好的错误提示：

#### Base64编码错误响应示例
```json
{
  "success": false,
  "message": "检测到Base64编码的JSON数据",
  "error": {
    "type": "JSON_PARSE_ERROR",
    "details": "Unexpected token '\"', \"\"eyJhbW91b\"... is not valid JSON",
    "suggestions": [
      "请直接发送JSON对象，不要进行Base64编码",
      "正确格式示例: {\"key\": \"value\"}",
      "检测到的原始数据: {\"amount\":10000}"
    ]
  },
  "help": {
    "correctFormat": "Content-Type: application/json + JSON object in body",
    "example": "{\"email\": \"user@example.com\", \"password\": \"yourpassword\"}",
    "documentation": "/api/debug/routes"
  }
}
```

#### 双重字符串化错误响应示例
```json
{
  "success": false,
  "message": "检测到双重JSON字符串化",
  "error": {
    "type": "JSON_PARSE_ERROR",
    "suggestions": [
      "请避免对JSON进行双重字符串化",
      "使用 JSON.stringify(object) 而不是 JSON.stringify(JSON.stringify(object))"
    ]
  }
}
```

## 认证说明

### 🔐 认证架构

本项目使用 **Supabase Auth + 自定义用户管理** 的混合认证架构：

- **认证服务**: Supabase Auth
- **令牌类型**: Supabase JWT Access Token  
- **令牌验证**: Supabase Auth API
- **用户管理**: 自定义User模型 + Supabase数据库
- **权限控制**: 自定义认证中间件

### 🎫 令牌使用

除了公共接口外，所有API都需要在请求头中包含Supabase访问令牌：

```
Authorization: Bearer <supabase_access_token>
```

**令牌特性**：
- 令牌通过登录接口获取
- 由Supabase Auth服务生成和验证
- 令牌包含用户身份信息
- 支持令牌黑名单机制（用户删除时）

## 公共接口

### 健康检查

**GET /health**

检查服务器状态

**响应示例:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "env": "development"
}
```

### 获取可用路由列表

**GET /api/debug/routes**

获取所有可用的API路由列表和格式要求（用于调试）

**响应示例:**
```json
{
  "message": "费用追踪后端API文档",
  "requestFormat": {
    "contentType": "application/json",
    "authHeader": "Authorization: Bearer <your_jwt_token>",
    "bodyFormat": "JSON对象 (不要进行base64编码或双重字符串化)",
    "example": {
      "correct": "{\"email\": \"user@example.com\", \"password\": \"password123\"}",
      "incorrect": [
        "\"eyJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20ifQ==\"  // Base64编码",
        "\"{\\\"email\\\":\\\"user@example.com\\\"}\"      // 双重字符串化",
        "\"{\"email\":\"user@example.com\"}\"            // 字符串格式JSON"
      ]
    }
  },
  "available_routes": [
    "GET /health",
    "GET /api/debug/routes",
    "POST /api/auth/register",
    "POST /api/auth/login",
    "GET /api/auth/me",
    "DELETE /api/auth/account",
    "GET /api/auth/debug/users (仅开发环境)",
    "POST /api/budget",
    "GET /api/budget/current",
    "GET /api/budget/alerts",
    "GET /api/budget/suggestions",
    "GET /api/budget/history",
    "GET /api/budget/:year/:month",
    "DELETE /api/budget/:budgetId",
    "POST /api/expense",
    "GET /api/expense",
    "GET /api/expense/stats",
    "GET /api/expense/categories",
    "GET /api/expense/export",
    "GET /api/expense/trends",
    "GET /api/expense/:id",
    "PUT /api/expense/:id",
    "DELETE /api/expense/:id",
    "POST /api/ocr/parse",
    "POST /api/ocr/parse-auto (🆕 自动创建)",
    "POST /api/ocr/confirm/:recordId",
    "GET /api/ocr/records",
    "GET /api/ocr/records/:recordId",
    "DELETE /api/ocr/records/:recordId",
    "GET /api/ocr/statistics",
    "GET /api/ocr/merchants",
    "POST /api/ocr/merchants/match",
    "GET /api/ocr/shortcuts/generate (🆕 iOS快捷指令)"
  ],
  "errorHandling": {
    "jsonParseErrors": "会提供详细的格式错误提示和修复建议",
    "authErrors": "会提供认证相关的错误信息",
    "validationErrors": "会提供字段验证错误详情"
  }
}
```

## 认证相关 API

### 用户注册

**POST /api/auth/register**

使用Supabase Auth创建新用户账户

**认证流程**：
1. 使用Supabase Admin API创建用户
2. 自动确认邮箱（跳过验证步骤）
3. 创建用户profile记录
4. 返回Supabase访问令牌

**请求体:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "confirmPassword": "password123"
}
```

**成功响应 (201):**
```json
{
  "success": true,
  "message": "注册成功",
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**错误响应 (400):**
```json
{
  "success": false,
  "message": "该邮箱已被注册"
}
```

### 用户登录

**POST /api/auth/login**

使用Supabase Auth验证用户凭证并获取访问令牌

**认证流程**：
1. 使用Supabase Auth API验证邮箱密码
2. 获取Supabase访问令牌
3. 查询用户profile信息
4. 返回用户信息和访问令牌

**请求体:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**成功响应 (200):**
```json
{
  "success": true,
  "message": "登录成功",
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**错误响应 (401):**
```json
{
  "success": false,
  "message": "邮箱或密码错误"
}
```

### 获取当前用户信息

**GET /api/auth/me**

获取已认证用户的详细信息

**认证流程**：
1. 验证Supabase访问令牌
2. 从令牌中提取用户ID
3. 查询用户profile信息
4. 返回用户详细信息

**请求头:**
```
Authorization: Bearer <supabase_access_token>
```

**成功响应 (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

### 删除账号

**DELETE /api/auth/account**

软删除用户账号，账号删除后数据保留但无法访问

**删除流程**：
1. 验证Supabase访问令牌
2. 验证确认文本
3. 在profiles表中标记为已删除
4. 使用Supabase Admin API禁用用户
5. 将令牌加入黑名单

**请求头:**
```
Authorization: Bearer <supabase_access_token>
```

**请求体:**
```json
{
  "confirmationText": "我确认"
}
```

> 注意：
> - 确认文本必须包含"我确认"三个字
> - 删除后账号无法恢复
> - 所有相关访问令牌将立即失效
> - 用户数据会被保留但标记为已删除
> - 使用Supabase Admin API禁用用户认证

**成功响应 (200):**
```json
{
  "success": true,
  "message": "账号已成功删除",
  "data": {
    "deletedAt": "2024-01-15T15:30:00.000Z",
    "message": "您的账号已被永久删除，所有相关数据已保留但无法访问。感谢您使用我们的服务。"
  }
}
```

**错误响应 (400) - 确认文本错误:**
```json
{
  "success": false,
  "message": "确认文本不正确，请输入包含\"我确认\"的文本"
}
```

**错误响应 (400) - 账号已删除:**
```json
{
  "success": false,
  "message": "账号已经被删除"
}
```

### 获取所有用户列表 (调试用)

**GET /api/auth/debug/users**

获取所有注册用户的列表（仅用于开发调试，不包含已删除用户）

**成功响应 (200):**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": 1,
        "email": "user1@example.com",
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ]
  }
}
```

## 预算管理 API

### 设置月度预算

**POST /api/budget**

设置或更新指定月份的预算

**请求头:**
```
Authorization: Bearer <token>
```

**请求体:**
```json
{
  "amount": 5000.00,
  "year": 2024,
  "month": 1
}
```

> 注意：year 和 month 为可选参数，如果不提供则使用当前年月

**成功响应 (200):**
```json
{
  "success": true,
  "message": "预算设置成功",
  "data": {
    "budget": {
      "id": 1,
      "userId": 1,
      "amount": 5000.00,
      "year": 2024,
      "month": 1,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

**错误响应 (400):**
```json
{
  "success": false,
  "message": "请输入有效的预算金额"
}
```

### 获取当前预算状态

**GET /api/budget/current**

获取当前月份的预算和支出统计

**请求头:**
```
Authorization: Bearer <token>
```

**成功响应 (200):**
```json
{
  "success": true,
  "data": {
    "budget": {
      "id": 1,
      "userId": 1,
      "amount": 5000.00,
      "year": 2024,
      "month": 1,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    },
    "statistics": {
      "budgetAmount": 5000.00,
      "totalExpenses": 1250.50,
      "remainingBudget": 3749.50,
      "usagePercentage": 25.01,
      "year": 2024,
      "month": 1
    }
  }
}
```

### 获取预算提醒和预警

**GET /api/budget/alerts**

获取当前预算的提醒和预警信息

**请求头:**
```
Authorization: Bearer <token>
```

**成功响应 (200):**
```json
{
  "success": true,
  "data": {
    "alerts": [
      {
        "type": "warning",
        "level": "medium",
        "title": "预算使用提醒",
        "message": "本月预算已使用 75.5%，请注意控制支出",
        "percentage": 75.5,
        "icon": "💡"
      }
    ],
    "summary": {
      "budgetAmount": 3000,
      "totalExpenses": 2265,
      "usagePercentage": 75.5,
      "remainingDays": 15,
      "dailyAverage": 150.43,
      "projectedMonthlySpend": 4513.3
    }
  }
}
```

### 获取预算建议

**GET /api/budget/suggestions**

基于历史数据获取个性化预算建议

**请求头:**
```
Authorization: Bearer <token>
```

**成功响应 (200):**
```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "type": "suggestion",
        "title": "预算建议",
        "message": "根据您的历史支出数据，建议设置月预算为 ¥3300",
        "icon": "💰",
        "data": {
          "suggestedAmount": 3300,
          "averageSpend": 3000,
          "basis": "基于历史平均支出 + 10% 缓冲"
        }
      },
      {
        "type": "insight",
        "title": "支出分析",
        "message": "您在\"餐饮\"类别的支出最多，占总支出的 35.2%",
        "icon": "📊",
        "data": {
          "category": "餐饮",
          "amount": 1056,
          "percentage": 35.2
        }
      }
    ],
    "statistics": {
      "totalMonths": 6,
      "averageMonthlySpend": 3000,
      "suggestedBudget": 3300,
      "topCategory": "餐饮"
    }
  }
}
```

### 获取预算历史

**GET /api/budget/history**

获取用户所有历史预算记录

**请求头:**
```
Authorization: Bearer <token>
```

**成功响应 (200):**
```json
{
  "success": true,
  "data": {
    "budgets": [
      {
        "id": 1,
        "userId": 1,
        "amount": 5000.00,
        "year": 2024,
        "month": 1,
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z"
      }
    ]
  }
}
```

### 获取指定月份预算

**GET /api/budget/:year/:month**

获取指定年月的预算信息

**请求头:**
```
Authorization: Bearer <token>
```

**路径参数:**
- `year`: 年份 (如: 2024)
- `month`: 月份 (1-12)

**成功响应 (200):**
```json
{
  "success": true,
  "data": {
    "budget": {
      "id": 1,
      "userId": 1,
      "amount": 5000.00,
      "year": 2024,
      "month": 1,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    },
    "totalExpenses": 1250.50
  }
}
```

### 删除预算

**DELETE /api/budget/:budgetId**

删除指定的预算记录

**请求头:**
```
Authorization: Bearer <token>
```

**路径参数:**
- `budgetId`: 预算ID

**成功响应 (200):**
```json
{
  "success": true,
  "message": "预算删除成功"
}
```

**错误响应 (404):**
```json
{
  "success": false,
  "message": "预算不存在"
}
```

## 支出记录 API

### 创建支出记录

**POST /api/expense**

创建新的支出记录

**请求头:**
```
Authorization: Bearer <token>
```

**请求体:**
```json
{
  "amount": 299.99,
  "category": "餐饮",
  "description": "午餐费用",
  "date": "2024-01-15T12:30:00.000Z",
  "location": "北京市朝阳区",
  "paymentMethod": "支付宝",
  "tags": ["工作餐", "午餐"]
}
```

> 注意：
> - `amount` 和 `category`、`description` 为必填字段
> - `date` 不提供时默认为当前时间
> - `paymentMethod` 默认为 "cash"
> - `tags` 默认为空数组

**成功响应 (201):**
```json
{
  "success": true,
  "message": "支出记录创建成功",
  "data": {
    "id": 1,
    "userId": 1,
    "amount": 299.99,
    "category": "餐饮",
    "description": "午餐费用",
    "date": "2024-01-15T12:30:00.000Z",
    "location": "北京市朝阳区",
    "paymentMethod": "支付宝",
    "tags": ["工作餐", "午餐"],
    "createdAt": "2024-01-15T12:35:00.000Z",
    "updatedAt": "2024-01-15T12:35:00.000Z"
  }
}
```

**错误响应 (400):**
```json
{
  "success": false,
  "message": "金额必须大于0"
}
```

### 获取支出记录列表

**GET /api/expense**

获取用户的支出记录列表，支持分页和筛选

**请求头:**
```
Authorization: Bearer <token>
```

**查询参数:**
- `page` (可选): 页码，默认为 1
- `limit` (可选): 每页记录数，默认为 20
- `category` (可选): 按分类筛选
- `startDate` (可选): 开始日期 (ISO 8601格式)
- `endDate` (可选): 结束日期 (ISO 8601格式)
- `sortBy` (可选): 排序字段 ("date" 或 "amount")，默认为 "date"
- `sortOrder` (可选): 排序方向 ("asc" 或 "desc")，默认为 "desc"

**请求示例:**
```
GET /api/expense?page=1&limit=10&category=餐饮&startDate=2024-01-01&endDate=2024-01-31
```

**成功响应 (200):**
```json
{
  "success": true,
  "data": {
    "expenses": [
      {
        "id": 1,
        "userId": 1,
        "amount": 299.99,
        "category": "餐饮",
        "description": "午餐费用",
        "date": "2024-01-15T12:30:00.000Z",
        "location": "北京市朝阳区",
        "paymentMethod": "支付宝",
        "tags": ["工作餐", "午餐"],
        "createdAt": "2024-01-15T12:35:00.000Z",
        "updatedAt": "2024-01-15T12:35:00.000Z"
      }
    ],
    "pagination": {
      "current": 1,
      "pages": 5,
      "total": 100,
      "limit": 20
    }
  }
}
```

### 获取单个支出记录

**GET /api/expense/:id**

根据ID获取单个支出记录的详细信息

**请求头:**
```
Authorization: Bearer <token>
```

**路径参数:**
- `id`: 支出记录ID（UUID格式）

**⚠️ URL格式要求:**
```
✅ 正确: GET /api/expense/8dbf136d-84d3-4b72-84bf-d7eb78c2dca0
❌ 错误: GET /api/expense?id=8dbf136d-84d3-4b72-84bf-d7eb78c2dca0
```

**成功响应 (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "userId": 1,
    "amount": 299.99,
    "category": "餐饮",
    "description": "午餐费用",
    "date": "2024-01-15T12:30:00.000Z",
    "location": "北京市朝阳区",
    "paymentMethod": "支付宝",
    "tags": ["工作餐", "午餐"],
    "createdAt": "2024-01-15T12:35:00.000Z",
    "updatedAt": "2024-01-15T12:35:00.000Z"
  }
}
```

**错误响应 (404):**
```json
{
  "success": false,
  "message": "支出记录不存在"
}
```

### 更新支出记录

**PUT /api/expense/:id**

更新指定的支出记录

**请求头:**
```
Authorization: Bearer <token>
```

**路径参数:**
- `id`: 支出记录ID（UUID格式）

**⚠️ URL格式要求:**
```
✅ 正确: PUT /api/expense/8dbf136d-84d3-4b72-84bf-d7eb78c2dca0
❌ 错误: PUT /api/expense?id=8dbf136d-84d3-4b72-84bf-d7eb78c2dca0
```

**请求体:**
```json
{
  "amount": 199.99,
  "category": "餐饮",
  "description": "修改后的午餐费用",
  "date": "2024-01-15T12:30:00.000Z",
  "location": "北京市海淀区",
  "paymentMethod": "微信支付",
  "tags": ["工作餐"]
}
```

> 注意：所有字段都是可选的，只更新提供的字段

**成功响应 (200):**
```json
{
  "success": true,
  "message": "支出记录更新成功",
  "data": {
    "id": 1,
    "userId": 1,
    "amount": 199.99,
    "category": "餐饮",
    "description": "修改后的午餐费用",
    "date": "2024-01-15T12:30:00.000Z",
    "location": "北京市海淀区",
    "paymentMethod": "微信支付",
    "tags": ["工作餐"],
    "createdAt": "2024-01-15T12:35:00.000Z",
    "updatedAt": "2024-01-15T15:20:00.000Z"
  }
}
```

**错误响应 (404):**
```json
{
  "success": false,
  "message": "支出记录不存在"
}
```

**错误响应 (403):**
```json
{
  "success": false,
  "message": "无权访问该支出记录"
}
```

### 删除支出记录

**DELETE /api/expense/:id**

删除指定的支出记录

**请求头:**
```
Authorization: Bearer <token>
```

**路径参数:**
- `id`: 支出记录ID（UUID格式）

**⚠️ 重要：URL格式要求**

✅ **正确格式:**
```
DELETE /api/expense/8dbf136d-84d3-4b72-84bf-d7eb78c2dca0
```

❌ **错误格式:**
```
DELETE /api/expense?id=8dbf136d-84d3-4b72-84bf-d7eb78c2dca0
```

**iOS客户端示例:**
```swift
// ✅ 正确的URL构建
let expenseId = "8dbf136d-84d3-4b72-84bf-d7eb78c2dca0"
let url = "\(baseURL)/api/expense/\(expenseId)"  // 路径参数

// ❌ 错误的URL构建  
let url = "\(baseURL)/api/expense?id=\(expenseId)"  // 查询参数
```

**成功响应 (200):**
```json
{
  "success": true,
  "message": "支出记录删除成功"
}
```

**错误响应 (400) - URL格式错误:**
```json
{
  "success": false,
  "message": "URL格式错误",
  "error": {
    "received": "/api/expense?id=8dbf136d-84d3-4b72-84bf-d7eb78c2dca0",
    "correct": "/api/expense/8dbf136d-84d3-4b72-84bf-d7eb78c2dca0",
    "method": "DELETE",
    "description": "DELETE请求应使用路径参数而不是查询参数"
  },
  "help": {
    "correctFormat": "DELETE /api/expense/8dbf136d-84d3-4b72-84bf-d7eb78c2dca0",
    "incorrectFormat": "DELETE /api/expense?id=8dbf136d-84d3-4b72-84bf-d7eb78c2dca0",
    "documentation": "/api/debug/routes"
  }
}
```

**错误响应 (404):**
```json
{
  "success": false,
  "message": "支出记录不存在"
}
```

### 获取支出分类列表

**GET /api/expense/categories**

获取所有可用的支出分类列表

**请求头:**
```
Authorization: Bearer <token>
```

**成功响应 (200):**
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "value": "food",
        "label": "餐饮",
        "icon": "🍽️"
      },
      {
        "value": "transport",
        "label": "交通",
        "icon": "🚗"
      },
      {
        "value": "entertainment",
        "label": "娱乐",
        "icon": "🎮"
      },
      {
        "value": "shopping",
        "label": "购物",
        "icon": "🛒"
      },
      {
        "value": "bills",
        "label": "账单",
        "icon": "📄"
      },
      {
        "value": "healthcare",
        "label": "医疗",
        "icon": "💊"
      },
      {
        "value": "education",
        "label": "教育",
        "icon": "📚"
      },
      {
        "value": "travel",
        "label": "旅行",
        "icon": "✈️"
      },
      {
        "value": "other",
        "label": "其他",
        "icon": "📝"
      }
    ],
    "total": 9
  }
}
```

### 导出支出数据

**GET /api/expense/export**

导出用户的支出数据，支持JSON和CSV格式

**请求头:**
```
Authorization: Bearer <token>
```

**查询参数:**
- `format` (可选): 导出格式 ("json" 或 "csv")，默认为 "json"
- `startDate` (可选): 开始日期 (ISO 8601格式)
- `endDate` (可选): 结束日期 (ISO 8601格式)
- `category` (可选): 按分类筛选
- `download` (可选): 是否作为文件下载 ("true" 或 "false")，默认为 "false"

**请求示例:**
```
GET /api/expense/export?format=csv&startDate=2024-01-01&endDate=2024-01-31&download=true
```

**JSON格式响应 (200):**
```json
{
  "success": true,
  "data": {
    "exportInfo": {
      "exportDate": "2024-01-15T10:30:00.000Z",
      "totalRecords": 25,
      "dateRange": {
        "start": "2024-01-01",
        "end": "2024-01-31"
      },
      "category": "全部分类"
    },
    "expenses": [
      {
        "id": 1,
        "amount": 299.99,
        "category": "food",
        "description": "午餐费用",
        "date": "2024-01-15T12:30:00.000Z",
        "location": "北京市朝阳区",
        "paymentMethod": "支付宝",
        "tags": ["工作餐", "午餐"],
        "createdAt": "2024-01-15T12:35:00.000Z",
        "updatedAt": "2024-01-15T12:35:00.000Z"
      }
    ]
  }
}
```

**CSV格式响应 (200):**
```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="expenses_2024-01-15.csv"

ID,金额,分类,描述,日期,地点,支付方式,标签,创建时间
1,299.99,food,"午餐费用",2024-01-15,北京市朝阳区,支付宝,工作餐;午餐,2024-01-15
```

### 获取支出趋势分析

**GET /api/expense/trends**

获取支出趋势分析数据，支持按天、周、月分组统计

**请求头:**
```
Authorization: Bearer <token>
```

**查询参数:**
- `period` (可选): 统计周期 ("day", "week", "month")，默认为 "month"
- `limit` (可选): 返回的时间段数量，默认为 12

**请求示例:**
```
GET /api/expense/trends?period=month&limit=6
```

**成功响应 (200):**
```json
{
  "success": true,
  "data": {
    "period": "month",
    "trends": [
      {
        "period": "2024-01",
        "totalAmount": 3550.75,
        "count": 65,
        "categories": {
          "food": 1250.50,
          "transport": 680.00,
          "entertainment": 420.25,
          "shopping": 1200.00
        }
      },
      {
        "period": "2023-12",
        "totalAmount": 2890.30,
        "count": 52,
        "categories": {
          "food": 980.20,
          "transport": 560.10,
          "entertainment": 350.00,
          "shopping": 1000.00
        }
      }
    ],
    "analysis": {
      "totalPeriods": 6,
      "averagePerPeriod": 3220.53,
      "highestPeriod": {
        "period": "2024-01",
        "totalAmount": 3550.75,
        "count": 65,
        "categories": {
          "food": 1250.50,
          "transport": 680.00,
          "entertainment": 420.25,
          "shopping": 1200.00
        }
      },
      "lowestPeriod": {
        "period": "2023-12",
        "totalAmount": 2890.30,
        "count": 52,
        "categories": {
          "food": 980.20,
          "transport": 560.10,
          "entertainment": 350.00,
          "shopping": 1000.00
        }
      }
    }
  }
}
```

### 获取支出统计

**GET /api/expense/stats**

获取用户的支出统计数据

**请求头:**
```
Authorization: Bearer <token>
```

**查询参数:**
- `startDate` (可选): 开始日期 (ISO 8601格式)
- `endDate` (可选): 结束日期 (ISO 8601格式)
- `period` (可选): 统计周期 ("month", "week", "day")，默认为 "month"

**请求示例:**
```
GET /api/expense/stats?startDate=2024-01-01&endDate=2024-01-31&period=month
```

**成功响应 (200):**
```json
{
  "success": true,
  "data": {
    "categoryStats": [
      {
        "category": "餐饮",
        "totalAmount": 1250.50,
        "count": 25,
        "percentage": 35.2
      },
      {
        "category": "交通",
        "totalAmount": 680.00,
        "count": 15,
        "percentage": 19.1
      }
    ],
    "totalStats": {
      "totalAmount": 3550.75,
      "totalCount": 65,
      "avgAmount": 54.62,
      "maxAmount": 299.99,
      "minAmount": 5.50
    },
    "periodStats": []
  }
}
```

## OCR自动识别 API

### 🔍 功能概述

OCR自动识别功能可以自动解析账单文本，提取商户、金额、日期等信息，并智能匹配预置商户数据库，最终生成支出记录。

**主要特性:**
- 🤖 智能文本解析：自动识别金额、日期、商户名称
- 🏪 商户智能匹配：基于150+预置商户数据库进行智能匹配
- 📊 置信度评分：每个解析结果都有置信度评分
- 🔄 结果确认流程：用户可以审核并修正解析结果
- 📈 统计分析：提供OCR识别成功率和使用统计

**🆕 新增功能:**
- ✅ 智能自动确认：高置信度时自动创建支出记录
- ✅ iOS快捷指令生成：一键生成iOS快捷指令配置
- ✅ URL路径验证：避免常见的路径重复错误

### 📱 自动记账完整流程

#### 方案1：智能自动创建（推荐）
**适用场景**: 手机点击背后3次，自动截图并识别账单信息

```
用户操作 → 截图 → OCR识别 → 自动解析 → 高置信度自动创建支出记录
```

**API调用流程**:
1. **直接调用自动解析API**: `POST /api/ocr/parse-auto`
2. **根据响应处理结果**:
   - 如果 `autoCreated: true` → 显示成功提示
   - 如果 `autoCreated: false` → 跳转到确认页面

**示例代码**:
```swift
// 1. 调用自动解析API
let response = try await ocrService.parseTextAndAutoCreate(ocrText, threshold: 0.85)

if response.data.autoCreated {
    // 自动创建成功
    showSuccessMessage("✅ 自动记账成功: \(response.data.expense.description) ¥\(response.data.expense.amount)")
} else {
    // 需要用户确认
    showConfirmationView(recordId: response.data.recordId, parsedData: response.data.parsedData)
}
```

#### 方案2：两步确认流程
**适用场景**: 需要用户确认的场景

```
用户操作 → 截图 → OCR识别 → 解析结果 → 用户确认 → 创建支出记录
```

**API调用流程**:
1. **解析OCR文本**: `POST /api/ocr/parse`
2. **用户确认并创建**: `POST /api/ocr/confirm/:recordId`

**示例代码**:
```swift
// 1. 解析OCR文本
let parseResponse = try await ocrService.parseText(ocrText)
let recordId = parseResponse.data.recordId

// 2. 显示确认界面，用户修正后确认
let corrections = getUserCorrections() // 用户修正的数据
let expense = try await ocrService.confirmAndCreateExpense(recordId: recordId, corrections: corrections)

showSuccessMessage("✅ 支出记录创建成功: \(expense.description)")
```

#### 核心API端点

| API端点 | 用途 | 返回结果 |
|---------|------|----------|
| `POST /api/ocr/parse-auto` | 智能解析+自动创建 | 高置信度自动创建，低置信度返回解析结果 |
| `POST /api/ocr/parse` | 基础解析 | 返回解析结果，需要用户确认 |
| `POST /api/ocr/confirm/:recordId` | 确认并创建支出 | 创建支出记录 |

#### 置信度阈值说明

- **≥ 0.85**: 高置信度，建议自动创建
- **0.6 - 0.84**: 中等置信度，建议用户确认
- **< 0.6**: 低置信度，需要用户仔细检查

### 🍎 iOS AutoExpenseService 完整实现

#### 服务类定义
```swift
import Foundation

class AutoExpenseService {
    private let apiConfig = APIConfig()
    
    // MARK: - 主要方法
    
    /// 自动记账主流程 - 推荐用于"点击背后3次"功能
    func processReceiptText(_ text: String, threshold: Double = 0.85) async throws -> AutoExpenseResult {
        do {
            // 调用自动解析API
            let response = try await parseTextAndAutoCreate(text, threshold: threshold)
            
            if response.data.autoCreated {
                // 自动创建成功
                return .autoCreated(response.data.expense!)
            } else {
                // 需要用户确认
                return .needsConfirmation(
                    recordId: response.data.recordId!,
                    parsedData: response.data.parsedData,
                    confidence: response.data.confidence
                )
            }
        } catch APIError.badRequest {
            throw AutoExpenseError.configurationError
        } catch APIError.unauthorized {
            throw AutoExpenseError.authenticationRequired
        } catch {
            throw AutoExpenseError.processingFailed(error.localizedDescription)
        }
    }
    
    /// 确认并创建支出记录
    func confirmAndCreateExpense(recordId: String, corrections: ExpenseCorrections) async throws -> Expense {
        let url = "\(apiConfig.baseURL)/api/ocr/confirm/\(recordId)"
        var request = URLRequest(url: URL(string: url)!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        // 添加认证头部
        if let token = UserDefaults.standard.string(forKey: "access_token") {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        // 构建请求体
        let requestData: [String: Any] = [
            "amount": corrections.amount,
            "category": corrections.category,
            "description": corrections.description,
            "date": corrections.date?.iso8601String() ?? Date().iso8601String(),
            "location": corrections.location ?? "",
            "paymentMethod": corrections.paymentMethod ?? "cash",
            "tags": corrections.tags ?? []
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: requestData)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              200...299 ~= httpResponse.statusCode else {
            throw APIError.serverError((response as? HTTPURLResponse)?.statusCode ?? 0)
        }
        
        let responseModel = try JSONDecoder().decode(ExpenseResponse.self, from: data)
        return responseModel.data.expense
    }
    
    // MARK: - 私有方法
    
    private func parseTextAndAutoCreate(_ text: String, threshold: Double) async throws -> OCRAutoResponse {
        let url = "\(apiConfig.baseURL)/api/ocr/parse-auto"
        var request = URLRequest(url: URL(string: url)!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        if let token = UserDefaults.standard.string(forKey: "access_token") {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        let requestData: [String: Any] = [
            "text": text,
            "autoCreateThreshold": threshold
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: requestData)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        switch httpResponse.statusCode {
        case 200...299:
            return try JSONDecoder().decode(OCRAutoResponse.self, from: data)
        case 400:
            throw APIError.badRequest
        case 401:
            throw APIError.unauthorized
        default:
            throw APIError.serverError(httpResponse.statusCode)
        }
    }
}

// MARK: - 数据模型

enum AutoExpenseResult {
    case autoCreated(Expense)
    case needsConfirmation(recordId: String, parsedData: ParsedData, confidence: Double)
}

enum AutoExpenseError: Error {
    case configurationError
    case authenticationRequired
    case processingFailed(String)
    
    var description: String {
        switch self {
        case .configurationError:
            return "API配置错误，请检查URL设置"
        case .authenticationRequired:
            return "需要重新登录"
        case .processingFailed(let message):
            return "处理失败: \(message)"
        }
    }
}

struct ExpenseCorrections {
    let amount: Double
    let category: String
    let description: String
    let date: Date?
    let location: String?
    let paymentMethod: String?
    let tags: [String]?
}

// MARK: - 响应模型

struct OCRAutoResponse: Codable {
    let success: Bool
    let message: String
    let data: OCRAutoData
}

struct OCRAutoData: Codable {
    let autoCreated: Bool
    let expense: Expense?
    let recordId: String?
    let confidence: Double
    let parsedData: ParsedData
}

struct ExpenseResponse: Codable {
    let success: Bool
    let message: String
    let data: ExpenseData
}

struct ExpenseData: Codable {
    let expense: Expense
}
```

#### 使用示例
```swift
class ReceiptScanViewController: UIViewController {
    private let autoExpenseService = AutoExpenseService()
    
    // 手机点击背后3次触发的方法
    @objc func handleTripleTap() {
        Task {
            do {
                // 1. 截图并进行OCR识别
                let screenshot = takeScreenshot()
                let ocrText = try await performOCR(on: screenshot)
                
                // 2. 处理OCR文本
                let result = try await autoExpenseService.processReceiptText(ocrText)
                
                await MainActor.run {
                    switch result {
                    case .autoCreated(let expense):
                        showAutoCreatedAlert(expense: expense)
                    case .needsConfirmation(let recordId, let parsedData, let confidence):
                        showConfirmationView(recordId: recordId, parsedData: parsedData, confidence: confidence)
                    }
                }
            } catch {
                await MainActor.run {
                    showErrorAlert(error: error)
                }
            }
        }
    }
    
    private func showAutoCreatedAlert(expense: Expense) {
        let alert = UIAlertController(
            title: "✅ 自动记账成功",
            message: "已自动创建支出记录：\(expense.description) ¥\(expense.amount)",
            preferredStyle: .alert
        )
        alert.addAction(UIAlertAction(title: "确定", style: .default))
        present(alert, animated: true)
    }
    
    private func showConfirmationView(recordId: String, parsedData: ParsedData, confidence: Double) {
        let confirmVC = ExpenseConfirmationViewController(
            recordId: recordId,
            parsedData: parsedData,
            confidence: confidence,
            onConfirm: { [weak self] corrections in
                Task {
                    do {
                        let expense = try await self?.autoExpenseService.confirmAndCreateExpense(
                            recordId: recordId,
                            corrections: corrections
                        )
                        await MainActor.run {
                            self?.showSuccessAlert(expense: expense!)
                        }
                    } catch {
                        await MainActor.run {
                            self?.showErrorAlert(error: error)
                        }
                    }
                }
            }
        )
        present(confirmVC, animated: true)
    }
}
```

### 1. 解析OCR文本（基础版）

**POST** `/api/ocr/parse`

解析OCR识别的文本，提取商户、金额、日期等信息。

#### 请求参数
```json
{
  "text": "麦当劳 2024-01-15 消费金额：¥25.80 支付方式：支付宝"
}
```

#### 成功响应 (200)
```json
{
  "success": true,
  "message": "OCR文本解析完成",
  "data": {
    "record": {
      "id": "uuid",
      "originalText": "麦当劳 2024-01-15 消费金额：¥25.80 支付方式：支付宝",
      "parsedData": {
        "merchant": {
          "name": "麦当劳",
          "category": "餐饮",
          "confidence": 1.0,
          "matchType": "exact_name"
        },
        "amount": {
          "value": 25.80,
          "confidence": 0.95,
          "originalText": "¥25.80"
        },
        "date": {
          "value": "2024-01-15",
          "confidence": 0.9,
          "originalText": "2024-01-15"
        },
        "paymentMethod": {
          "value": "支付宝",
          "confidence": 0.8,
          "originalText": "支付宝"
        },
        "category": {
          "value": "餐饮",
          "confidence": 0.9,
          "source": "merchant_match"
        }
      },
      "confidenceScore": 0.93,
      "status": "success",
      "suggestions": {
        "autoCreate": true,
        "needsReview": false,
        "confidence": "high"
      },
      "createdAt": "2024-01-15T10:30:00Z"
    }
  }
}
```

#### 错误响应 (400)
```json
{
  "success": false,
  "message": "OCR文本解析失败",
  "error": {
    "type": "PARSE_ERROR",
    "details": "无法从文本中提取有效信息",
    "suggestions": [
      "请确保文本包含金额信息",
      "检查文本格式是否正确",
      "可以尝试重新拍照或调整图片质量"
    ]
  }
}
```

### 1.5. 🆕 智能解析并自动创建支出记录

**POST** `/api/ocr/parse-auto`

解析OCR文本，当置信度足够高时自动创建支出记录，跳过用户确认步骤。

#### 请求参数
```json
{
  "text": "麦当劳 2024-01-15 消费金额：¥25.80 支付方式：支付宝",
  "autoCreateThreshold": 0.85
}
```

#### 成功响应 - 自动创建 (201)
```json
{
  "success": true,
  "message": "自动识别并创建支出记录成功",
  "data": {
    "autoCreated": true,
    "recordId": "ocr-uuid",
    "expense": {
      "id": "expense-uuid",
      "amount": 25.80,
      "category": "food",
      "description": "麦当劳",
      "date": "2024-01-15",
      "paymentMethod": "online",
      "tags": ["自动创建", "OCR识别"],
      "createdAt": "2024-01-15T10:35:00Z"
    },
    "ocrRecord": {
      "id": "ocr-uuid",
      "originalText": "麦当劳 2024-01-15 消费金额：¥25.80 支付方式：支付宝",
      "parsedData": { /* 原始解析数据 */ },
      "confidenceScore": 0.93,
      "status": "confirmed",
      "expenseId": "expense-uuid"
    },
    "parsedData": {
      "amount": {
        "value": 25.80,
        "confidence": 0.98
      },
      "merchant": {
        "name": "麦当劳",
        "confidence": 0.95
      },
      "date": {
        "value": "2024-01-15",
        "confidence": 0.90
      },
      "category": {
        "name": "餐饮",
        "confidence": 0.85
      },
      "paymentMethod": {
        "type": "支付宝",
        "confidence": 0.92
      },
      "originalText": "麦当劳 2024-01-15 消费金额：¥25.80 支付方式：支付宝"
    },
    "confidence": 0.93,
    "suggestions": {
      "shouldAutoCreate": true,
      "needsReview": false,
      "reason": "置信度 0.93 达到自动创建阈值"
    }
  }
}
```

#### 成功响应 - 需要确认 (200)
```json
{
  "success": true,
  "message": "解析成功，需要用户确认",
  "data": {
    "autoCreated": false,
    "recordId": "ocr-uuid",
    "expense": null,
    "ocrRecord": {
      "id": "ocr-uuid",
      "originalText": "识别的文本内容",
      "parsedData": { /* 原始解析数据 */ },
      "confidenceScore": 0.65,
      "status": "success"
    },
    "parsedData": {
      "amount": {
        "value": 25.80,
        "confidence": 0.70
      },
      "merchant": {
        "name": "麦当劳",
        "confidence": 0.60
      },
      "date": {
        "value": "2024-01-15",
        "confidence": 0.50
      },
      "category": {
        "name": "餐饮",
        "confidence": 0.80
      },
      "paymentMethod": {
        "type": "支付宝",
        "confidence": 0.70
      },
      "originalText": "识别的文本内容"
    },
    "confidence": 0.65,
    "suggestions": {
      "shouldAutoCreate": false,
      "needsReview": true,
      "reason": "置信度 0.65 低于阈值 0.85"
    }
  }
}
```

#### 错误响应 - 文本解析失败 (400)
```json
{
  "success": false,
  "message": "文本解析失败",
  "error": "PARSE_FAILED",
  "data": {
    "recordId": "ocr-uuid"
  }
}
```

### 2. 确认并创建支出记录

**POST** `/api/ocr/confirm/:recordId`

确认OCR解析结果并创建支出记录。

**请求头:**
```
Authorization: Bearer <token>
```

**路径参数:**
- `recordId`: OCR记录ID（UUID格式）

#### 请求参数
```json
{
  "amount": 26.00,
  "category": "food", 
  "description": "麦当劳午餐",
  "date": "2024-01-15T12:30:00.000Z",
  "location": "北京市朝阳区",
  "paymentMethod": "online",
  "tags": ["OCR识别", "午餐"]
}
```

> **注意**: 
> - `amount`、`category`、`description` 为必填字段
> - `category` 使用英文值：food, transport, entertainment, shopping, bills, healthcare, education, travel, other
> - `paymentMethod` 使用英文值：cash, card, online, other
> - `date` 不提供时默认为当前时间
> - `location` 可选，地点信息
> - `tags` 默认为空数组

#### 成功响应 (201)
```json
{
  "success": true,
  "message": "支出记录创建成功",
  "data": {
    "expense": {
      "id": "expense-uuid",
      "amount": 26.00,
      "category": "food",
      "description": "麦当劳午餐",
      "date": "2024-01-15",
      "paymentMethod": "online",
      "location": "北京市朝阳区",
      "tags": ["OCR识别", "午餐"],
      "userId": "user-uuid",
      "createdAt": "2024-01-15T10:35:00Z",
      "updatedAt": "2024-01-15T10:35:00Z"
    },
    "ocrRecord": {
      "id": "ocr-uuid",
      "status": "confirmed",
      "expenseId": "expense-uuid"
    }
  }
}
```

#### 错误响应 - 记录不存在 (404)
```json
{
  "success": false,
  "message": "OCR记录不存在或已过期",
  "error": "RECORD_NOT_FOUND"
}
```

#### 错误响应 - 必填字段缺失 (400)
```json
{
  "success": false,
  "message": "缺少必填字段",
  "error": "VALIDATION_ERROR",
  "details": {
    "amount": "金额不能为空且必须大于0",
    "category": "分类不能为空",
    "description": "描述不能为空"
  }
}
```

#### 错误响应 - 记录已确认 (409)
```json
{
  "success": false,
  "message": "该记录已被确认，不能重复确认",
  "error": "RECORD_ALREADY_CONFIRMED"
}
```

### 3. 获取OCR记录列表

**GET** `/api/ocr/records`

获取用户的OCR记录列表，支持分页和筛选。

#### 查询参数
- `page` (可选): 页码，默认1
- `limit` (可选): 每页数量，默认20
- `status` (可选): 状态筛选 (processing/success/failed/confirmed)
- `startDate` (可选): 开始日期
- `endDate` (可选): 结束日期

#### 成功响应 (200)
```json
{
  "success": true,
  "message": "OCR记录列表获取成功",
  "data": {
    "records": [
      {
        "id": "uuid",
        "originalText": "麦当劳 2024-01-15...",
        "parsedData": { /* 解析结果 */ },
        "confidenceScore": 0.93,
        "status": "confirmed",
        "expenseId": "expense-uuid",
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalRecords": 98,
      "hasNextPage": true,
      "hasPreviousPage": false
    }
  }
}
```

### 4. 获取单个OCR记录详情

**GET** `/api/ocr/records/:recordId`

获取指定OCR记录的详细信息。

#### 成功响应 (200)
```json
{
  "success": true,
  "message": "OCR记录详情获取成功",
  "data": {
    "record": {
      "id": "uuid",
      "originalText": "完整的原始文本",
      "parsedData": {
        "merchant": { /* 商户信息 */ },
        "amount": { /* 金额信息 */ },
        "date": { /* 日期信息 */ },
        "paymentMethod": { /* 支付方式 */ },
        "category": { /* 分类信息 */ }
      },
      "confidenceScore": 0.93,
      "status": "success",
      "expenseId": null,
      "errorMessage": null,
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  }
}
```

### 5. 删除OCR记录

**DELETE** `/api/ocr/records/:recordId`

删除指定的OCR记录。

#### 成功响应 (200)
```json
{
  "success": true,
  "message": "OCR记录删除成功"
}
```

### 6. 获取OCR统计信息

**GET** `/api/ocr/statistics`

获取用户的OCR使用统计信息。

#### 成功响应 (200)
```json
{
  "success": true,
  "message": "OCR统计信息获取成功",
  "data": {
    "totalRecords": 156,
    "successfulParsing": 142,
    "confirmedRecords": 128,
    "averageConfidence": 0.87,
    "successRate": 0.91,
    "categoryDistribution": {
      "餐饮": 45,
      "购物": 32,
      "交通": 28,
      "生活": 23
    },
    "monthlyStats": [
      {
        "month": "2024-01",
        "totalRecords": 25,
        "successfulParsing": 23,
        "confirmedRecords": 21
      }
    ],
    "topMerchants": [
      {
        "merchantName": "麦当劳",
        "count": 8,
        "totalAmount": 206.40
      }
    ]
  }
}
```

### 7. 获取商户列表

**GET** `/api/ocr/merchants`

获取预置商户数据库，用于OCR结果校正。

#### 查询参数
- `category` (可选): 分类筛选
- `search` (可选): 搜索关键词
- `page` (可选): 页码，默认1
- `limit` (可选): 每页数量，默认50

#### 成功响应 (200)
```json
{
  "success": true,
  "message": "商户列表获取成功",
  "data": {
    "merchants": [
      {
        "id": "uuid",
        "name": "麦当劳",
        "category": "餐饮",
        "keywords": ["麦当劳", "McDonald", "M记", "金拱门"],
        "confidenceScore": 1.0,
        "isActive": true
      }
    ],
    "categories": ["餐饮", "购物", "交通", "生活", "娱乐", "医疗", "教育"],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalRecords": 103
    }
  }
}
```

### 8. 智能匹配商户

**POST** `/api/ocr/merchants/match`

根据文本智能匹配商户。

#### 请求参数
```json
{
  "text": "麦当劳",
  "minConfidence": 0.3,
  "maxResults": 10
}
```

#### 成功响应 (200)
```json
{
  "success": true,
  "message": "商户匹配完成",
  "data": {
    "matches": [
      {
        "merchant": {
          "id": "uuid",
          "name": "麦当劳",
          "category": "餐饮",
          "keywords": ["麦当劳", "McDonald", "M记", "金拱门"]
        },
        "confidence": 1.0,
        "matchType": "exact_name"
      }
    ],
    "totalMatches": 1,
    "searchText": "麦当劳"
  }
}
```

## 🚀 OCR确认功能 - 推荐方案（绕过Vercel缓存问题）

### ⚡ 快速解决方案

**如果遇到 `Expense.create is not a function` 错误**，建议使用以下方案：

**不使用** `POST /api/ocr/confirm/:recordId`，而是**直接调用创建支出API**：

```
OCR解析 → 展示确认弹窗 → 直接调用 POST /api/expense
```

### 📝 实现步骤

#### 步骤1: OCR解析（不变）
```bash
POST /api/ocr/parse-auto
```

#### 步骤2: 用户确认后直接创建支出（推荐）
```bash
POST /api/expense
Content-Type: application/json
Authorization: Bearer <token>

{
  "amount": 25.80,
  "category": "food",         // 或中文"餐饮"（自动映射）
  "description": "麦当劳午餐",
  "date": "2024-01-15T12:30:00.000Z",
  "paymentMethod": "online",  // 或中文"支付宝"（自动映射）
  "tags": ["OCR识别", "午餐"]
}
```

**响应**:
```json
{
  "success": true,
  "message": "支出记录创建成功",
  "data": {
    "expense": {
      "id": "expense-uuid",
      "amount": 25.80,
      "category": "food",
      "description": "麦当劳午餐"
    }
  }
}
```

### 🎨 Swift代码示例（推荐方案）

```swift
class OCRConfirmationService {
    
    // 步骤1: 解析OCR文本
    func parseOCRText(_ text: String) async throws -> OCRParseResult {
        let url = "\(APIConfig.baseURL)/api/ocr/parse-auto"
        var request = URLRequest(url: URL(string: url)!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        let requestData = [
            "text": text,
            "autoCreateThreshold": 0.8
        ] as [String : Any]
        request.httpBody = try JSONSerialization.data(withJSONObject: requestData)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        let result = try JSONDecoder().decode(OCRParseResponse.self, from: data)
        
        if result.data.autoCreated {
            // 已自动创建，直接返回
            return .autoCreated(result.data.expense!)
        } else {
            // 需要用户确认，返回解析数据
            return .needsConfirmation(result.data.parsedData)
        }
    }
    
    // 步骤2: 用户确认后直接创建支出（推荐方案）
    func createExpenseDirectly(
        amount: Double,
        category: String,
        description: String,
        date: Date,
        paymentMethod: String,
        tags: [String] = []
    ) async throws -> Expense {
        // 直接调用创建支出API
        let url = "\(APIConfig.baseURL)/api/expense"  // 注意：不是 /api/ocr/confirm
        var request = URLRequest(url: URL(string: url)!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        let requestData: [String: Any] = [
            "amount": amount,
            "category": category,  // 支持中文或英文
            "description": description,
            "date": ISO8601DateFormatter().string(from: date),
            "paymentMethod": paymentMethod,  // 支持中文或英文
            "tags": tags
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: requestData)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 201 else {
            throw APIError.serverError
        }
        
        let result = try JSONDecoder().decode(ExpenseCreateResponse.self, from: data)
        return result.data.expense
    }
}

// 使用示例
func handleOCRConfirmation(parsedData: ParsedData) {
    // 显示确认弹窗，让用户编辑
    showConfirmationSheet(parsedData) { confirmedData in
        Task {
            do {
                // 直接创建支出，不经过OCR确认API
                let expense = try await createExpenseDirectly(
                    amount: confirmedData.amount,
                    category: confirmedData.category,  // 可以使用中文"餐饮"
                    description: confirmedData.description,
                    date: confirmedData.date,
                    paymentMethod: confirmedData.paymentMethod,  // 可以使用中文"支付宝"
                    tags: ["OCR识别"]
                )
                
                print("✅ 支出创建成功: \(expense.id)")
                // 更新UI
            } catch {
                print("❌ 创建失败: \(error)")
            }
        }
    }
}
```

### ✅ 推荐方案的优势

1. **立即可用** - 不需要等待Vercel缓存清除
2. **API稳定** - `/api/expense` 是已验证的稳定API
3. **逻辑清晰** - 用户确认后就是普通的新增支出
4. **支持中文** - category和paymentMethod自动映射
5. **改动最小** - 只需修改API端点

### 🔄 中文字段自动映射

后端已支持中文字段自动转换为英文：

**Category映射**:
- 餐饮 → food
- 交通 → transport
- 娱乐 → entertainment
- 购物/服装 → shopping
- 账单 → bills
- 医疗 → healthcare
- 教育 → education
- 旅行 → travel
- 其他 → other

**PaymentMethod映射**:
- 现金 → cash
- 银行卡/信用卡 → card
- 支付宝/微信支付 → online
- 其他 → other

---

## 🎯 OCR确认功能完整指南（原方案）

### 📋 功能概述

OCR确认功能允许用户在OCR自动识别后，手动确认和修正识别结果，然后创建支出记录。这是一个两步流程：

1. **OCR解析**: `POST /api/ocr/parse-auto` - 解析文本，返回识别结果
2. **用户确认**: `POST /api/ocr/confirm/:recordId` - 用户确认后创建支出记录

**⚠️ 注意**: 如果遇到 `Expense.create is not a function` 错误，请使用上面的推荐方案

### 🔄 完整流程示例

#### 步骤1: OCR自动解析
```bash
curl -X POST /api/ocr/parse-auto \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "麦当劳 2024-01-15 消费金额：¥25.80 支付方式：支付宝",
    "autoCreateThreshold": 0.8
  }'
```

**响应（需要确认）**:
```json
{
  "success": true,
  "message": "解析成功，需要用户确认",
  "data": {
    "autoCreated": false,
    "recordId": "abc-123-def",
    "parsedData": {
      "amount": { "value": 25.80, "confidence": 0.98 },
      "merchant": { "name": "麦当劳", "confidence": 0.95 },
      "category": { "name": "餐饮", "confidence": 0.85 },
      "paymentMethod": { "type": "支付宝", "confidence": 0.92 }
    },
    "confidence": 0.75
  }
}
```

#### 步骤2: 用户确认并创建
```bash
curl -X POST /api/ocr/confirm/abc-123-def \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 25.80,
    "category": "food",
    "description": "麦当劳午餐",
    "date": "2024-01-15T12:30:00.000Z",
    "paymentMethod": "online",
    "tags": ["午餐"]
  }'
```

**响应**:
```json
{
  "success": true,
  "message": "支出记录创建成功",
  "data": {
    "expense": {
      "id": "expense-uuid",
      "amount": 25.80,
      "category": "food",
      "description": "麦当劳午餐"
    }
  }
}
```

### 🎨 前端集成建议

#### Swift代码示例
```swift
class OCRConfirmationService {
    
    // 步骤1: 解析OCR文本
    func parseOCRText(_ text: String) async throws -> OCRParseResult {
        let url = "\(APIConfig.baseURL)/api/ocr/parse-auto"
        var request = URLRequest(url: URL(string: url)!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        let requestData = [
            "text": text,
            "autoCreateThreshold": 0.8
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: requestData)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        let result = try JSONDecoder().decode(OCRParseResponse.self, from: data)
        
        if result.data.autoCreated {
            return .autoCreated(result.data.expense!)
        } else {
            return .needsConfirmation(result.data.recordId!, result.data.parsedData)
        }
    }
    
    // 步骤2: 确认并创建支出
    func confirmExpense(recordId: String, corrections: ExpenseData) async throws -> Expense {
        let url = "\(APIConfig.baseURL)/api/ocr/confirm/\(recordId)"
        var request = URLRequest(url: URL(string: url)!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        let requestData = [
            "amount": corrections.amount,
            "category": corrections.category,
            "description": corrections.description,
            "date": corrections.date?.iso8601String(),
            "paymentMethod": corrections.paymentMethod,
            "tags": corrections.tags
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: requestData)
        
        let (data, _) = try await URLSession.shared.data(for: request)
        let result = try JSONDecoder().decode(ExpenseResponse.self, from: data)
        return result.data.expense
    }
}

enum OCRParseResult {
    case autoCreated(Expense)
    case needsConfirmation(String, ParsedData)
}
```

### 📊 OCR数据模型

#### OCRRecord (OCR记录)
```typescript
{
  id: string,
  userId: string,
  originalText: string,
  parsedData: {
    merchant?: {
      name: string,
      category: string,
      confidence: number,
      matchType: string
    },
    amount?: {
      value: number,
      confidence: number,
      originalText: string
    },
    date?: {
      value: string,
      confidence: number,
      originalText: string
    },
    paymentMethod?: {
      value: string,
      confidence: number,
      originalText: string
    },
    category?: {
      value: string,
      confidence: number,
      source: string
    }
  },
  confidenceScore: number,
  status: 'processing' | 'success' | 'failed' | 'confirmed',
  errorMessage?: string,
  expenseId?: string,
  createdAt: Date,
  updatedAt: Date
}
```

#### 前端期望的ParsedData格式
```typescript
{
  amount: {
    value: number,
    confidence: number
  } | null,
  merchant: {
    name: string,
    confidence: number
  } | null,
  date: {
    value: string, // YYYY-MM-DD格式
    confidence: number
  },
  category: {
    name: string, // 中文分类名
    confidence: number
  },
  paymentMethod: {
    type: string, // 中文支付方式
    confidence: number
  },
  originalText: string
}
```

#### Merchant (商户)
```typescript
{
  id: string,
  name: string,
  category: string,
  keywords: string[],
  confidenceScore: number,
  isActive: boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### 🎯 使用建议

#### 1. 最佳实践
- **文本预处理**: 在发送OCR文本前，可以进行基本的清理（去除多余空格等）
- **结果验证**: 建议用户在确认前检查解析结果，特别是金额和日期
- **错误处理**: 对于置信度较低的结果，建议用户手动校正

#### 2. 性能优化
- **批量处理**: 对于多个账单，可以逐个处理而不是批量提交
- **缓存机制**: 商户匹配结果会被缓存以提高性能
- **异步处理**: 复杂的OCR解析可能需要一些时间

#### 3. 错误处理
- **解析失败**: 当OCR文本质量较差时，系统会返回详细的错误信息和建议
- **商户匹配失败**: 如果无法匹配到合适的商户，系统会提供手动选择选项
- **数据校正**: 用户可以在确认阶段修正任何解析错误

### 9. 🆕 生成iOS快捷指令配置

**GET** `/api/ocr/shortcuts/generate`

生成标准iOS快捷指令JSON配置，用户可以导入到iOS系统快捷指令应用中。

#### 成功响应 (200)
```json
{
  "success": true,
  "message": "iOS快捷指令配置生成成功",
  "data": {
    "shortcutConfig": {
      "WFWorkflowActions": [
        {
          "WFWorkflowActionIdentifier": "is.workflow.actions.takephoto",
          "WFWorkflowActionParameters": {
            "WFCameraCaptureShowPreview": false
          }
        },
        {
          "WFWorkflowActionIdentifier": "is.workflow.actions.extracttextfromimage",
          "WFWorkflowActionParameters": {}
        },
        {
          "WFWorkflowActionIdentifier": "is.workflow.actions.request",
          "WFWorkflowActionParameters": {
            "WFHTTPMethod": "POST",
            "WFURL": "https://your-api-domain.com/api/ocr/parse-auto",
            "WFHTTPHeaders": {
              "Content-Type": "application/json",
              "Authorization": "Bearer {{用户需要替换为实际token}}"
            },
            "WFHTTPBodyType": "JSON",
            "WFJSONValues": {
              "text": "{{ExtractedText}}",
              "autoCreateThreshold": 0.85
            }
          }
        }
      ],
      "WFWorkflowName": "智能记账",
      "WFWorkflowIcon": {
        "WFWorkflowIconStartColor": 2071128575,
        "WFWorkflowIconGlyphNumber": 61440
      }
    },
    "setupInstructions": [
      "1. 在iOS设备上打开"快捷指令"应用",
      "2. 点击右上角"+"创建新快捷指令",
      "3. 选择"高级" → "导入快捷指令"",
      "4. 粘贴此配置JSON",
      "5. 替换Authorization头中的token为您的访问令牌",
      "6. 保存并添加到Siri"
    ],
    "apiInfo": {
      "endpoint": "https://your-api-domain.com/api/ocr/parse-auto",
      "authRequired": true,
      "tokenHint": "请在iOS应用中获取您的访问令牌并替换{{用户需要替换为实际token}}"
    }
  }
}
```

## 🚨 常见错误和修复方法

### URL路径重复错误 (❌ 400: POST /api/api/ocr/parse)

**错误现象**: `❌ 400: POST /api/api/ocr/parse`  
**错误原因**: URL路径中重复了 `/api` 前缀  
**服务器响应**: 智能检测并返回详细修复指导

#### 后端智能错误检测

当检测到URL路径重复时，后端会返回详细的错误信息：

```json
{
  "success": false,
  "error": "URL_PATH_DUPLICATE",
  "message": "检测到重复的API路径前缀",
  "details": {
    "received": "/api/api/ocr/parse",
    "correct": "/api/ocr/parse",
    "problem": "您的请求URL包含重复的/api前缀",
    "solution": "请检查前端代码中的API基础URL配置"
  },
  "ios_client_fix": {
    "description": "iOS客户端推荐的修复方法",
    "recommended_approach": {
      "title": "使用APIConfig.Endpoint枚举（推荐）",
      "code": "// 详细的Swift代码示例..."
    },
    "common_mistakes": [
      {
        "problem": "baseURL已包含/api，但又添加了/api前缀",
        "wrong": "let baseURL = \"https://domain.com/api\"\\nlet url = baseURL + \"/api/ocr/parse\"",
        "correct": "let baseURL = \"https://domain.com\"\\nlet url = baseURL + \"/api/ocr/parse\""
      }
    ]
  },
  "help": {
    "correct_url": "/api/ocr/parse",
    "test_command": "curl -X POST http://localhost:3000/api/ocr/parse",
    "documentation": "/api/debug/routes"
  }
}
```

#### iOS客户端正确配置

```swift
// ✅ 推荐的API配置方式
struct APIConfig {
    static let baseURL = "https://expense-tracker-backend-1mnvyo1le-likexin0304s-projects.vercel.app"
    
    enum Endpoint: String {
        case health = "/health"
        case authRegister = "/api/auth/register"
        case authLogin = "/api/auth/login"
        case ocrParse = "/api/ocr/parse"
        case ocrParseAuto = "/api/ocr/parse-auto"
        case ocrShortcuts = "/api/ocr/shortcuts/generate"
        case ocrRecords = "/api/ocr/records"
        case ocrMerchants = "/api/ocr/merchants"
        case expenseCreate = "/api/expense"
        case budgetCurrent = "/api/budget/current"
        
        var fullURL: String {
            return APIConfig.baseURL + self.rawValue
        }
    }
}

// ✅ 正确的OCR自动识别API调用
class OCRService {
    func parseTextAndAutoCreate(_ text: String, threshold: Double = 0.85) async throws -> OCRAutoResponse {
        // 使用预定义的端点，避免URL路径重复
        var request = URLRequest(url: URL(string: APIConfig.Endpoint.ocrParseAuto.fullURL)!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        // 添加认证头部
        if let token = UserDefaults.standard.string(forKey: "access_token") {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        // 构建请求体
        let requestData: [String: Any] = [
            "text": text,
            "autoCreateThreshold": threshold
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: requestData)
        
        // 添加调试日志
        print("🌐 OCR Auto Parse Request: \(APIConfig.Endpoint.ocrParseAuto.fullURL)")
        print("📝 Request Body: \(String(data: request.httpBody!, encoding: .utf8) ?? "nil")")
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        print("📡 Response Status: \(httpResponse.statusCode)")
        
        // 处理不同的响应状态
        switch httpResponse.statusCode {
        case 200...299:
            return try JSONDecoder().decode(OCRAutoResponse.self, from: data)
        case 400:
            // 可能是URL路径重复错误，打印详细信息
            if let errorData = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                print("❌ API Error: \(errorData)")
                if let error = errorData["error"] as? String, error == "URL_PATH_DUPLICATE" {
                    print("💡 URL路径重复错误，请检查API配置")
                }
            }
            throw APIError.badRequest
        case 401:
            throw APIError.unauthorized
        default:
            throw APIError.serverError(httpResponse.statusCode)
        }
    }
    
    // ✅ 基础OCR解析（需要用户确认）
    func parseText(_ text: String) async throws -> OCRParseResponse {
        var request = URLRequest(url: URL(string: APIConfig.Endpoint.ocrParse.fullURL)!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        if let token = UserDefaults.standard.string(forKey: "access_token") {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        let requestData = ["text": text]
        request.httpBody = try JSONSerialization.data(withJSONObject: requestData)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              200...299 ~= httpResponse.statusCode else {
            throw APIError.serverError((response as? HTTPURLResponse)?.statusCode ?? 0)
        }
        
        return try JSONDecoder().decode(OCRParseResponse.self, from: data)
    }
    
    // ✅ 确认并创建支出记录
    func confirmOCRRecord(recordId: String, corrections: [String: Any]? = nil) async throws -> ExpenseResponse {
        let url = "\(APIConfig.baseURL)/api/ocr/confirm/\(recordId)"
        var request = URLRequest(url: URL(string: url)!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        if let token = UserDefaults.standard.string(forKey: "access_token") {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        let requestData: [String: Any] = [
            "confirmed": true,
            "corrections": corrections ?? [:]
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: requestData)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              200...299 ~= httpResponse.statusCode else {
            throw APIError.serverError((response as? HTTPURLResponse)?.statusCode ?? 0)
        }
        
        return try JSONDecoder().decode(ExpenseResponse.self, from: data)
    }
}

// ❌ 常见错误示例（不要这样做）
/*
// 错误1: baseURL包含/api，但又添加/api前缀
let baseURL = "https://domain.com/api"
let wrongURL = baseURL + "/api/ocr/parse"  // 结果: /api/api/ocr/parse

// 错误2: 硬编码重复路径
let wrongEndpoint = "/api/api/ocr/parse"

// 错误3: URL字符串拼接错误
let wrongURL2 = "\(baseURL)/api/api/ocr/parse"
*/
```

#### 数据模型定义

```swift
// OCR自动识别响应模型
struct OCRAutoResponse: Codable {
    let success: Bool
    let message: String
    let data: OCRAutoData
}

struct OCRAutoData: Codable {
    let autoCreated: Bool
    let expense: Expense?
    let ocrRecord: OCRRecord?
    let recordId: String?
    let confidence: Double
    let parsedData: ParsedData
    let suggestions: Suggestions?
}

// OCR基础解析响应模型
struct OCRParseResponse: Codable {
    let success: Bool
    let message: String
    let data: OCRParseData
}

struct OCRParseData: Codable {
    let record: OCRRecord
}

// OCR记录模型
struct OCRRecord: Codable {
    let id: String
    let originalText: String
    let parsedData: ParsedData
    let confidenceScore: Double
    let status: String
    let expenseId: String?
    let createdAt: String
}

// 解析数据模型
struct ParsedData: Codable {
    let merchant: MerchantInfo?
    let amount: AmountInfo?
    let date: DateInfo?
    let paymentMethod: PaymentMethodInfo?
    let category: CategoryInfo?
}

struct MerchantInfo: Codable {
    let name: String
    let category: String
    let confidence: Double
    let matchType: String
}

struct AmountInfo: Codable {
    let value: Double
    let confidence: Double
    let originalText: String
}

struct DateInfo: Codable {
    let value: String
    let confidence: Double
    let originalText: String
}

struct PaymentMethodInfo: Codable {
    let value: String
    let confidence: Double
    let originalText: String
}

struct CategoryInfo: Codable {
    let value: String
    let confidence: Double
    let source: String
}

// 建议信息模型
struct Suggestions: Codable {
    let shouldAutoCreate: Bool
    let needsReview: Bool
    let reason: String?
}

// 支出记录模型
struct Expense: Codable {
    let id: String
    let amount: Double
    let category: String
    let description: String
    let date: String
    let location: String?
    let paymentMethod: String
    let tags: [String]
    let createdAt: String
    let updatedAt: String
}

// 支出创建响应模型
struct ExpenseResponse: Codable {
    let success: Bool
    let message: String
    let data: ExpenseData
}

struct ExpenseData: Codable {
    let expense: Expense
    let ocrRecord: OCRRecord?
}

// 错误处理枚举
enum APIError: Error {
    case invalidResponse
    case badRequest
    case unauthorized
    case serverError(Int)
    case decodingError
    case urlPathDuplicate(String)
    
    var description: String {
        switch self {
        case .invalidResponse:
            return "无效的服务器响应"
        case .badRequest:
            return "请求参数错误"
        case .unauthorized:
            return "未授权，请先登录"
        case .serverError(let code):
            return "服务器错误 (\(code))"
        case .decodingError:
            return "数据解析失败"
        case .urlPathDuplicate(let path):
            return "URL路径重复: \(path)"
        }
    }
}
```

#### 调试建议

1. **验证URL构建**:
   ```swift
   print("Base URL: \(APIConfig.baseURL)")
   print("OCR Parse Auto URL: \(APIConfig.Endpoint.ocrParseAuto.fullURL)")
   // 应该输出: https://expense-tracker-backend-1mnvyo1le-likexin0304s-projects.vercel.app/api/ocr/parse-auto
   ```

2. **网络请求监控**:
   ```swift
   // 在发送请求前打印完整URL和请求体
   print("🌐 Request URL: \(request.url?.absoluteString ?? "nil")")
   print("📋 Request Headers: \(request.allHTTPHeaderFields ?? [:])")
   if let body = request.httpBody, let bodyString = String(data: body, encoding: .utf8) {
       print("📝 Request Body: \(bodyString)")
   }
   ```

3. **错误响应处理**:
   ```swift
   // 处理400错误（可能是URL路径重复）
   if httpResponse.statusCode == 400 {
       if let errorData = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
          let error = errorData["error"] as? String,
          error == "URL_PATH_DUPLICATE" {
           print("❌ URL路径重复错误，请检查API配置")
           print("💡 修复建议: \(errorData["ios_client_fix"] ?? "参考API文档")")
           throw APIError.urlPathDuplicate(errorData["details"]?["received"] as? String ?? "unknown")
       }
   }
   ```

4. **使用网络调试工具**:
   - Xcode网络调试
   - Charles或Proxyman代理工具
   - iOS模拟器的网络日志

#### 完整的自动记账功能集成示例

```swift
// 完整的自动记账服务
class AutoExpenseService {
    private let ocrService = OCRService()
    
    // 自动记账主流程
    func processReceiptText(_ text: String) async throws -> AutoExpenseResult {
        do {
            // 1. 尝试自动识别并创建
            let autoResponse = try await ocrService.parseTextAndAutoCreate(text, threshold: 0.85)
            
            if autoResponse.data.autoCreated {
                // 自动创建成功
                return .autoCreated(autoResponse.data.expense!)
            } else {
                // 需要用户确认
                return .needsConfirmation(
                    recordId: autoResponse.data.recordId!,
                    parsedData: autoResponse.data.parsedData,
                    confidence: autoResponse.data.confidence
                )
            }
        } catch APIError.badRequest {
            // 可能是URL路径重复或其他请求错误
            print("❌ 请求错误，请检查API配置")
            throw AutoExpenseError.configurationError
        } catch APIError.unauthorized {
            // 需要重新登录
            throw AutoExpenseError.authenticationRequired
        } catch {
            // 其他错误
            throw AutoExpenseError.processingFailed(error.localizedDescription)
        }
    }
    
    // 用户确认并创建支出记录
    func confirmExpense(recordId: String, corrections: [String: Any]? = nil) async throws -> Expense {
        let response = try await ocrService.confirmOCRRecord(recordId: recordId, corrections: corrections)
        return response.data.expense
    }
}

// 自动记账结果枚举
enum AutoExpenseResult {
    case autoCreated(Expense)
    case needsConfirmation(recordId: String, parsedData: ParsedData, confidence: Double)
}

// 自动记账错误枚举
enum AutoExpenseError: Error {
    case configurationError
    case authenticationRequired
    case processingFailed(String)
    
    var description: String {
        switch self {
        case .configurationError:
            return "API配置错误，请检查URL设置"
        case .authenticationRequired:
            return "需要重新登录"
        case .processingFailed(let message):
            return "处理失败: \(message)"
        }
    }
}

// 使用示例
class ReceiptScanViewController: UIViewController {
    private let autoExpenseService = AutoExpenseService()
    
    func processScannedText(_ text: String) {
        Task {
            do {
                let result = try await autoExpenseService.processReceiptText(text)
                
                await MainActor.run {
                    switch result {
                    case .autoCreated(let expense):
                        // 自动创建成功，显示成功提示
                        showSuccessAlert(expense: expense)
                    case .needsConfirmation(let recordId, let parsedData, let confidence):
                        // 显示确认界面
                        showConfirmationView(recordId: recordId, parsedData: parsedData, confidence: confidence)
                    }
                }
            } catch {
                await MainActor.run {
                    showErrorAlert(error: error)
                }
            }
        }
    }
    
    private func showSuccessAlert(expense: Expense) {
        let alert = UIAlertController(
            title: "✅ 自动记账成功",
            message: "已自动创建支出记录：\(expense.description) ¥\(expense.amount)",
            preferredStyle: .alert
        )
        alert.addAction(UIAlertAction(title: "确定", style: .default))
        present(alert, animated: true)
    }
    
    private func showConfirmationView(recordId: String, parsedData: ParsedData, confidence: Double) {
        // 显示确认界面，让用户检查和修正解析结果
        let confirmVC = ExpenseConfirmationViewController(
            recordId: recordId,
            parsedData: parsedData,
            confidence: confidence
        )
        present(confirmVC, animated: true)
    }
    
    private func showErrorAlert(error: Error) {
        let alert = UIAlertController(
            title: "❌ 处理失败",
            message: error.localizedDescription,
            preferredStyle: .alert
        )
        alert.addAction(UIAlertAction(title: "确定", style: .default))
        present(alert, animated: true)
    }
}
```

## 数据模型

### User (用户)
```typescript
{
  id: number,
  email: string,
  password: string, // 仅在数据库中，API响应不包含
  wechatOpenId?: string,
  createdAt: Date,
  updatedAt: Date
}
```

### Budget (预算)
```typescript
{
  id: number,
  userId: number,
  amount: number,
  year: number,
  month: number, // 1-12
  createdAt: Date,
  updatedAt: Date
}
```

### Expense (支出)
```typescript
{
  id: number,
  userId: number,
  amount: number,
  category: string,
  description: string,
  date: Date,
  location?: string,
  paymentMethod: string, // 默认 "cash"
  tags: string[],
  createdAt: Date,
  updatedAt: Date
}
```

## 错误码说明

| HTTP状态码 | 说明 |
|-----------|------|
| 200 | 请求成功 |
| 201 | 资源创建成功 |
| 400 | 请求参数错误或JSON格式错误 |
| 401 | 未授权，需要登录 |
| 403 | 禁止访问，权限不足 |
| 404 | 资源不存在 |
| 429 | 请求过于频繁，触发限流 |
| 500 | 服务器内部错误 |

## 通用错误响应格式

### 基本错误响应
```json
{
  "success": false,
  "message": "错误描述信息"
}
```

### JSON解析错误响应（HTTP 400）
当请求体格式错误时，服务器提供详细的错误分析：

```json
{
  "success": false,
  "message": "检测到Base64编码的JSON数据",
  "error": {
    "type": "JSON_PARSE_ERROR",
    "details": "具体的JSON解析错误信息",
    "suggestions": [
      "请直接发送JSON对象，不要进行Base64编码",
      "正确格式示例: {\"key\": \"value\"}",
      "检测到的原始数据: {\"amount\":10000}"
    ],
    "receivedBody": "开发环境下显示接收到的原始数据"
  },
  "help": {
    "correctFormat": "Content-Type: application/json + JSON object in body",
    "example": "{\"email\": \"user@example.com\", \"password\": \"yourpassword\"}",
    "documentation": "/api/debug/routes"
  }
}
```

### 开发环境错误响应
开发环境下包含额外的调试信息：
```json
{
  "success": false,
  "message": "错误描述信息",
  "error": "详细错误信息",
  "stack": "错误堆栈信息"
}
```

### 常见错误类型

#### 1. JSON格式错误
- **Base64编码错误**: 客户端错误地对JSON进行了Base64编码
- **双重字符串化**: 对JSON进行了双重JSON.stringify()处理
- **字符串格式JSON**: 发送了JSON字符串而不是JSON对象

#### 2. 认证错误
- **Token缺失**: 未提供Authorization头部
- **Token无效**: JWT令牌格式错误或已过期
- **Token格式错误**: Authorization头部格式不正确

#### 3. 验证错误
- **必填字段缺失**: 请求体缺少必需的字段
- **字段格式错误**: 字段类型或格式不符合要求
- **业务规则违反**: 违反了业务逻辑规则（如邮箱已存在）

## 限流说明

API实施了基于IP的限流策略：
- 时间窗口：15分钟
- 最大请求数：100次

超出限制时返回 429 状态码和以下响应：
```json
{
  "success": false,
  "message": "请求过于频繁，请稍后再试"
}
```

## 开发调试

### 快速测试所有API端点
```bash
# 健康检查
curl http://localhost:3000/health

# 用户注册
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","confirmPassword":"test123"}'

# 用户登录
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# 获取当前用户信息（需要替换token）
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# 删除账号（需要替换token）
curl -X DELETE http://localhost:3000/api/auth/account \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"confirmationText":"我确认"}'

# 设置预算（需要替换token）
curl -X POST http://localhost:3000/api/budget \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"amount":5000}'

# 获取当前预算状态（需要替换token）
curl -X GET http://localhost:3000/api/budget/current \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# 创建支出记录（需要替换token）
curl -X POST http://localhost:3000/api/expense \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"amount":99.99,"category":"餐饮","description":"午餐"}'

# 获取支出列表（需要替换token）
curl -X GET http://localhost:3000/api/expense \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# 获取支出统计（需要替换token）
curl -X GET http://localhost:3000/api/expense/stats \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# 🆕 OCR解析文本（需要替换token）
curl -X POST http://localhost:3000/api/ocr/parse \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"text":"麦当劳 2024-01-15 消费金额：¥25.80 支付方式：支付宝"}'

# 🆕 OCR智能解析并自动创建（需要替换token）
curl -X POST http://localhost:3000/api/ocr/parse-auto \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"text":"麦当劳 2024-01-15 消费金额：¥25.80 支付方式：支付宝","autoCreateThreshold":0.85}'

# 🆕 获取iOS快捷指令配置（需要替换token）
curl -X GET http://localhost:3000/api/ocr/shortcuts/generate \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# 🆕 获取OCR记录列表（需要替换token）
curl -X GET http://localhost:3000/api/ocr/records \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## 联系方式

如有API相关问题，请联系开发团队。

---
**文档版本:** v1.0  
**最后更新:** 2024-01-15  
**服务版本:** 基于内存存储的MVP版本 

## Supabase集成

### 概述

本应用已经集成了Supabase作为后端服务，提供以下功能：

- 用户认证与授权
- 数据存储与查询
- 实时数据更新
- 行级安全策略(RLS)

### 认证流程变更

认证流程已从自定义JWT认证迁移到Supabase认证系统。主要变更如下：

1. **用户注册**：使用Supabase Auth API创建用户
2. **用户登录**：使用Supabase Auth API进行身份验证
3. **令牌验证**：使用Supabase Auth API验证令牌
4. **用户删除**：使用Supabase Admin API禁用用户，并标记为已删除

### 数据库表结构

Supabase数据库包含以下主要表：

#### profiles表
```sql
create table if not exists profiles (
  id uuid references auth.users primary key,
  email text not null,
  is_deleted boolean default false,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
```

#### expenses表
```sql
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
```

#### budgets表
```sql
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
```

### iOS客户端集成

iOS客户端需要使用Supabase Swift SDK进行集成。主要步骤如下：

1. 安装Supabase Swift SDK：
```swift
// 使用Swift Package Manager
.package(url: "https://github.com/supabase-community/supabase-swift", from: "0.3.0")
```

2. 初始化Supabase客户端：
```swift
import Foundation
import Supabase

class SupabaseManager {
    static let shared = SupabaseManager()
    
    let client: SupabaseClient
    
    private init() {
        // 从Info.plist加载配置
        guard let supabaseUrl = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_URL") as? String,
              let supabaseAnonKey = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_ANON_KEY") as? String,
              let url = URL(string: supabaseUrl) else {
            fatalError("无法加载Supabase配置")
        }
        
        client = SupabaseClient(supabaseURL: url, supabaseKey: supabaseAnonKey)
    }
}
```

3. 配置Info.plist：
```xml
<key>SUPABASE_URL</key>
<string>https://nlrtjnvwgsaavtpfccxg.supabase.co</string>
<key>SUPABASE_ANON_KEY</key>
<string>eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5scnRqbnZ3Z3NhYXZ0cGZjY3hnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwNzU3MDgsImV4cCI6MjA2NTY1MTcwOH0.5r2tzDOV1T1Lkz_Mtujq35VBBfo77SCh6H__rUSHQCo</string>
```

4. 用户认证示例：
```swift
// 用户注册
func signUp(email: String, password: String) async throws -> User {
    let authResponse = try await SupabaseManager.shared.client.auth.signUp(
        email: email,
        password: password
    )
    
    guard let user = authResponse.user else {
        throw AuthError.signUpFailed
    }
    
    return User(
        id: user.id,
        email: user.email ?? "",
        createdAt: user.createdAt
    )
}

// 用户登录
func signIn(email: String, password: String) async throws -> User {
    let authResponse = try await SupabaseManager.shared.client.auth.signIn(
        email: email,
        password: password
    )
    
    guard let user = authResponse.user else {
        throw AuthError.signInFailed
    }
    
    return User(
        id: user.id,
        email: user.email ?? "",
        createdAt: user.createdAt
    )
}
```

5. 数据操作示例：
```swift
// 创建支出记录
func createExpense(_ expense: ExpenseCreate) async throws -> Expense {
    let data: [String: Any] = [
        "amount": expense.amount,
        "category": expense.category,
        "description": expense.description,
        "date": expense.date.iso8601String(),
        "location": expense.location,
        "payment_method": expense.paymentMethod,
        "is_recurring": expense.isRecurring,
        "tags": expense.tags,
        "notes": expense.notes
    ]
    
    let response = try await SupabaseManager.shared.client
        .from("expenses")
        .insert(values: data)
        .execute()
    
    guard let json = response.data as? [[String: Any]],
          let expenseData = json.first else {
        throw ExpenseError.creationFailed
    }
    
    return try JSONDecoder().decode(Expense.self, from: JSONSerialization.data(withJSONObject: expenseData))
}
```

### 安全注意事项

1. 永远不要在客户端代码中硬编码service_role密钥
2. 确保所有表都启用了行级安全策略(RLS)
3. 使用适当的权限策略限制用户只能访问自己的数据
4. 在后端API中验证所有用户输入 

## 🚨 前端紧急修复指南

### 📱 iOS客户端URL配置修复

如果你的iOS应用在使用"手机点击背后3次自动记账"功能时出现错误，很可能是因为使用了错误的API URL。

#### 🔍 问题检查

1. **检查你的APIConfig文件**:
   ```swift
   // 查找你的APIConfig.swift或类似的配置文件
   // 检查baseURL是否为错误的URL
   ```

2. **常见错误URL**:
   ```swift
   // ❌ 错误的URL（如果你在使用这个，请立即更新）
   static let baseURL = "https://expense-tracker-backend-mocrhvaay-likexin0304s-projects.vercel.app"
   ```

3. **正确的URL**:
   ```swift
   // ✅ 正确的URL
   static let baseURL = "https://expense-tracker-backend-1mnvyo1le-likexin0304s-projects.vercel.app"
   ```

#### 🛠️ 修复步骤

**步骤1: 更新API配置**
```swift
// 在你的APIConfig.swift文件中
struct APIConfig {
    // ✅ 使用正确的URL
    static let baseURL = "https://expense-tracker-backend-1mnvyo1le-likexin0304s-projects.vercel.app"
    
    enum Endpoint: String {
        case health = "/health"
        case authRegister = "/api/auth/register"
        case authLogin = "/api/auth/login"
        case ocrParse = "/api/ocr/parse"
        case ocrParseAuto = "/api/ocr/parse-auto"
        case ocrConfirm = "/api/ocr/confirm"
        case expenseCreate = "/api/expense"
        case budgetCurrent = "/api/budget/current"
        
        var fullURL: String {
            return APIConfig.baseURL + self.rawValue
        }
    }
}
```

**步骤2: 验证修复**
```swift
// 添加这个测试函数到你的代码中
func testAPIConnection() async {
    do {
        let url = URL(string: "\(APIConfig.baseURL)/health")!
        let (data, response) = try await URLSession.shared.data(from: url)
        
        if let httpResponse = response as? HTTPURLResponse,
           httpResponse.statusCode == 200 {
            print("✅ API连接正常")
            
            // 解析响应
            if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                print("📊 API响应: \(json)")
            }
        } else {
            print("❌ API连接失败")
        }
    } catch {
        print("❌ 网络错误: \(error.localizedDescription)")
    }
}
```

**步骤3: 测试OCR自动记账功能**
```swift
// 测试OCR自动记账端点
func testOCRAutoCreate() async {
    let testText = "测试 设置"
    
    do {
        var request = URLRequest(url: URL(string: APIConfig.Endpoint.ocrParseAuto.fullURL)!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        // 添加认证头部（如果有token）
        if let token = UserDefaults.standard.string(forKey: "access_token") {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        let requestData = [
            "text": testText,
            "autoCreateThreshold": 0.8
        ] as [String: Any]
        
        request.httpBody = try JSONSerialization.data(withJSONObject: requestData)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        if let httpResponse = response as? HTTPURLResponse {
            print("🔢 OCR API状态码: \(httpResponse.statusCode)")
            
            if let responseString = String(data: data, encoding: .utf8) {
                print("📥 OCR API响应: \(responseString)")
            }
            
            if httpResponse.statusCode == 200 || httpResponse.statusCode == 201 {
                print("✅ OCR自动记账API正常工作")
            } else {
                print("❌ OCR自动记账API返回错误")
            }
        }
    } catch {
        print("❌ OCR测试失败: \(error.localizedDescription)")
    }
}
```

#### 🔄 动态配置方案（推荐）

为了避免将来再次出现URL混淆问题，建议实现动态配置：

```swift
// 动态配置管理器
class APIConfigManager {
    static let shared = APIConfigManager()
    private var currentConfig: APIConfiguration?
    
    private init() {}
    
    // 从服务器获取最新配置
    func loadConfiguration() async throws {
        // 使用一个已知稳定的端点获取配置
        let configURL = "https://expense-tracker-backend-1mnvyo1le-likexin0304s-projects.vercel.app/api/config"
        
        guard let url = URL(string: configURL) else {
            throw APIError.invalidURL
        }
        
        let (data, response) = try await URLSession.shared.data(from: url)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw APIError.serverError
        }
        
        let configResponse = try JSONDecoder().decode(ConfigResponse.self, from: data)
        self.currentConfig = configResponse.data
        
        print("✅ 动态配置加载成功: \(configResponse.data.baseURL)")
    }
    
    // 获取当前基础URL
    func getBaseURL() -> String {
        return currentConfig?.baseURL ?? "https://expense-tracker-backend-1mnvyo1le-likexin0304s-projects.vercel.app"
    }
    
    // 构建完整的API URL
    func getAPIURL(for endpoint: String) -> String {
        return getBaseURL() + endpoint
    }
}

// 配置响应模型
struct ConfigResponse: Codable {
    let success: Bool
    let data: APIConfiguration
}

struct APIConfiguration: Codable {
    let baseURL: String
    let environment: String
    let version: String
    let deploymentTimestamp: String
}
```

#### 📱 在应用启动时加载配置

```swift
// 在AppDelegate或SceneDelegate中
func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    
    // 异步加载API配置
    Task {
        do {
            try await APIConfigManager.shared.loadConfiguration()
            print("✅ API配置加载完成")
        } catch {
            print("⚠️ API配置加载失败，使用默认配置: \(error.localizedDescription)")
        }
    }
    
    return true
}
```

#### 🧪 完整的测试套件

```swift
// 添加到你的测试代码中
class APIConnectionTests {
    
    func runAllTests() async {
        print("🧪 开始API连接测试...")
        
        await testHealthEndpoint()
        await testOCREndpoint()
        await testConfigEndpoint()
        
        print("🏁 API测试完成")
    }
    
    private func testHealthEndpoint() async {
        print("\n1️⃣ 测试健康检查端点...")
        
        do {
            let url = URL(string: "\(APIConfigManager.shared.getBaseURL())/health")!
            let (data, response) = try await URLSession.shared.data(from: url)
            
            if let httpResponse = response as? HTTPURLResponse,
               httpResponse.statusCode == 200 {
                print("✅ 健康检查通过")
            } else {
                print("❌ 健康检查失败")
            }
        } catch {
            print("❌ 健康检查错误: \(error.localizedDescription)")
        }
    }
    
    private func testOCREndpoint() async {
        print("\n2️⃣ 测试OCR端点...")
        
        // 这里添加OCR测试逻辑
        let ocrURL = APIConfigManager.shared.getAPIURL(for: "/api/ocr/parse-auto")
        print("📍 OCR URL: \(ocrURL)")
        
        // 如果有认证token，可以进行完整测试
        if UserDefaults.standard.string(forKey: "access_token") != nil {
            await testOCRAutoCreate()
        } else {
            print("⚠️ 无认证token，跳过OCR功能测试")
        }
    }
    
    private func testConfigEndpoint() async {
        print("\n3️⃣ 测试配置端点...")
        
        do {
            try await APIConfigManager.shared.loadConfiguration()
            print("✅ 配置端点正常")
        } catch {
            print("⚠️ 配置端点暂不可用（可能仍在部署中）: \(error.localizedDescription)")
        }
    }
}
```

#### 🚀 使用方法

在你的ViewController中添加测试按钮：

```swift
class ViewController: UIViewController {
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        // 添加测试按钮
        let testButton = UIButton(type: .system)
        testButton.setTitle("测试API连接", for: .normal)
        testButton.addTarget(self, action: #selector(testAPIConnection), for: .touchUpInside)
        // ... 设置约束和添加到视图
    }
    
    @objc private func testAPIConnection() {
        Task {
            let tests = APIConnectionTests()
            await tests.runAllTests()
        }
    }
}
```

### ⚡ 快速验证清单

完成修复后，请验证以下项目：

- [ ] ✅ 健康检查端点返回200状态码
- [ ] ✅ OCR自动记账端点可以正常访问
- [ ] ✅ 认证相关API正常工作
- [ ] ✅ 前端不再出现"Cannot read properties of undefined"错误
- [ ] ✅ "手机点击背后3次自动记账"功能正常工作

## iOS客户端集成指南

### 概述

iOS客户端需要使用Supabase Swift SDK进行集成。主要步骤如下：

1. 安装Supabase Swift SDK：
```swift
// 使用Swift Package Manager
.package(url: "https://github.com/supabase-community/supabase-swift", from: "0.3.0")
```

2. 初始化Supabase客户端：
```swift
import Foundation
import Supabase

class SupabaseManager {
    static let shared = SupabaseManager()
    
    let client: SupabaseClient
    
    private init() {
        // 从Info.plist加载配置
        guard let supabaseUrl = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_URL") as? String,
              let supabaseAnonKey = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_ANON_KEY") as? String,
              let url = URL(string: supabaseUrl) else {
            fatalError("无法加载Supabase配置")
        }
        
        client = SupabaseClient(supabaseURL: url, supabaseKey: supabaseAnonKey)
    }
}
```

3. 配置Info.plist：
```xml
<key>SUPABASE_URL</key>
<string>https://nlrtjnvwgsaavtpfccxg.supabase.co</string>
<key>SUPABASE_ANON_KEY</key>
<string>eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5scnRqbnZ3Z3NhYXZ0cGZjY3hnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwNzU3MDgsImV4cCI6MjA2NTY1MTcwOH0.5r2tzDOV1T1Lkz_Mtujq35VBBfo77SCh6H__rUSHQCo</string>
```

4. 用户认证示例：
```swift
// 用户注册
func signUp(email: String, password: String) async throws -> User {
    let authResponse = try await SupabaseManager.shared.client.auth.signUp(
        email: email,
        password: password
    )
    
    guard let user = authResponse.user else {
        throw AuthError.signUpFailed
    }
    
    return User(
        id: user.id,
        email: user.email ?? "",
        createdAt: user.createdAt
    )
}

// 用户登录
func signIn(email: String, password: String) async throws -> User {
    let authResponse = try await SupabaseManager.shared.client.auth.signIn(
        email: email,
        password: password
    )
    
    guard let user = authResponse.user else {
        throw AuthError.signInFailed
    }
    
    return User(
        id: user.id,
        email: user.email ?? "",
        createdAt: user.createdAt
    )
}
```

5. 数据操作示例：
```swift
// 创建支出记录
func createExpense(_ expense: ExpenseCreate) async throws -> Expense {
    let data: [String: Any] = [
        "amount": expense.amount,
        "category": expense.category,
        "description": expense.description,
        "date": expense.date.iso8601String(),
        "location": expense.location,
        "payment_method": expense.paymentMethod,
        "is_recurring": expense.isRecurring,
        "tags": expense.tags,
        "notes": expense.notes
    ]
    
    let response = try await SupabaseManager.shared.client
        .from("expenses")
        .insert(values: data)
        .execute()
    
    guard let json = response.data as? [[String: Any]],
          let expenseData = json.first else {
        throw ExpenseError.creationFailed
    }
    
    return try JSONDecoder().decode(Expense.self, from: JSONSerialization.data(withJSONObject: expenseData))
}
```

### 安全注意事项

1. 永远不要在客户端代码中硬编码service_role密钥
2. 确保所有表都启用了行级安全策略(RLS)
3. 使用适当的权限策略限制用户只能访问自己的数据
4. 在后端API中验证所有用户输入 

## 部署信息

### 推荐部署方案

本应用推荐使用 **Vercel** 进行部署，因为：
- ✅ 免费额度足够使用
- ✅ 支持 Node.js 应用
- ✅ 自动 HTTPS 和 CDN
- ✅ 与 GitHub 集成，自动部署
- ✅ 环境变量管理
- ✅ 无需容器化

### Vercel 部署步骤

1. **准备部署文件**：
   ```json
   // vercel.json
   {
     "version": 2,
     "builds": [
       {
         "src": "server.js",
         "use": "@vercel/node"
       }
     ],
     "routes": [
       {
         "src": "/(.*)",
         "dest": "/server.js"
       }
     ]
   }
   ```

2. **环境变量配置**：
   在 Vercel Dashboard 中配置以下环境变量：
   ```
   NODE_ENV=production
   JWT_SECRET=your_production_jwt_secret
   SUPABASE_URL=https://nlrtjnvwgsaavtpfccxg.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

3. **部署命令**：
   ```bash
   # 安装 Vercel CLI
   npm install -g vercel
   
   # 登录 Vercel
   vercel login
   
   # 部署
   vercel --prod
   ```

### 替代部署方案

#### 1. Railway
- 简单的 Node.js 部署
- 免费额度：每月 $5 信用额度
- 自动从 GitHub 部署

#### 2. Render
- 免费的静态网站托管
- 支持 Node.js 应用
- 自动 SSL 证书

#### 3. Heroku
- 成熟的 PaaS 平台
- 免费额度有限
- 需要信用卡验证

### 不推荐的部署方案

❌ **阿里云 K8s 集群**：
- 成本较高（至少 ¥200-500/月）
- 配置复杂，需要容器化
- 对于简单的 Node.js API 过度设计
- 需要额外的运维工作

❌ **自建服务器**：
- 需要处理 SSL 证书
- 需要配置反向代理
- 需要处理安全更新
- 运维成本高

### 生产环境检查清单

部署前请确认：

- [ ] 环境变量已正确配置
- [ ] Supabase 数据库已初始化
- [ ] API 端点测试通过
- [ ] 错误处理完善
- [ ] 日志记录配置
- [ ] 安全策略启用
- [ ] 性能优化完成

### 监控和维护

部署后建议：
1. 设置 Vercel 的监控告警
2. 定期检查 Supabase 使用量
3. 监控 API 响应时间
4. 定期备份数据库
5. 更新依赖包安全补丁

---
**文档版本:** v2.0  
**最后更新:** 2024-06-17  
**服务版本:** 基于 Supabase 的生产就绪版本  
**部署状态:** 准备部署到 Vercel 

## iOS客户端集成指导

### 常见错误修复

#### 1. URL路径重复错误 (❌ 404: POST /api/api/ocr/parse)

**问题描述：**
如果您的iOS应用发送请求到错误的URL（如 `/api/api/ocr/parse`），后端会返回400错误和详细的修复指导。

**错误响应示例：**
```json
{
  "success": false,
  "error": "URL_PATH_DUPLICATE",
  "message": "检测到重复的API路径前缀",
  "details": {
    "received": "/api/api/ocr/parse",
    "correct": "/api/ocr/parse",
    "problem": "您的请求URL包含重复的/api前缀",
    "solution": "请检查前端代码中的API基础URL配置"
  },
  "frontend_fix": {
    "description": "常见的前端修复方法",
    "examples": [
      {
        "problem": "baseURL = \"https://domain.com/api\" + \"/api/ocr/parse\"",
        "solution": "baseURL = \"https://domain.com\" + \"/api/ocr/parse\""
      },
      {
        "problem": "const endpoint = \"/api/api/ocr/parse\"",
        "solution": "const endpoint = \"/api/ocr/parse\""
      },
      {
        "problem": "iOS: APIConfig.baseURL + \"/api/ocr/parse\"",
        "solution": "iOS: 使用 APIConfig.Endpoint.ocrParse.rawValue"
      }
    ]
  }
}
```

**iOS修复方法：**

1. **使用APIConfig.Endpoint枚举（推荐）：**
```swift
// ✅ 正确做法
let url = APIConfig.baseURL + APIConfig.Endpoint.ocrParse.rawValue

// ❌ 错误做法
let url = APIConfig.baseURL + "/api/ocr/parse"
```

2. **检查baseURL配置：**
```swift
// ✅ 正确配置
static let baseURL = "https://your-domain.com"

// ❌ 错误配置
static let baseURL = "https://your-domain.com/api"
```

3. **使用完整的APIConfig.Endpoint：**
```swift
enum APIConfig {
    static let baseURL = "https://expense-tracker-backend-1mnvyo1le-likexin0304s-projects.vercel.app"
    
    enum Endpoint: String {
        case ocrParse = "/api/ocr/parse"
        case ocrParseAuto = "/api/ocr/parse-auto"
        case ocrShortcuts = "/api/ocr/shortcuts/generate"
        // ... 其他端点
    }
}
```
