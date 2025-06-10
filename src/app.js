/**
 * Express应用程序主配置文件
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// 导入路由模块
const authRoutes = require('./routes/auth');
const budgetRoutes = require('./routes/budget');
const expenseRoutes = require('./routes/expense');

const app = express();

console.log('🚀 正在启动服务器...');

// 安全中间件
app.use(helmet());
app.use(cors());

// 限流中间件
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 100, // 最多100个请求
    message: {
        success: false,
        message: '请求过于频繁，请稍后再试'
    }
});
app.use(limiter);

// 解析JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 请求日志中间件
app.use((req, res, next) => {
    console.log(`📝 ${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
});

// 健康检查
app.get('/health', (req, res) => {
    console.log('💚 健康检查');
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV || 'development'
    });
});

// 挂载路由
app.use('/api/auth', authRoutes);
app.use('/api/budget', budgetRoutes);
app.use('/api/expense', expenseRoutes);

// API文档路由
app.get('/api/debug/routes', (req, res) => {
    res.json({
        available_routes: [
            'GET /health',
            'GET /api/debug/routes',
            // 认证相关
            'POST /api/auth/register',
            'POST /api/auth/login',
            'GET /api/auth/me',
            'GET /api/auth/debug/users (仅开发环境)',
            // 预算相关 (需要认证)
            'POST /api/budget',
            'GET /api/budget/current',
            // 支出相关 (需要认证)
            'POST /api/expense',
            'GET /api/expense',
            'GET /api/expense/statistics',
            'GET /api/expense/categories',
            'PUT /api/expense/:expenseId',
            'DELETE /api/expense/:expenseId'
        ]
    });
});

// 404处理
app.use((req, res, next) => {
    console.log(`❌ 404: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
        success: false,
        message: `路由 ${req.originalUrl} 不存在`,
        available_routes: '/api/debug/routes'
    });
});

// 全局错误处理
app.use((error, req, res, next) => {
    console.error('💥 全局错误:', error);
    res.status(500).json({
        success: false,
        message: '服务器内部错误',
        ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
});

console.log('✅ 服务器配置完成');

module.exports = app;