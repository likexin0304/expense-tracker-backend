/**
 * 认证路由模块
 * 集中管理所有与用户认证相关的路由
 * 这是一个模块化路由实现示例
 */

// 导入Express框架
const express = require('express');

// 导入控制器和中间件
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

// 创建路由实例
const router = express.Router();

/**
 * 用户注册路由
 * 处理用户注册请求
 * 路径: POST /api/auth/register
 */
router.post('/register', authController.register);

/**
 * 用户登录路由
 * 处理用户登录请求
 * 路径: POST /api/auth/login
 */
router.post('/login', authController.login);

/**
 * 获取当前用户信息路由
 * 返回已认证用户的详细信息
 * 路径: GET /api/auth/me
 * 需要认证：是
 */
router.get('/me', authMiddleware, authController.getCurrentUser);

/**
 * 删除账号路由
 * 软删除用户账号，需要确认文本验证
 * 路径: DELETE /api/auth/account
 * 需要认证：是
 */
router.delete('/account', authMiddleware, authController.deleteAccount);

/**
 * 获取用户列表路由（仅用于调试）
 * 返回所有注册用户的列表（不含密码）
 * 路径: GET /api/auth/debug/users
 */
router.get('/debug/users', authController.getUsers);

// 导出路由模块
module.exports = router;