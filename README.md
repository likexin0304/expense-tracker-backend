# 费用追踪后端API

一个基于Express.js和Supabase的现代化费用追踪后端应用程序。提供完整的用户认证、预算管理和支出跟踪功能。

## ✨ 主要特性

- 🔐 **安全认证**: 基于Supabase Auth的用户注册和登录系统
- 💰 **预算管理**: 月度预算设置、追踪和提醒功能
- 📊 **支出记录**: 详细的支出分类、标签和统计分析
- 🚀 **RESTful API**: 规范的API设计，支持前端和移动端集成
- 🔒 **数据安全**: 行级安全策略(RLS)确保用户数据隔离
- 📈 **实时同步**: 基于Supabase的实时数据更新
- 📱 **移动端支持**: 完整的iOS/Android客户端API支持

## 🛠 技术栈

- **后端框架**: Express.js
- **数据库**: Supabase (PostgreSQL)
- **认证**: Supabase Auth
- **安全**: Helmet, CORS, Rate Limiting
- **开发工具**: Nodemon, ES6+

## 🚀 快速开始

### 1. 环境准备

确保您的开发环境中安装了：
- Node.js (v14或更高版本)
- npm 或 yarn
- 一个有效的Supabase项目

### 2. Supabase设置

1. 在[Supabase](https://supabase.com)创建新项目
2. 在SQL编辑器中运行 `database/init.sql` 脚本
3. 记下项目的URL和API密钥

### 3. 项目安装

```bash
# 克隆项目
git clone <repository-url>
cd expense-tracker-backend

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入您的Supabase配置
```

### 4. 环境变量配置

在项目根目录创建 `.env` 文件：

```env
# 服务器配置
PORT=3000
NODE_ENV=development

# Supabase配置
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_KEY=your-service-role-key-here
```

### 5. 启动服务器

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

服务器将在 `http://localhost:3000` 启动

## 📁 项目结构

```
expense-tracker-backend/
├── src/
│   ├── controllers/          # 业务逻辑控制器
│   │   ├── authController.js     # 用户认证控制器
│   │   ├── budgetController.js   # 预算管理控制器
│   │   └── expenseController.js  # 支出记录控制器
│   ├── middleware/           # 中间件
│   │   └── auth.js              # JWT认证中间件
│   ├── models/              # 数据模型
│   │   ├── User.js              # 用户模型 (Supabase Auth)
│   │   ├── Budget.js            # 预算模型
│   │   └── Expense.js           # 支出模型
│   ├── routes/              # API路由
│   │   ├── auth.js              # 认证路由
│   │   ├── budget.js            # 预算路由
│   │   └── expense.js           # 支出路由
│   ├── utils/               # 工具函数
│   │   ├── supabase.js          # Supabase客户端配置
│   │   └── tokenBlacklist.js    # Token黑名单管理
│   └── app.js               # Express应用配置
├── database/
│   └── init.sql             # 数据库初始化脚本
├── docs/                    # 文档
│   ├── API.md               # 详细API文档
│   └── supabase-setup-guide.md # Supabase设置指南
├── server.js                # 服务器入口文件
├── package.json             # 项目配置和依赖
├── log.md                   # 开发日志
└── README.md                # 项目说明
```

## 📚 API文档

### 🔐 认证端点

#### 用户注册
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

#### 用户登录
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

#### 获取当前用户信息
```http
GET /api/auth/me
Authorization: Bearer <jwt_token>
```

### 💰 预算管理

#### 设置月度预算
```http
POST /api/budget
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "amount": 3000.00,
  "year": 2024,
  "month": 6
}
```

#### 获取当前预算状态
```http
GET /api/budget/current
Authorization: Bearer <jwt_token>
```

#### 获取预算提醒
```http
GET /api/budget/alerts
Authorization: Bearer <jwt_token>
```

### 📊 支出管理

#### 创建支出记录
```http
POST /api/expense
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "amount": 25.50,
  "category": "food",
  "description": "午餐",
  "date": "2024-06-17",
  "paymentMethod": "card"
}
```

#### 获取支出列表
```http
GET /api/expense?page=1&limit=20&category=food&startDate=2024-06-01
Authorization: Bearer <jwt_token>
```

#### 获取支出统计
```http
GET /api/expense/stats
Authorization: Bearer <jwt_token>
```

## 🔒 安全特性

- **JWT认证**: 基于Supabase Auth的安全令牌系统
- **行级安全**: RLS策略确保用户只能访问自己的数据
- **速率限制**: 防止API滥用
- **CORS配置**: 跨域请求安全控制
- **输入验证**: 严格的数据验证和清理
- **Helmet安全**: 设置各种HTTP安全头

## 📱 移动端集成

### iOS客户端示例

```swift
import Supabase

let supabase = SupabaseClient(
    supabaseURL: URL(string: "YOUR_SUPABASE_URL")!,
    supabaseKey: "YOUR_SUPABASE_ANON_KEY"
)

// 用户注册
let user = try await supabase.auth.signUp(
    email: "user@example.com",
    password: "password123"
)

// 创建支出记录
let expense: [String: Any] = [
    "amount": 25.50,
    "category": "food",
    "description": "午餐"
]

try await supabase
    .from("expenses")
    .insert(expense)
    .execute()
```

## 🧪 测试

### 健康检查
```bash
curl http://localhost:3000/health
```

### API路由列表
```bash
curl http://localhost:3000/api/debug/routes
```

### 用户注册测试
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## 🚀 部署

### 环境变量检查清单

- [ ] `SUPABASE_URL` - Supabase项目URL
- [ ] `SUPABASE_ANON_KEY` - Supabase匿名密钥
- [ ] `SUPABASE_SERVICE_KEY` - Supabase服务密钥
- [ ] `PORT` - 服务器端口 (默认3000)
- [ ] `NODE_ENV` - 环境模式 (development/production)

### 数据库设置

1. 在Supabase中运行 `database/init.sql`
2. 验证表结构和RLS策略
3. 测试用户注册和数据操作

### 生产部署

```bash
# 设置环境变量
export NODE_ENV=production
export PORT=3000
export SUPABASE_URL=your_production_url
export SUPABASE_ANON_KEY=your_anon_key
export SUPABASE_SERVICE_KEY=your_service_key

# 启动服务
npm start
```

## 📖 详细文档

- [完整API文档](docs/API.md)
- [Supabase设置指南](docs/supabase-setup-guide.md)
- [开发日志](log.md)

## 🤝 贡献

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

[MIT](LICENSE)

## 📞 支持

如果您遇到任何问题或有疑问，请：

1. 查看 [API文档](docs/API.md)
2. 检查 [开发日志](log.md) 了解已知问题
3. 创建 GitHub Issue

---

**🎉 项目已完成Supabase集成，支持生产环境部署！** 