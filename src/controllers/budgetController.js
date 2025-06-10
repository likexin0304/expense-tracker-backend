/**
 * 预算控制器
 * 处理所有预算相关的业务逻辑
 */

const Budget = require('../models/Budget');
const Expense = require('../models/Expense');

/**
 * 设置或更新月度预算
 */
const setBudget = async (req, res) => {
    try {
        console.log('📝 设置预算请求:', { userId: req.userId, body: req.body });
        
        const { amount, year, month } = req.body;
        const userId = req.userId;

        // 输入验证
        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: '请输入有效的预算金额'
            });
        }

        // 如果没有提供年月，使用当前年月
        const now = new Date();
        const targetYear = year || now.getFullYear();
        const targetMonth = month || (now.getMonth() + 1);

        // 创建或更新预算
        const budget = await Budget.createOrUpdate({
            userId,
            amount,
            year: targetYear,
            month: targetMonth
        });

        res.json({
            success: true,
            message: '预算设置成功',
            data: {
                budget: budget.toJSON()
            }
        });

    } catch (error) {
        console.error('❌ 设置预算错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
};

/**
 * 获取当前月度预算和支出统计
 */
const getCurrentBudgetStatus = async (req, res) => {
    try {
        console.log('📊 获取预算状态请求:', { userId: req.userId });
        
        const userId = req.userId;
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;

        // 获取当前月份预算
        const budget = await Budget.getCurrentMonthBudget(userId);
        
        // 获取当前月份支出总额
        const totalExpenses = await Expense.getCurrentMonthTotal(userId);

        // 计算预算状态
        const budgetAmount = budget ? budget.amount : 0;
        const remainingBudget = budgetAmount - totalExpenses;
        const usagePercentage = budgetAmount > 0 ? (totalExpenses / budgetAmount) * 100 : 0;

        console.log(`📊 预算状态: 预算¥${budgetAmount}, 已花费¥${totalExpenses}, 使用率${usagePercentage.toFixed(1)}%`);

        res.json({
            success: true,
            data: {
                budget: budget ? budget.toJSON() : null,
                statistics: {
                    budgetAmount,
                    totalExpenses,
                    remainingBudget,
                    usagePercentage: Math.round(usagePercentage * 100) / 100, // 保留2位小数
                    year: currentYear,
                    month: currentMonth
                }
            }
        });

    } catch (error) {
        console.error('❌ 获取预算状态错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
};

/**
 * 获取指定月份预算
 */
const getBudgetByMonth = async (req, res) => {
    try {
        const userId = req.userId;
        const { year, month } = req.params;

        // 参数验证
        const targetYear = parseInt(year);
        const targetMonth = parseInt(month);

        if (!targetYear || !targetMonth || targetMonth < 1 || targetMonth > 12) {
            return res.status(400).json({
                success: false,
                message: '请提供有效的年份和月份'
            });
        }

        // 获取指定月份预算
        const budget = await Budget.findByUserAndMonth(userId, targetYear, targetMonth);
        
        // 获取指定月份支出总额
        const totalExpenses = await Expense.getMonthlyTotal(userId, targetYear, targetMonth);

        res.json({
            success: true,
            data: {
                budget: budget ? budget.toJSON() : null,
                totalExpenses
            }
        });

    } catch (error) {
        console.error('❌ 获取指定月份预算错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
};

/**
 * 获取用户所有预算历史
 */
const getAllBudgets = async (req, res) => {
    try {
        const userId = req.userId;
        
        const budgets = await Budget.findByUserId(userId);
        
        res.json({
            success: true,
            data: {
                budgets: budgets.map(budget => budget.toJSON())
            }
        });

    } catch (error) {
        console.error('❌ 获取预算历史错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
};

/**
 * 删除预算
 */
const deleteBudget = async (req, res) => {
    try {
        const { budgetId } = req.params;
        
        const success = await Budget.deleteById(parseInt(budgetId));
        
        if (success) {
            res.json({
                success: true,
                message: '预算删除成功'
            });
        } else {
            res.status(404).json({
                success: false,
                message: '预算不存在'
            });
        }

    } catch (error) {
        console.error('❌ 删除预算错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
};

module.exports = {
    setBudget,
    getCurrentBudgetStatus,
    getBudgetByMonth,
    getAllBudgets,
    deleteBudget
};