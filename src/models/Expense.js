/**
 * 支出数据模型
 * 管理用户的支出记录数据（内存存储版本）
 */

// 支出分类枚举
const CATEGORIES = [
  'food',        // 餐饮
  'transport',   // 交通
  'entertainment', // 娱乐
  'shopping',    // 购物
  'bills',       // 账单
  'healthcare',  // 医疗
  'education',   // 教育
  'travel',      // 旅行
  'other'        // 其他
];

// 支付方式枚举
const PAYMENT_METHODS = [
  'cash',    // 现金
  'card',    // 银行卡
  'online',  // 在线支付
  'other'    // 其他
];

// 内存存储
let expenses = [];
let currentExpenseId = 1;

class Expense {
    constructor(data) {
        this.id = currentExpenseId++;
        this.userId = data.userId;
        this.amount = parseFloat(data.amount);
        this.category = data.category;
        this.description = data.description;
        this.date = data.date ? new Date(data.date) : new Date();
        this.location = data.location || null;
        this.paymentMethod = data.paymentMethod || 'cash';
        this.isRecurring = data.isRecurring || false;
        this.tags = data.tags || [];
        this.notes = data.notes || '';
        this.createdAt = new Date();
        this.updatedAt = new Date();

        // 验证数据
        this.validate();
    }

    /**
     * 验证支出数据
     */
    validate() {
        if (!this.userId) {
            throw new Error('用户ID不能为空');
        }
        
        if (!this.amount || this.amount <= 0) {
            throw new Error('支出金额必须大于0');
        }
        
        if (!this.category || !CATEGORIES.includes(this.category)) {
            throw new Error(`支出分类必须是有效值: ${CATEGORIES.join(', ')}`);
        }
        
        if (!this.description || this.description.trim().length === 0) {
            throw new Error('支出描述不能为空');
        }
        
        if (this.description.length > 200) {
            throw new Error('支出描述不能超过200个字符');
        }
        
        if (this.location && this.location.length > 100) {
            throw new Error('支出地点不能超过100个字符');
        }
        
        if (this.paymentMethod && !PAYMENT_METHODS.includes(this.paymentMethod)) {
            throw new Error(`支付方式必须是有效值: ${PAYMENT_METHODS.join(', ')}`);
        }
        
        if (this.tags && this.tags.length > 10) {
            throw new Error('标签数量不能超过10个');
        }
        
        if (this.notes && this.notes.length > 500) {
            throw new Error('备注不能超过500个字符');
        }
    }

    /**
     * 创建新支出记录
     * @param {Object} expenseData - 支出数据
     * @returns {Expense} 支出对象
     */
    static async create(expenseData) {
        const expense = new Expense(expenseData);
        expenses.push(expense);
        console.log(`✅ 支出记录已创建: 用户${expense.userId} ¥${expense.amount} ${expense.description}`);
        return expense;
    }

    /**
     * 根据ID查找支出记录
     * @param {number} expenseId - 支出ID
     * @returns {Expense|null} 支出对象或null
     */
    static async findById(expenseId) {
        return expenses.find(expense => expense.id === expenseId) || null;
    }

    /**
     * 根据用户ID获取支出记录
     * @param {number} userId - 用户ID
     * @param {Object} options - 查询选项
     * @returns {Array} 支出记录列表
     */
    static async findByUserId(userId, options = {}) {
        let userExpenses = expenses.filter(expense => expense.userId === userId);
        
        // 日期过滤
        if (options.startDate) {
            const startDate = new Date(options.startDate);
            userExpenses = userExpenses.filter(expense => expense.date >= startDate);
        }
        
        if (options.endDate) {
            const endDate = new Date(options.endDate);
            userExpenses = userExpenses.filter(expense => expense.date <= endDate);
        }
        
        // 分类过滤
        if (options.category) {
            userExpenses = userExpenses.filter(expense => expense.category === options.category);
        }
        
        // 排序
        if (options.sort === 'date_desc') {
            userExpenses.sort((a, b) => b.date - a.date);
        } else if (options.sort === 'amount_desc') {
            userExpenses.sort((a, b) => b.amount - a.amount);
        } else {
            userExpenses.sort((a, b) => b.createdAt - a.createdAt);
        }
        
        // 分页
        if (options.limit) {
            const offset = options.offset || 0;
            userExpenses = userExpenses.slice(offset, offset + options.limit);
        }
        
        return userExpenses;
    }

    /**
     * 更新支出记录
     * @param {number} expenseId - 支出ID
     * @param {Object} updateData - 更新数据
     * @returns {Expense|null} 更新后的支出对象
     */
    static async updateById(expenseId, updateData) {
        const expenseIndex = expenses.findIndex(expense => expense.id === expenseId);
        
        if (expenseIndex === -1) {
            return null;
        }
        
        const expense = expenses[expenseIndex];
        
        // 更新字段
        if (updateData.amount !== undefined) expense.amount = parseFloat(updateData.amount);
        if (updateData.category !== undefined) expense.category = updateData.category;
        if (updateData.description !== undefined) expense.description = updateData.description;
        if (updateData.date !== undefined) expense.date = new Date(updateData.date);
        if (updateData.location !== undefined) expense.location = updateData.location;
        if (updateData.paymentMethod !== undefined) expense.paymentMethod = updateData.paymentMethod;
        if (updateData.isRecurring !== undefined) expense.isRecurring = updateData.isRecurring;
        if (updateData.tags !== undefined) expense.tags = updateData.tags;
        if (updateData.notes !== undefined) expense.notes = updateData.notes;
        
        expense.updatedAt = new Date();
        
        // 重新验证
        expense.validate();
        
        console.log(`✅ 支出记录已更新: ID${expenseId}`);
        return expense;
    }

    /**
     * 删除支出记录
     * @param {number} expenseId - 支出ID
     * @returns {boolean} 是否删除成功
     */
    static async deleteById(expenseId) {
        const expenseIndex = expenses.findIndex(expense => expense.id === expenseId);
        
        if (expenseIndex !== -1) {
            expenses.splice(expenseIndex, 1);
            console.log(`✅ 支出记录已删除: ID${expenseId}`);
            return true;
        }
        
        return false;
    }

    /**
     * 按分类获取统计
     * @param {number} userId - 用户ID
     * @param {Date} startDate - 开始日期
     * @param {Date} endDate - 结束日期
     * @returns {Array} 分类统计
     */
    static async getStatsByCategory(userId, startDate, endDate) {
        let userExpenses = expenses.filter(expense => expense.userId === userId);
        
        // 日期过滤
        if (startDate) {
            userExpenses = userExpenses.filter(expense => expense.date >= startDate);
        }
        if (endDate) {
            userExpenses = userExpenses.filter(expense => expense.date <= endDate);
        }
        
        // 按分类统计
        const stats = {};
        userExpenses.forEach(expense => {
            if (!stats[expense.category]) {
                stats[expense.category] = {
                    _id: expense.category,
                    total: 0,
                    count: 0,
                    amounts: []
                };
            }
            stats[expense.category].total += expense.amount;
            stats[expense.category].count += 1;
            stats[expense.category].amounts.push(expense.amount);
        });
        
        // 计算平均值并排序
        const result = Object.values(stats).map(stat => ({
            _id: stat._id,
            total: parseFloat(stat.total.toFixed(2)),
            count: stat.count,
            avgAmount: parseFloat((stat.total / stat.count).toFixed(2))
        }));
        
        return result.sort((a, b) => b.total - a.total);
    }

    /**
     * 获取用户总支出统计
     * @param {number} userId - 用户ID
     * @param {Date} startDate - 开始日期
     * @param {Date} endDate - 结束日期
     * @returns {Object} 总支出统计
     */
    static async getTotalByUser(userId, startDate, endDate) {
        let userExpenses = expenses.filter(expense => expense.userId === userId);
        
        // 日期过滤
        if (startDate) {
            userExpenses = userExpenses.filter(expense => expense.date >= startDate);
        }
        if (endDate) {
            userExpenses = userExpenses.filter(expense => expense.date <= endDate);
        }
        
        if (userExpenses.length === 0) {
            return [{
                _id: null,
                totalAmount: 0,
                totalCount: 0,
                avgAmount: 0,
                maxAmount: 0,
                minAmount: 0
            }];
        }
        
        const amounts = userExpenses.map(expense => expense.amount);
        const totalAmount = amounts.reduce((sum, amount) => sum + amount, 0);
        
        return [{
            _id: null,
            totalAmount: parseFloat(totalAmount.toFixed(2)),
            totalCount: userExpenses.length,
            avgAmount: parseFloat((totalAmount / userExpenses.length).toFixed(2)),
            maxAmount: Math.max(...amounts),
            minAmount: Math.min(...amounts)
        }];
    }

    /**
     * 检查是否属于当前用户
     * @param {number} userId - 用户ID
     * @returns {boolean} 是否属于当前用户
     */
    belongsToUser(userId) {
        return this.userId === userId;
    }

    /**
     * 获取格式化金额
     * @returns {string} 格式化金额
     */
    get formattedAmount() {
        return `¥${this.amount.toFixed(2)}`;
    }

    /**
     * 获取格式化日期
     * @returns {string} 格式化日期
     */
    get formattedDate() {
        return this.date.toLocaleDateString('zh-CN');
    }

    /**
     * 获取当前月份总支出
     * @param {number} userId - 用户ID
     * @returns {number} 当前月份总支出
     */
    static async getCurrentMonthTotal(userId) {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        return await Expense.getMonthlyTotal(userId, year, month);
    }

    /**
     * 获取指定月份总支出
     * @param {number} userId - 用户ID
     * @param {number} year - 年份
     * @param {number} month - 月份 (1-12)
     * @returns {number} 指定月份总支出
     */
    static async getMonthlyTotal(userId, year, month) {
        const userExpenses = expenses.filter(expense => {
            if (expense.userId !== userId) return false;
            
            const expenseDate = new Date(expense.date);
            return expenseDate.getFullYear() === year && 
                   (expenseDate.getMonth() + 1) === month;
        });
        
        const total = userExpenses.reduce((sum, expense) => sum + expense.amount, 0);
        return parseFloat(total.toFixed(2));
    }

    /**
     * 获取所有支出（调试用）
     * @returns {Array} 所有支出列表
     */
    static getAllExpenses() {
        return expenses;
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
            date: this.date.toISOString(),
            location: this.location,
            paymentMethod: this.paymentMethod,
            isRecurring: this.isRecurring,
            tags: this.tags,
            notes: this.notes,
            createdAt: this.createdAt.toISOString(),
            updatedAt: this.updatedAt.toISOString(),
            formattedAmount: this.formattedAmount,
            formattedDate: this.formattedDate
        };
    }
}

// 导出类和常量
module.exports = Expense;
module.exports.CATEGORIES = CATEGORIES;
module.exports.PAYMENT_METHODS = PAYMENT_METHODS;