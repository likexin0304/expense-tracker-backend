/**
 * 预算路由模块
 */
const express = require('express');
const { 
    setBudget, 
    getCurrentBudgetStatus, 
    getBudgetByMonth, 
    getAllBudgets, 
    deleteBudget,
    getBudgetAlerts,
    getBudgetSuggestions
} = require('../controllers/budgetController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// 所有预算路由都需要认证
router.use(authMiddleware);

// 设置预算
router.post('/', setBudget);

// 获取当前预算状态
router.get('/current', getCurrentBudgetStatus);

// 获取预算提醒和预警
router.get('/alerts', getBudgetAlerts);

// 获取预算建议
router.get('/suggestions', getBudgetSuggestions);

// 获取所有预算历史
router.get('/history', getAllBudgets);

// 获取指定月份预算
router.get('/:year/:month', getBudgetByMonth);

// 删除预算
router.delete('/:budgetId', deleteBudget);

module.exports = router;