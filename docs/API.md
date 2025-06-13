# 记账应用后端 API 文档

## 目录
- [基本信息](#基本信息)
- [认证说明](#认证说明)
- [公共接口](#公共接口)
- [认证相关 API](#认证相关-api)
- [预算管理 API](#预算管理-api)
- [支出记录 API](#支出记录-api)
- [数据模型](#数据模型)
- [错误码说明](#错误码说明)

## 基本信息

**基础 URL:** `http://localhost:3000`

**内容类型:** `application/json`

**认证方式:** Bearer Token (JWT)

**响应格式:** 所有 API 返回统一的 JSON 格式：

```json
{
  "success": boolean,
  "message": string,
  "data": object | array (可选)
}
```

## ⚠️ 重要：请求体格式要求

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

除了公共接口外，所有API都需要在请求头中包含JWT令牌：

```
Authorization: Bearer <token>
```

令牌通过登录接口获取，有效期为7天。

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
    "DELETE /api/expense/:id"
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

注册新用户账户

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
      "id": 1,
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

用户登录获取访问令牌

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
      "id": 1,
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

**请求头:**
```
Authorization: Bearer <token>
```

**成功响应 (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
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

**请求头:**
```
Authorization: Bearer <token>
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
> - 所有相关JWT token将立即失效
> - 用户数据会被保留但标记为已删除

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
- `id`: 支出记录ID

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
- `id`: 支出记录ID

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
- `id`: 支出记录ID

**成功响应 (200):**
```json
{
  "success": true,
  "message": "支出记录删除成功"
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
```

## 联系方式

如有API相关问题，请联系开发团队。

---
**文档版本:** v1.0  
**最后更新:** 2024-01-15  
**服务版本:** 基于内存存储的MVP版本 