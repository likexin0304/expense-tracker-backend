const express = require('express');
const { 
  createExpense, 
  getExpenses, 
  getExpenseById, 
  updateExpense, 
  deleteExpense, 
  getExpenseStats, 
  getCategories,
  exportExpenses,
  getExpenseTrends
} = require('../controllers/expenseController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// 所有支出路由都需要认证
router.use(authMiddleware);

// 调试路由 - 测试ID处理
router.get('/debug/:id', (req, res) => {
  const { id } = req.params;
  console.log('🔧 调试路由被调用:', {
    id,
    type: typeof id,
    length: id.length,
    originalUrl: req.originalUrl
  });
  
  res.json({
    success: true,
    data: {
      receivedId: id,
      idType: typeof id,
      idLength: id.length,
      originalUrl: req.originalUrl,
      timestamp: new Date().toISOString()
    }
  });
});

// 获取支出分类列表 (必须在 :id 路由之前)
router.get('/categories', getCategories);

// 获取支出统计
router.get('/stats', getExpenseStats);

// 导出支出数据
router.get('/export', exportExpenses);

// 获取支出趋势分析
router.get('/trends', getExpenseTrends);



// 支出记录CRUD
router.post('/', createExpense);
router.get('/', getExpenses);
router.get('/:id', getExpenseById);
router.put('/:id', updateExpense);
router.delete('/:id', deleteExpense);

module.exports = router;