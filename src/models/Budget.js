/**
 * 预算数据模型 (Supabase版本)
 * 管理用户的月度预算数据
 */

const { supabaseAdmin } = require('../utils/supabase');

class Budget {
    constructor(data) {
        this.id = data.id;
        this.userId = data.user_id;
        this.amount = parseFloat(data.amount);
        this.year = data.year;
        this.month = data.month; // 1-12
        this.createdAt = data.created_at;
        this.updatedAt = data.updated_at;
    }

    /**
     * 创建或更新月度预算
     * @param {Object} budgetData - 预算数据
     * @returns {Budget} 预算对象
     */
    static async createOrUpdate(budgetData) {
        const { userId, amount, year, month } = budgetData;
        
        try {
            // 查找是否已存在该月预算
            const existingBudget = await Budget.findByUserAndMonth(userId, year, month);
            
            if (existingBudget) {
                // 更新现有预算
                const { data, error } = await supabaseAdmin
                    .from('budgets')
                    .update({ 
                        amount: parseFloat(amount),
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existingBudget.id)
                    .select()
                    .single();
                
                if (error) {
                    console.error('❌ 更新预算失败:', error);
                    throw new Error(`更新预算失败: ${error.message}`);
                }
                
                console.log(`✅ 预算已更新: 用户${userId} ${year}年${month}月 ¥${amount}`);
                return new Budget(data);
            } else {
                // 创建新预算
                const { data, error } = await supabaseAdmin
                    .from('budgets')
                    .insert({
                        user_id: userId,
                        amount: parseFloat(amount),
                        year: year,
                        month: month
                    })
                    .select()
                    .single();
                
                if (error) {
                    console.error('❌ 创建预算失败:', error);
                    throw new Error(`创建预算失败: ${error.message}`);
                }
                
                console.log(`✅ 预算已创建: 用户${userId} ${year}年${month}月 ¥${amount}`);
                return new Budget(data);
            }
        } catch (error) {
            console.error('❌ 预算操作失败:', error);
            throw error;
        }
    }

    /**
     * 根据用户和月份查找预算
     * @param {string} userId - 用户ID
     * @param {number} year - 年份
     * @param {number} month - 月份
     * @returns {Budget|null} 预算对象或null
     */
    static async findByUserAndMonth(userId, year, month) {
        try {
            const { data, error } = await supabaseAdmin
                .from('budgets')
                .select('*')
                .eq('user_id', userId)
                .eq('year', year)
                .eq('month', month)
                .single();
            
            if (error) {
                if (error.code === 'PGRST116') {
                    // 没有找到记录，返回null
                    return null;
                }
                console.error('❌ 查找预算失败:', error);
                throw new Error(`查找预算失败: ${error.message}`);
            }
            
            return data ? new Budget(data) : null;
        } catch (error) {
            if (error.message.includes('没有找到')) {
                return null;
            }
            console.error('❌ 查找预算失败:', error);
            throw error;
        }
    }

    /**
     * 获取用户当前月份预算
     * @param {string} userId - 用户ID
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
     * @param {string} userId - 用户ID
     * @returns {Array} 预算列表
     */
    static async findByUserId(userId) {
        try {
            const { data, error } = await supabaseAdmin
                .from('budgets')
                .select('*')
                .eq('user_id', userId)
                .order('year', { ascending: false })
                .order('month', { ascending: false });
            
            if (error) {
                console.error('❌ 获取用户预算失败:', error);
                throw new Error(`获取用户预算失败: ${error.message}`);
            }
            
            return data ? data.map(budgetData => new Budget(budgetData)) : [];
        } catch (error) {
            console.error('❌ 获取用户预算失败:', error);
            throw error;
        }
    }

    /**
     * 根据ID获取预算
     * @param {string} budgetId - 预算ID
     * @returns {Budget|null} 预算对象或null
     */
    static async findById(budgetId) {
        try {
            const { data, error } = await supabaseAdmin
                .from('budgets')
                .select('*')
                .eq('id', budgetId)
                .single();
            
            if (error) {
                if (error.code === 'PGRST116') {
                    return null;
                }
                console.error('❌ 获取预算失败:', error);
                throw new Error(`获取预算失败: ${error.message}`);
            }
            
            return data ? new Budget(data) : null;
        } catch (error) {
            console.error('❌ 获取预算失败:', error);
            throw error;
        }
    }

    /**
     * 删除预算
     * @param {string} budgetId - 预算ID
     * @returns {boolean} 是否删除成功
     */
    static async deleteById(budgetId) {
        try {
            const { error } = await supabaseAdmin
                .from('budgets')
                .delete()
                .eq('id', budgetId);
            
            if (error) {
                console.error('❌ 删除预算失败:', error);
                throw new Error(`删除预算失败: ${error.message}`);
            }
            
            console.log(`✅ 预算已删除: ID${budgetId}`);
            return true;
        } catch (error) {
            console.error('❌ 删除预算失败:', error);
            return false;
        }
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