const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');
const auth = require('../middleware/auth');

// 所有路由都需要认证
router.use(auth);

// 支出分类路由
router.get('/categories', expenseController.getCategories);

// 支出统计路由 - 必须在 /:id 路由之前
router.get('/stats', expenseController.getExpenseStats);

// 基本CRUD路由
router.get('/', expenseController.getExpenses);           // 获取支出列表
router.post('/', expenseController.createExpense);        // 创建支出记录
router.get('/:id', expenseController.getExpenseById);     // 获取单个支出记录
router.put('/:id', expenseController.updateExpense);      // 更新支出记录
router.delete('/:id', expenseController.deleteExpense);   // 删除支出记录

module.exports = router;