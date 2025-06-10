/**
 * 支出控制器
 * 处理所有支出记录相关的业务逻辑
 */

const Expense = require('../models/Expense');
const Budget = require('../models/Budget');

/**
 * 添加支出记录
 */
const addExpense = async (req, res) => {
    try {
        console.log('💰 添加支出请求:', { userId: req.userId, body: req.body });
        
        const { amount, category, description = '' } = req.body;
        const userId = req.userId;

        // 输入验证
        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: '请输入有效的支出金额'
            });
        }

        if (amount > 100000) {
            return res.status(400).json({
                success: false,
                message: '单次支出金额不能超过10万元'
            });
        }

        if (!category || category.trim() === '') {
            return res.status(400).json({
                success: false,
                message: '请选择支出分类'
            });
        }

        // 创建支出记录
        const expense = await Expense.create({
            userId,
            amount,
            category: category.trim(),
            description: description.trim()
        });

        console.log(`✅ 支出记录创建成功: 用户${userId} ¥${amount} ${category}`);

        res.status(201).json({
            success: true,
            message: '支出记录添加成功',
            data: {
                expense: expense.toJSON()
            }
        });

    } catch (error) {
        console.error('❌ 添加支出错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
};

/**
 * 获取支出记录列表
 */
const getExpenses = async (req, res) => {
    try {
        console.log('📋 获取支出列表请求:', { userId: req.userId, query: req.query });
        
        const userId = req.userId;
        const { page = 1, limit = 20, category, startDate, endDate } = req.query;

        // 获取用户所有支出
        let expenses = await Expense.findByUserId(userId);

        // 按分类过滤
        if (category && category !== 'all') {
            expenses = expenses.filter(expense => expense.category === category);
            console.log(`🔍 按分类过滤: ${category}, 结果数量: ${expenses.length}`);
        }

        // 按日期范围过滤
        if (startDate || endDate) {
            const start = startDate ? new Date(startDate) : new Date('1900-01-01');
            const end = endDate ? new Date(endDate) : new Date();
            
            expenses = expenses.filter(expense => {
                const expenseDate = new Date(expense.createdAt);
                return expenseDate >= start && expenseDate <= end;
            });
            console.log(`🔍 按日期过滤: ${startDate} ~ ${endDate}, 结果数量: ${expenses.length}`);
        }

        // 按创建时间倒序排列
        expenses.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // 分页处理
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const startIndex = (pageNum - 1) * limitNum;
        const endIndex = startIndex + limitNum;
        const paginatedExpenses = expenses.slice(startIndex, endIndex);

        console.log(`📊 支出列表: 总数${expenses.length}, 当前页${pageNum}, 返回${paginatedExpenses.length}条`);

        res.json({
            success: true,
            data: {
                expenses: paginatedExpenses.map(expense => expense.toJSON()),
                pagination: {
                    current: pageNum,
                    total: expenses.length,
                    pages: Math.ceil(expenses.length / limitNum),
                    limit: limitNum
                }
            }
        });

    } catch (error) {
        console.error('❌ 获取支出列表错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
};

/**
 * 获取支出统计信息
 */
const getExpenseStatistics = async (req, res) => {
    try {
        console.log('📊 获取支出统计请求:', { userId: req.userId, query: req.query });
        
        const userId = req.userId;
        const { period = 'month' } = req.query; // month, week, year

        const now = new Date();
        let startDate, endDate;

        // 根据period确定时间范围
        switch (period) {
            case 'week':
                const startOfWeek = new Date(now);
                startOfWeek.setDate(now.getDate() - now.getDay());
                startOfWeek.setHours(0, 0, 0, 0);
                startDate = startOfWeek;
                endDate = new Date(now);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                endDate = new Date(now);
                break;
            case 'month':
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now);
                break;
        }

        // 获取时间范围内的支出
        const allExpenses = await Expense.findByUserId(userId);
        const periodExpenses = allExpenses.filter(expense => {
            const expenseDate = new Date(expense.createdAt);
            return expenseDate >= startDate && expenseDate <= endDate;
        });

        // 计算总支出
        const totalAmount = periodExpenses.reduce((sum, expense) => sum + expense.amount, 0);

        // 按分类统计
        const categoryStats = {};
        periodExpenses.forEach(expense => {
            if (!categoryStats[expense.category]) {
                categoryStats[expense.category] = {
                    amount: 0,
                    count: 0,
                    percentage: 0
                };
            }
            categoryStats[expense.category].amount += expense.amount;
            categoryStats[expense.category].count += 1;
        });

        // 计算分类百分比
        Object.keys(categoryStats).forEach(category => {
            categoryStats[category].percentage = totalAmount > 0 
                ? (categoryStats[category].amount / totalAmount) * 100 
                : 0;
        });

        // 计算日均支出
        const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        const dailyAverage = daysDiff > 0 ? totalAmount / daysDiff : 0;

        console.log(`📊 ${period}统计: 总支出¥${totalAmount}, 记录${periodExpenses.length}条, 日均¥${dailyAverage.toFixed(2)}`);

        res.json({
            success: true,
            data: {
                period,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                totalAmount,
                totalCount: periodExpenses.length,
                dailyAverage: Math.round(dailyAverage * 100) / 100,
                categoryStats
            }
        });

    } catch (error) {
        console.error('❌ 获取支出统计错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
};

/**
 * 更新支出记录
 */
const updateExpense = async (req, res) => {
    try {
        const { expenseId } = req.params;
        const userId = req.userId;
        const { amount, category, description } = req.body;

        console.log(`✏️ 更新支出请求: ID${expenseId}, 用户${userId}`);

        // 查找支出记录
        const expense = await Expense.findById(parseInt(expenseId));
        if (!expense) {
            return res.status(404).json({
                success: false,
                message: '支出记录不存在'
            });
        }

        // 验证所有权
        if (expense.userId !== userId) {
            return res.status(403).json({
                success: false,
                message: '无权限修改此支出记录'
            });
        }

        // 输入验证
        if (amount && (amount <= 0 || amount > 100000)) {
            return res.status(400).json({
                success: false,
                message: '支出金额必须在0-100000之间'
            });
        }

        // 更新支出记录
        const updateData = {};
        if (amount !== undefined) updateData.amount = amount;
        if (category !== undefined) updateData.category = category.trim();
        if (description !== undefined) updateData.description = description.trim();

        const updatedExpense = await Expense.updateById(parseInt(expenseId), updateData);

        console.log(`✅ 支出记录更新成功: ID${expenseId}`);

        res.json({
            success: true,
            message: '支出记录更新成功',
            data: {
                expense: updatedExpense.toJSON()
            }
        });

    } catch (error) {
        console.error('❌ 更新支出错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
};

/**
 * 删除支出记录
 */
const deleteExpense = async (req, res) => {
    try {
        const { expenseId } = req.params;
        const userId = req.userId;

        console.log(`🗑️ 删除支出请求: ID${expenseId}, 用户${userId}`);

        // 查找支出记录
        const expense = await Expense.findById(parseInt(expenseId));
        if (!expense) {
            return res.status(404).json({
                success: false,
                message: '支出记录不存在'
            });
        }

        // 验证所有权
        if (expense.userId !== userId) {
            return res.status(403).json({
                success: false,
                message: '无权限删除此支出记录'
            });
        }

        // 删除支出记录
        const success = await Expense.deleteById(parseInt(expenseId));

        if (success) {
            console.log(`✅ 支出记录删除成功: ID${expenseId}`);
            res.json({
                success: true,
                message: '支出记录删除成功'
            });
        } else {
            res.status(500).json({
                success: false,
                message: '删除失败'
            });
        }

    } catch (error) {
        console.error('❌ 删除支出错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
};

/**
 * 获取支出分类列表
 */
const getExpenseCategories = async (req, res) => {
    try {
        const categories = [
            { name: '餐饮', icon: 'fork.knife', color: 'orange' },
            { name: '交通', icon: 'car.fill', color: 'blue' },
            { name: '购物', icon: 'bag.fill', color: 'pink' },
            { name: '娱乐', icon: 'gamecontroller.fill', color: 'purple' },
            { name: '医疗', icon: 'cross.fill', color: 'red' },
            { name: '教育', icon: 'book.fill', color: 'green' },
            { name: '住房', icon: 'house.fill', color: 'brown' },
            { name: '其他', icon: 'ellipsis.circle.fill', color: 'gray' }
        ];

        res.json({
            success: true,
            data: {
                categories
            }
        });
    } catch (error) {
        console.error('❌ 获取分类列表错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
};

module.exports = {
    addExpense,
    getExpenses,
    getExpenseStatistics,
    updateExpense,
    deleteExpense,
    getExpenseCategories
};