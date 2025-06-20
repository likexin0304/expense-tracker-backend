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

// 兼容性路由 - 处理错误的查询参数格式（在认证之前检查）
router.all('/', (req, res, next) => {
  const { id } = req.query;
  
  if (id && req.method !== 'GET' && req.method !== 'POST') {
    console.log('🔄 检测到错误的URL格式，重定向到正确格式:', {
      method: req.method,
      originalUrl: req.originalUrl,
      queryId: id,
      correctUrl: `/api/expense/${id}`
    });
    
    return res.status(400).json({
      success: false,
      message: `URL格式错误`,
      error: {
        received: req.originalUrl,
        correct: `/api/expense/${id}`,
        method: req.method,
        description: `${req.method}请求应使用路径参数而不是查询参数`
      },
      help: {
        correctFormat: `${req.method} /api/expense/${id}`,
        incorrectFormat: `${req.method} /api/expense?id=${id}`,
        documentation: "/api/debug/routes"
      }
    });
  }
  
  next();
});

// 所有支出路由都需要认证（除了上面的兼容性检查）
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