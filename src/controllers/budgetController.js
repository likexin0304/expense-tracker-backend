/**
 * 预算控制器
 * 处理所有预算相关的业务逻辑
 */

const Budget = require('../models/Budget');
const { Expense } = require('../models/Expense');

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
        
        const success = await Budget.deleteById(budgetId);
        
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

/**
 * 获取预算提醒和预警信息
 */
const getBudgetAlerts = async (req, res) => {
    try {
        console.log('🚨 获取预算提醒请求:', { userId: req.userId });
        
        const userId = req.userId;
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;

        // 获取当前月份预算
        const budget = await Budget.getCurrentMonthBudget(userId);
        
        if (!budget) {
            return res.json({
                success: true,
                data: {
                    alerts: [],
                    message: '您还没有设置本月预算'
                }
            });
        }

        // 获取当前月份支出总额
        const totalExpenses = await Expense.getCurrentMonthTotal(userId);
        const usagePercentage = (totalExpenses / budget.amount) * 100;

        const alerts = [];

        // 预算使用率提醒
        if (usagePercentage >= 100) {
            alerts.push({
                type: 'danger',
                level: 'high',
                title: '预算超支警告',
                message: `本月支出已超出预算 ¥${(totalExpenses - budget.amount).toFixed(2)}`,
                percentage: usagePercentage,
                icon: '🚨'
            });
        } else if (usagePercentage >= 90) {
            alerts.push({
                type: 'warning',
                level: 'high',
                title: '预算即将用完',
                message: `本月预算已使用 ${usagePercentage.toFixed(1)}%，剩余 ¥${(budget.amount - totalExpenses).toFixed(2)}`,
                percentage: usagePercentage,
                icon: '⚠️'
            });
        } else if (usagePercentage >= 75) {
            alerts.push({
                type: 'warning',
                level: 'medium',
                title: '预算使用提醒',
                message: `本月预算已使用 ${usagePercentage.toFixed(1)}%，请注意控制支出`,
                percentage: usagePercentage,
                icon: '💡'
            });
        } else if (usagePercentage >= 50) {
            alerts.push({
                type: 'info',
                level: 'low',
                title: '预算使用正常',
                message: `本月预算已使用 ${usagePercentage.toFixed(1)}%，支出控制良好`,
                percentage: usagePercentage,
                icon: '✅'
            });
        }

        // 月末提醒
        const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
        const currentDay = now.getDate();
        const remainingDays = daysInMonth - currentDay;

        if (remainingDays <= 7 && usagePercentage < 80) {
            alerts.push({
                type: 'info',
                level: 'low',
                title: '月末预算提醒',
                message: `本月还剩 ${remainingDays} 天，预算剩余 ¥${(budget.amount - totalExpenses).toFixed(2)}`,
                percentage: usagePercentage,
                icon: '📅'
            });
        }

        // 获取最近7天的支出趋势
        const recentExpenses = await Expense.findByUserId(userId, {
            startDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
            endDate: now
        });

        const dailyAverage = recentExpenses.reduce((sum, exp) => sum + exp.amount, 0) / 7;
        const projectedMonthlySpend = dailyAverage * daysInMonth;

        if (projectedMonthlySpend > budget.amount * 1.1) {
            alerts.push({
                type: 'warning',
                level: 'medium',
                title: '支出趋势预警',
                message: `按最近7天的支出趋势，本月预计支出 ¥${projectedMonthlySpend.toFixed(2)}，可能超出预算`,
                percentage: (projectedMonthlySpend / budget.amount) * 100,
                icon: '📈'
            });
        }

        console.log(`✅ 预算提醒获取成功，共 ${alerts.length} 条提醒`);

        res.json({
            success: true,
            data: {
                alerts,
                summary: {
                    budgetAmount: budget.amount,
                    totalExpenses,
                    usagePercentage: Math.round(usagePercentage * 100) / 100,
                    remainingDays,
                    dailyAverage: Math.round(dailyAverage * 100) / 100,
                    projectedMonthlySpend: Math.round(projectedMonthlySpend * 100) / 100
                }
            }
        });

    } catch (error) {
        console.error('❌ 获取预算提醒错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
};

/**
 * 获取预算建议
 */
const getBudgetSuggestions = async (req, res) => {
    try {
        console.log('💡 获取预算建议请求:', { userId: req.userId });
        
        const userId = req.userId;
        
        // 获取用户历史预算和支出数据
        const allBudgets = await Budget.findByUserId(userId);
        const allExpenses = await Expense.findByUserId(userId);

        if (allExpenses.length === 0) {
            return res.json({
                success: true,
                data: {
                    suggestions: [{
                        type: 'info',
                        title: '开始记录支出',
                        message: '建议先记录一些支出数据，这样我们就能为您提供个性化的预算建议',
                        icon: '📝'
                    }]
                }
            });
        }

        const suggestions = [];

        // 计算历史平均支出
        const monthlyExpenses = {};
        allExpenses.forEach(expense => {
            const key = `${expense.date.getFullYear()}-${expense.date.getMonth() + 1}`;
            if (!monthlyExpenses[key]) {
                monthlyExpenses[key] = 0;
            }
            monthlyExpenses[key] += expense.amount;
        });

        const monthlyAmounts = Object.values(monthlyExpenses);
        const averageMonthlySpend = monthlyAmounts.reduce((sum, amount) => sum + amount, 0) / monthlyAmounts.length;

        // 预算建议
        const suggestedBudget = Math.ceil(averageMonthlySpend * 1.1); // 比平均支出高10%

        suggestions.push({
            type: 'suggestion',
            title: '预算建议',
            message: `根据您的历史支出数据，建议设置月预算为 ¥${suggestedBudget}`,
            icon: '💰',
            data: {
                suggestedAmount: suggestedBudget,
                averageSpend: Math.round(averageMonthlySpend),
                basis: '基于历史平均支出 + 10% 缓冲'
            }
        });

        // 分析支出分类
        const categoryTotals = {};
        allExpenses.forEach(expense => {
            if (!categoryTotals[expense.category]) {
                categoryTotals[expense.category] = 0;
            }
            categoryTotals[expense.category] += expense.amount;
        });

        const topCategory = Object.entries(categoryTotals)
            .sort(([,a], [,b]) => b - a)[0];

        if (topCategory) {
            const [category, amount] = topCategory;
            const percentage = (amount / allExpenses.reduce((sum, exp) => sum + exp.amount, 0)) * 100;
            
            suggestions.push({
                type: 'insight',
                title: '支出分析',
                message: `您在"${category}"类别的支出最多，占总支出的 ${percentage.toFixed(1)}%`,
                icon: '📊',
                data: {
                    category,
                    amount: Math.round(amount),
                    percentage: Math.round(percentage * 10) / 10
                }
            });
        }

        // 节省建议
        if (averageMonthlySpend > 3000) {
            suggestions.push({
                type: 'tip',
                title: '节省小贴士',
                message: '尝试设置每日支出限额，可以有效控制月度支出',
                icon: '💡',
                data: {
                    dailyLimit: Math.round(averageMonthlySpend / 30)
                }
            });
        }

        console.log(`✅ 预算建议获取成功，共 ${suggestions.length} 条建议`);

        res.json({
            success: true,
            data: {
                suggestions,
                statistics: {
                    totalMonths: monthlyAmounts.length,
                    averageMonthlySpend: Math.round(averageMonthlySpend),
                    suggestedBudget,
                    topCategory: topCategory ? topCategory[0] : null
                }
            }
        });

    } catch (error) {
        console.error('❌ 获取预算建议错误:', error);
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
    deleteBudget,
    getBudgetAlerts,
    getBudgetSuggestions
};