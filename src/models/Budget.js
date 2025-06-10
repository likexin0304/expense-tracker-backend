/**
 * 预算数据模型
 * 管理用户的月度预算数据
 */

// 内存存储（MVP阶段使用）
let budgets = [];
let currentBudgetId = 1;

class Budget {
    constructor(userId, amount, year, month) {
        this.id = currentBudgetId++;
        this.userId = userId;
        this.amount = parseFloat(amount);
        this.year = year;
        this.month = month; // 1-12
        this.createdAt = new Date().toISOString();
        this.updatedAt = new Date().toISOString();
    }

    /**
     * 创建或更新月度预算
     * @param {Object} budgetData - 预算数据
     * @returns {Budget} 预算对象
     */
    static async createOrUpdate(budgetData) {
        const { userId, amount, year, month } = budgetData;
        
        // 查找是否已存在该月预算
        const existingBudget = await Budget.findByUserAndMonth(userId, year, month);
        
        if (existingBudget) {
            // 更新现有预算
            existingBudget.amount = parseFloat(amount);
            existingBudget.updatedAt = new Date().toISOString();
            console.log(`✅ 预算已更新: 用户${userId} ${year}年${month}月 ¥${amount}`);
            return existingBudget;
        } else {
            // 创建新预算
            const budget = new Budget(userId, amount, year, month);
            budgets.push(budget);
            console.log(`✅ 预算已创建: 用户${userId} ${year}年${month}月 ¥${amount}`);
            return budget;
        }
    }

    /**
     * 根据用户和月份查找预算
     * @param {number} userId - 用户ID
     * @param {number} year - 年份
     * @param {number} month - 月份
     * @returns {Budget|null} 预算对象或null
     */
    static async findByUserAndMonth(userId, year, month) {
        return budgets.find(budget => 
            budget.userId === userId && 
            budget.year === year && 
            budget.month === month
        ) || null;
    }

    /**
     * 获取用户当前月份预算
     * @param {number} userId - 用户ID
     * @returns {Budget|null} 当前月份预算或null
     */
    static async getCurrentMonthBudget(userId) {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1; // getMonth() 返回 0-11
        
        return await Budget.findByUserAndMonth(userId, year, month);
    }

    /**
     * 获取用户所有预算
     * @param {number} userId - 用户ID
     * @returns {Array} 预算列表
     */
    static async findByUserId(userId) {
        return budgets.filter(budget => budget.userId === userId);
    }

    /**
     * 删除预算
     * @param {number} budgetId - 预算ID
     * @returns {boolean} 是否删除成功
     */
    static async deleteById(budgetId) {
        const index = budgets.findIndex(budget => budget.id === budgetId);
        if (index !== -1) {
            budgets.splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * 获取所有预算（调试用）
     * @returns {Array} 所有预算列表
     */
    static getAllBudgets() {
        return budgets;
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
            year: this.year,
            month: this.month,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
}

module.exports = Budget;