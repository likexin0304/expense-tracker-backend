/**
 * 预算路由模块
 */
const express = require('express');
const { setBudget, getCurrentBudgetStatus } = require('../controllers/budgetController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// 所有预算路由都需要认证
router.use(authMiddleware);

// 设置预算
router.post('/', setBudget);

// 获取当前预算状态
router.get('/current', getCurrentBudgetStatus);

module.exports = router;