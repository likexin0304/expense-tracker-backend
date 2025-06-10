/**
 * 支出路由模块
 * 集中管理所有与支出记录相关的路由
 */

const express = require('express');
const { 
    addExpense,
    getExpenses,
    getExpenseStatistics,
    updateExpense,
    deleteExpense,
    getExpenseCategories
} = require('../controllers/expenseController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// 所有支出路由都需要认证
router.use(authMiddleware);

/**
 * 添加支出记录
 * POST /api/expense
 */
router.post('/', addExpense);

/**
 * 获取支出记录列表
 * GET /api/expense
 * 查询参数: page, limit, category, startDate, endDate
 */
router.get('/', getExpenses);

/**
 * 获取支出统计信息
 * GET /api/expense/statistics
 * 查询参数: period (month/week/year)
 */
router.get('/statistics', getExpenseStatistics);

/**
 * 获取支出分类列表
 * GET /api/expense/categories
 */
router.get('/categories', getExpenseCategories);

/**
 * 更新支出记录
 * PUT /api/expense/:expenseId
 */
router.put('/:expenseId', updateExpense);

/**
 * 删除支出记录
 * DELETE /api/expense/:expenseId
 */
router.delete('/:expenseId', deleteExpense);

module.exports = router;