/**
 * 支出数据模型
 * 管理用户的支出记录
 */

// 内存存储（MVP阶段使用）
let expenses = [];
let currentExpenseId = 1;

class Expense {
    constructor(userId, amount, category, description = '') {
        this.id = currentExpenseId++;
        this.userId = userId;
        this.amount = parseFloat(amount);
        this.category = category;
        this.description = description;
        this.createdAt = new Date().toISOString();
        this.updatedAt = new Date().toISOString();
    }

    /**
     * 创建新支出记录
     * @param {Object} expenseData - 支出数据
     * @returns {Expense} 支出对象
     */
    static async create(expenseData) {
        const expense = new Expense(
            expenseData.userId,
            expenseData.amount,
            expenseData.category,
            expenseData.description || ''
        );
        
        expenses.push(expense);
        console.log(`✅ 支出记录已创建: 用户${expense.userId} ¥${expense.amount} ${expense.category}`);
        return expense;
    }

    /**
     * 根据用户ID查找支出
     * @param {number} userId - 用户ID
     * @returns {Array} 支出列表
     */
    static async findByUserId(userId) {
        return expenses.filter(expense => expense.userId === userId);
    }

    /**
     * 获取用户指定月份的支出总额
     * @param {number} userId - 用户ID
     * @param {number} year - 年份
     * @param {number} month - 月份
     * @returns {number} 支出总额
     */
    static async getMonthlyTotal(userId, year, month) {
        const userExpenses = await Expense.findByUserId(userId);
        
        const monthlyExpenses = userExpenses.filter(expense => {
            const expenseDate = new Date(expense.createdAt);
            return expenseDate.getFullYear() === year && 
                   expenseDate.getMonth() + 1 === month;
        });

        const total = monthlyExpenses.reduce((sum, expense) => sum + expense.amount, 0);
        console.log(`📊 用户${userId} ${year}年${month}月支出统计: ¥${total}`);
        return total;
    }

    /**
     * 获取用户当前月份支出总额
     * @param {number} userId - 用户ID
     * @returns {number} 当前月份支出总额
     */
    static async getCurrentMonthTotal(userId) {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        
        return await Expense.getMonthlyTotal(userId, year, month);
    }

    /**
     * 根据ID查找支出
     * @param {number} expenseId - 支出ID
     * @returns {Expense|null} 支出对象或null
     */
    static async findById(expenseId) {
        return expenses.find(expense => expense.id === expenseId) || null;
    }

    /**
     * 更新支出记录
     * @param {number} expenseId - 支出ID
     * @param {Object} updateData - 更新数据
     * @returns {Expense|null} 更新后的支出对象
     */
    static async updateById(expenseId, updateData) {
        const expense = await Expense.findById(expenseId);
        if (expense) {
            Object.assign(expense, updateData);
            expense.updatedAt = new Date().toISOString();
            console.log(`✅ 支出记录已更新: ID${expenseId}`);
            return expense;
        }
        return null;
    }

    /**
     * 删除支出记录
     * @param {number} expenseId - 支出ID
     * @returns {boolean} 是否删除成功
     */
    static async deleteById(expenseId) {
        const index = expenses.findIndex(expense => expense.id === expenseId);
        if (index !== -1) {
            const expense = expenses[index];
            expenses.splice(index, 1);
            console.log(`🗑️ 支出记录已删除: ID${expenseId}`);
            return true;
        }
        return false;
    }

    /**
     * 获取所有支出（调试用）
     * @returns {Array} 所有支出列表
     */
    static getAllExpenses() {
        return expenses;
    }

    /**
     * 获取用户支出统计信息
     * @param {number} userId - 用户ID
     * @param {Date} startDate - 开始日期
     * @param {Date} endDate - 结束日期
     * @returns {Object} 统计信息
     */
    static async getStatistics(userId, startDate, endDate) {
        const userExpenses = await Expense.findByUserId(userId);
        
        const filteredExpenses = userExpenses.filter(expense => {
            const expenseDate = new Date(expense.createdAt);
            return expenseDate >= startDate && expenseDate <= endDate;
        });

        const totalAmount = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
        
        // 按分类统计
        const categoryStats = {};
        filteredExpenses.forEach(expense => {
            if (!categoryStats[expense.category]) {
                categoryStats[expense.category] = {
                    amount: 0,
                    count: 0
                };
            }
            categoryStats[expense.category].amount += expense.amount;
            categoryStats[expense.category].count += 1;
        });

        return {
            totalAmount,
            totalCount: filteredExpenses.length,
            categoryStats,
            expenses: filteredExpenses
        };
    }

    /**
     * 清除所有数据（调试用）
     */
    static clearAll() {
        expenses = [];
        currentExpenseId = 1;
        console.log('🧹 所有支出数据已清除');
    }

    /**
     * 转换为JSON对象
     * @returns {Object} JSON对象
     */
    toJSON() {
        return {
            id: this.id,
            userId: this.userId,
            amount: this.amount,
            category: this.category,
            description: this.description,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
}

module.exports = Expense;