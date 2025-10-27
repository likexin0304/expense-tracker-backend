const { Expense, CATEGORIES, PAYMENT_METHODS } = require('../models/Expense');

// 创建支出记录
exports.createExpense = async (req, res) => {
  try {
    console.log('📝 创建支出记录请求:', {
      userId: req.userId,
      body: req.body
    });

    const { amount, category, description, date, location, paymentMethod, tags } = req.body;

    // 数据验证
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: '金额必须大于0'
      });
    }

    if (!category) {
      return res.status(400).json({
        success: false,
        message: '支出分类不能为空'
      });
    }

    if (!description || description.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: '支出描述不能为空'
      });
    }

    const expenseData = {
      userId: req.userId,
      amount: parseFloat(amount),
      category,
      description: description.trim(),
      date: date ? new Date(date) : new Date(),
      location: location || null,
      paymentMethod: paymentMethod || 'cash',
      tags: tags || []
    };

    const expense = await Expense.create(expenseData);

    console.log('✅ 支出记录创建成功:', expense.id);

    res.status(201).json({
      success: true,
      message: '支出记录创建成功',
      data: expense
    });

  } catch (error) {
    console.error('❌ 创建支出记录失败:', error);
    res.status(500).json({
      success: false,
      message: '创建支出记录失败',
      error: error.message
    });
  }
};

// 获取用户支出列表
exports.getExpenses = async (req, res) => {
  try {
    console.log('📋 获取支出列表请求:', {
      userId: req.userId,
      query: req.query
    });

    const { 
      page = 1, 
      limit = 20, 
      category, 
      startDate, 
      endDate,
      sortBy = 'date',
      sortOrder = 'desc'
    } = req.query;

    // 构建查询选项
    const options = {
      category,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      sort: sortBy === 'date' ? 'date_desc' : sortBy === 'amount' ? 'amount_desc' : undefined,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    };

    console.log('🔍 查询选项:', options);

    // 执行查询
    const expenses = await Expense.findByUserId(req.userId, options);
    
    // 获取总数 (简化版本，实际中可以添加总数计算)
    const allExpenses = await Expense.findByUserId(req.userId, { 
      category, 
      startDate: options.startDate, 
      endDate: options.endDate 
    });
    const total = allExpenses.length;

    console.log(`✅ 查询到 ${expenses.length} 条支出记录，总共 ${total} 条`);

    res.json({
      success: true,
      data: {
        expenses,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('❌ 获取支出列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取支出列表失败',
      error: error.message
    });
  }
};

// 获取单个支出记录
exports.getExpenseById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🔍 原始请求信息:', {
      method: req.method,
      url: req.url,
      originalUrl: req.originalUrl,
      path: req.path,
      params: req.params,
      headers: Object.keys(req.headers)
    });
    
    console.log('📄 获取支出详情:', {
      id,
      idLength: id.length,
      idType: typeof id,
      userId: req.userId,
      rawParams: req.params,
      originalUrl: req.originalUrl
    });

    const expense = await Expense.findById(id);

    if (!expense || !expense.belongsToUser(req.userId)) {
      return res.status(404).json({
        success: false,
        message: '支出记录不存在'
      });
    }

    console.log('✅ 支出详情获取成功');

    res.json({
      success: true,
      data: expense
    });

  } catch (error) {
    console.error('❌ 获取支出详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取支出详情失败',
      error: error.message
    });
  }
};

// 更新支出记录
exports.updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('✏️ 更新支出记录:', { id, userId: req.userId, body: req.body });

    const updateData = { ...req.body };
    
    // 处理日期
    if (updateData.date) {
      updateData.date = new Date(updateData.date);
    }
    
    // 处理金额
    if (updateData.amount) {
      updateData.amount = parseFloat(updateData.amount);
    }

    const expense = await Expense.updateById(id, updateData);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: '支出记录不存在'
      });
    }

    // 验证是否属于当前用户
    if (!expense.belongsToUser(req.userId)) {
      return res.status(403).json({
        success: false,
        message: '无权访问该支出记录'
      });
    }

    console.log('✅ 支出记录更新成功');

    res.json({
      success: true,
      message: '支出记录更新成功',
      data: expense
    });

  } catch (error) {
    console.error('❌ 更新支出记录失败:', error);
    res.status(500).json({
      success: false,
      message: '更新支出记录失败',
      error: error.message
    });
  }
};

// 删除支出记录
exports.deleteExpense = async (req, res) => {
    try {
    const { id } = req.params;
    
    // 强制调试日志 - 确保使用最新代码 v1.0.5
    console.log('🗑️ 删除支出记录 [v1.0.5-latest]:', {
      id,
      idType: typeof id,
      idLength: id ? id.length : 'undefined',
      userId: req.userId,
      rawParams: req.params,
      originalUrl: req.originalUrl,
      timestamp: new Date().toISOString()
    });

    // 验证ID格式
    if (!id || typeof id !== 'string' || id.length !== 36) {
      console.error('❌ 无效的UUID格式:', { id, type: typeof id, length: id ? id.length : 'undefined' });
      return res.status(400).json({
        success: false,
        message: '无效的支出记录ID格式'
      });
    }

    // 先检查记录是否存在且属于当前用户
    console.log('🔍 调用 Expense.findById，传入ID:', { id, type: typeof id, length: id.length });
    const expense = await Expense.findById(id);
    
    if (!expense || !expense.belongsToUser(req.userId)) {
      return res.status(404).json({
        success: false,
        message: '支出记录不存在'
      });
    }

    // 删除记录
    console.log('🗑️ 调用 Expense.deleteById，传入ID:', { id, type: typeof id, length: id.length });
    const deleted = await Expense.deleteById(id);
    
    if (!deleted) {
      return res.status(500).json({
        success: false,
        message: '删除失败'
      });
    }

    console.log('✅ 支出记录删除成功 [v1.0.5-latest]');

    res.json({
      success: true,
      message: '支出记录删除成功'
    });

  } catch (error) {
    console.error('❌ 删除支出记录失败 [v1.0.5-latest]:', error);
    res.status(500).json({
      success: false,
      message: '删除支出记录失败',
      error: error.message
    });
  }
};

// 获取支出统计
exports.getExpenseStats = async (req, res) => {
  try {
    console.log('📊 获取支出统计:', { userId: req.userId, query: req.query });

    const { startDate, endDate, period = 'month' } = req.query;
    const userId = req.userId;

    // 构建时间范围
    const startDateFilter = startDate ? new Date(startDate) : undefined;
    const endDateFilter = endDate ? new Date(endDate) : undefined;

    console.log('🔍 统计查询条件:', { userId, startDate: startDateFilter, endDate: endDateFilter });

    // 按分类统计
    const categoryStats = await Expense.getStatsByCategory(userId, startDateFilter, endDateFilter);

    // 总计统计
    const totalStatsResult = await Expense.getTotalByUser(userId, startDateFilter, endDateFilter);
    const totalStats = totalStatsResult[0] || {
      totalAmount: 0,
      totalCount: 0,
      avgAmount: 0,
      maxAmount: 0,
      minAmount: 0
    };

    // 按时间周期统计 (简化版本)
    const periodStats = [];
    // TODO: 后续可以添加更复杂的时间分组统计
    console.log('📝 时间周期统计暂未实现，期间:', period);

    console.log('✅ 支出统计获取成功:', {
      categoryStatsCount: categoryStats.length,
      totalStats,
      periodStatsCount: periodStats.length
    });

    res.json({
      success: true,
      data: {
        categoryStats,
        totalStats,
        periodStats
      }
    });

  } catch (error) {
    console.error('❌ 获取支出统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取支出统计失败',
      error: error.message
    });
  }
};

// 获取支出分类列表
exports.getCategories = async (req, res) => {
  try {
    console.log('📋 获取支出分类列表');

    // 使用已导入的分类列表
    const categories = CATEGORIES;

    const categoriesWithInfo = [
      { value: 'food', label: '餐饮', icon: '🍽️' },
      { value: 'transport', label: '交通', icon: '🚗' },
      { value: 'entertainment', label: '娱乐', icon: '🎮' },
      { value: 'shopping', label: '购物', icon: '🛒' },
      { value: 'bills', label: '账单', icon: '📄' },
      { value: 'healthcare', label: '医疗', icon: '💊' },
      { value: 'education', label: '教育', icon: '📚' },
      { value: 'travel', label: '旅行', icon: '✈️' },
      { value: 'other', label: '其他', icon: '📝' }
    ];

    console.log('✅ 分类列表获取成功，共', categoriesWithInfo.length, '个分类');

    res.json({
      success: true,
      data: {
        categories: categoriesWithInfo,
        total: categoriesWithInfo.length
      }
    });

  } catch (error) {
    console.error('❌ 获取分类列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取分类列表失败',
      error: error.message
    });
  }
};

// 导出支出数据
exports.exportExpenses = async (req, res) => {
  try {
    console.log('📤 导出支出数据请求:', { userId: req.userId, query: req.query });

    const { format = 'json', startDate, endDate, category } = req.query;
    const userId = req.userId;

    // 构建查询选项
    const options = {
      category,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined
    };

    // 获取所有符合条件的支出记录
    const expenses = await Expense.findByUserId(userId, options);

    console.log(`📊 准备导出 ${expenses.length} 条支出记录，格式: ${format}`);

    if (format === 'csv') {
      // CSV格式导出
      const csvHeader = 'ID,金额,分类,描述,日期,地点,支付方式,标签,创建时间\n';
      const csvData = expenses.map(expense => {
        return [
          expense.id,
          expense.amount,
          expense.category,
          `"${expense.description.replace(/"/g, '""')}"`, // 处理CSV中的引号
          expense.date.toISOString().split('T')[0], // 只保留日期部分
          expense.location || '',
          expense.paymentMethod,
          expense.tags.join(';'),
          expense.createdAt.toISOString().split('T')[0]
        ].join(',');
      }).join('\n');

      const csvContent = csvHeader + csvData;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="expenses_${new Date().toISOString().split('T')[0]}.csv"`);
      res.send('\uFEFF' + csvContent); // 添加BOM以支持中文

    } else {
      // JSON格式导出
      const exportData = {
        exportInfo: {
          exportDate: new Date().toISOString(),
          totalRecords: expenses.length,
          dateRange: {
            start: startDate || '全部',
            end: endDate || '全部'
          },
          category: category || '全部分类'
        },
        expenses: expenses.map(expense => ({
          id: expense.id,
          amount: expense.amount,
          category: expense.category,
          description: expense.description,
          date: expense.date.toISOString(),
          location: expense.location,
          paymentMethod: expense.paymentMethod,
          tags: expense.tags,
          createdAt: expense.createdAt.toISOString(),
          updatedAt: expense.updatedAt.toISOString()
        }))
      };

      if (req.query.download === 'true') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="expenses_${new Date().toISOString().split('T')[0]}.json"`);
        res.send(JSON.stringify(exportData, null, 2));
      } else {
        res.json({
          success: true,
          data: exportData
        });
      }
    }

    console.log('✅ 支出数据导出成功');

  } catch (error) {
    console.error('❌ 导出支出数据失败:', error);
    res.status(500).json({
      success: false,
      message: '导出支出数据失败',
      error: error.message
    });
  }
};

// 获取支出趋势分析
exports.getExpenseTrends = async (req, res) => {
  try {
    console.log('📈 获取支出趋势分析:', { userId: req.userId, query: req.query });

    const { period = 'month', limit = 12 } = req.query;
    const userId = req.userId;

    // 获取用户所有支出记录
    const allExpenses = await Expense.findByUserId(userId);

    // 按时间分组统计
    const trends = {};
    const now = new Date();

    allExpenses.forEach(expense => {
      const expenseDate = new Date(expense.date);
      let key;

      if (period === 'day') {
        key = expenseDate.toISOString().split('T')[0]; // YYYY-MM-DD
      } else if (period === 'week') {
        const startOfWeek = new Date(expenseDate);
        startOfWeek.setDate(expenseDate.getDate() - expenseDate.getDay());
        key = startOfWeek.toISOString().split('T')[0];
      } else { // month
        key = `${expenseDate.getFullYear()}-${String(expenseDate.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!trends[key]) {
        trends[key] = {
          period: key,
          totalAmount: 0,
          count: 0,
          categories: {}
        };
      }

      trends[key].totalAmount += expense.amount;
      trends[key].count += 1;

      if (!trends[key].categories[expense.category]) {
        trends[key].categories[expense.category] = 0;
      }
      trends[key].categories[expense.category] += expense.amount;
    });

    // 转换为数组并排序
    const trendArray = Object.values(trends)
      .sort((a, b) => b.period.localeCompare(a.period))
      .slice(0, parseInt(limit));

    // 计算趋势指标
    const analysis = {
      totalPeriods: trendArray.length,
      averagePerPeriod: trendArray.length > 0 ? 
        trendArray.reduce((sum, trend) => sum + trend.totalAmount, 0) / trendArray.length : 0,
      highestPeriod: trendArray.length > 0 ? 
        trendArray.reduce((max, trend) => trend.totalAmount > max.totalAmount ? trend : max) : null,
      lowestPeriod: trendArray.length > 0 ? 
        trendArray.reduce((min, trend) => trend.totalAmount < min.totalAmount ? trend : min) : null
    };

    console.log(`✅ 趋势分析完成，共 ${trendArray.length} 个时间段`);

    res.json({
      success: true,
      data: {
        period,
        trends: trendArray,
        analysis
      }
    });

  } catch (error) {
    console.error('❌ 获取支出趋势失败:', error);
    res.status(500).json({
      success: false,
      message: '获取支出趋势失败',
      error: error.message
    });
  }
};