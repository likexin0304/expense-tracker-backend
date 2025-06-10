# 记账应用后端服务

这是一个基于Express和Node.js构建的记账应用后端服务，提供用户认证和预算管理功能。

## 项目特点

- 用户认证系统 (注册、登录、获取用户信息)
- 预算管理功能
- RESTful API设计
- JWT令牌认证
- 模块化架构 (MVC模式)
- 安全措施 (密码加密、速率限制、CORS等)

## 技术栈

- Node.js
- Express.js
- JSON Web Token (JWT)
- bcryptjs (密码加密)
- dotenv (环境变量管理)
- PostgreSQL (准备中)

## 目录结构

```
expense-tracker-backend/
├── src/
│   ├── controllers/      # 控制器逻辑
│   │   └── authController.js
│   ├── middleware/       # 中间件
│   │   └── auth.js
│   ├── models/           # 数据模型 (未来会添加)
│   ├── routes/           # 路由定义
│   │   ├── auth.js
│   │   └── budget.js
│   └── utils/            # 工具函数
├── .env                  # 环境变量配置
├── .env.example          # 环境变量示例
├── package.json          # 项目依赖
├── server.js             # 服务器入口文件
└── README.md             # 项目文档
```

## 安装指南

1. 克隆仓库
```bash
git clone <仓库地址>
cd expense-tracker-backend
```

2. 安装依赖
```bash
npm install
```

3. 创建环境变量文件
```bash
cp .env.example .env
```
然后编辑`.env`文件，设置合适的配置值。

4. 启动服务器
```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

## API文档

### 认证相关

#### 用户注册
- **URL**: `/api/auth/register`
- **方法**: `POST`
- **请求体**:
  ```json
  {
    "email": "user@example.com",
    "password": "yourpassword",
    "confirmPassword": "yourpassword"
  }
  ```
- **响应**:
  ```json
  {
    "success": true,
    "message": "注册成功",
    "data": {
      "user": {
        "id": 1,
        "email": "user@example.com",
        "createdAt": "2023-XX-XX",
        "updatedAt": "2023-XX-XX"
      },
      "token": "jwt_token_here"
    }
  }
  ```

#### 用户登录
- **URL**: `/api/auth/login`
- **方法**: `POST`
- **请求体**:
  ```json
  {
    "email": "user@example.com",
    "password": "yourpassword"
  }
  ```
- **响应**:
  ```json
  {
    "success": true,
    "message": "登录成功",
    "data": {
      "user": {
        "id": 1,
        "email": "user@example.com",
        "createdAt": "2023-XX-XX",
        "updatedAt": "2023-XX-XX"
      },
      "token": "jwt_token_here"
    }
  }
  ```

#### 获取当前用户信息
- **URL**: `/api/auth/me`
- **方法**: `GET`
- **请求头**: `Authorization: Bearer your_token_here`
- **响应**:
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": 1,
        "email": "user@example.com",
        "createdAt": "2023-XX-XX",
        "updatedAt": "2023-XX-XX"
      }
    }
  }
  ```

### 预算相关

#### 创建预算
- **URL**: `/api/budget`
- **方法**: `POST`
- **认证**: 需要JWT令牌
- **请求体**:
  ```json
  {
    "amount": 5000,
    "category": "生活费",
    "period": "monthly"
  }
  ```

#### 获取当前预算
- **URL**: `/api/budget/current`
- **方法**: `GET`
- **认证**: 需要JWT令牌

### 其他API

#### 健康检查
- **URL**: `/health`
- **方法**: `GET`
- **响应**:
  ```json
  {
    "status": "OK",
    "timestamp": "2023-XX-XX",
    "env": "development"
  }
  ```

#### 路由列表
- **URL**: `/api/debug/routes`
- **方法**: `GET`

## 安全特性

- 密码哈希保护 (bcrypt)
- JWT认证
- API速率限制
- Helmet保护HTTP头
- 环境变量配置

## 开发与部署

### 开发模式
```bash
npm run dev
```

### 生产模式
```bash
npm start
```

## 未来规划

- 数据库集成 (PostgreSQL)
- 事务记录功能
- 多币种支持
- 统计分析功能
- 预算提醒
- 数据导出功能

## 许可证

[MIT](LICENSE) 