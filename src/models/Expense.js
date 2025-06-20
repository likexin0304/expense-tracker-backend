/**
 * 支出数据模型 (Supabase版本)
 * 管理用户的支出记录数据
 */

const { supabaseAdmin } = require('../utils/supabase');

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

class Expense {
    constructor(data) {
        this.id = data.id;
        this.userId = data.user_id;
        this.amount = parseFloat(data.amount);
        this.category = data.category;
        this.description = data.description;
        this.date = data.date ? new Date(data.date) : new Date();
        this.location = data.location || null;
        this.paymentMethod = data.payment_method || 'cash';
        this.isRecurring = data.is_recurring || false;
        this.tags = data.tags || [];
        this.notes = data.notes || '';
        this.createdAt = data.created_at ? new Date(data.created_at) : new Date();
        this.updatedAt = data.updated_at ? new Date(data.updated_at) : new Date();
    }

    /**
     * 创建带有用户认证上下文的Supabase客户端
     * @param {string} userId - 用户ID
     * @returns {Object} 配置了auth上下文的Supabase客户端
     */
    static getAuthenticatedClient(userId) {
        // 创建一个新的客户端实例，设置auth上下文
        const { createClient } = require('@supabase/supabase-js');
        const client = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        );
        
        // 设置auth上下文
        client.auth.admin.setSession({
            access_token: 'dummy',
            refresh_token: 'dummy',
            user: { id: userId }
        });
        
        return client;
    }

    /**
     * 验证支出数据
     */
    static validateData(data) {
        if (!data.userId) {
            throw new Error('用户ID不能为空');
        }
        
        if (!data.amount || parseFloat(data.amount) <= 0) {
            throw new Error('支出金额必须大于0');
        }
        
        if (!data.category || !CATEGORIES.includes(data.category)) {
            throw new Error(`支出分类必须是有效值: ${CATEGORIES.join(', ')}`);
        }
        
        if (!data.description || data.description.trim().length === 0) {
            throw new Error('支出描述不能为空');
        }
        
        if (data.description.length > 200) {
            throw new Error('支出描述不能超过200个字符');
        }
        
        if (data.location && data.location.length > 100) {
            throw new Error('支出地点不能超过100个字符');
        }
        
        if (data.paymentMethod && !PAYMENT_METHODS.includes(data.paymentMethod)) {
            throw new Error(`支付方式必须是有效值: ${PAYMENT_METHODS.join(', ')}`);
        }
        
        if (data.tags && data.tags.length > 10) {
            throw new Error('标签数量不能超过10个');
        }
        
        if (data.notes && data.notes.length > 500) {
            throw new Error('备注不能超过500个字符');
        }
    }

    /**
     * 创建新支出记录
     * @param {Object} expenseData - 支出数据
     * @returns {Expense} 支出对象
     */
    static async create(expenseData) {
        try {
            // 验证数据
            Expense.validateData(expenseData);
            
            // 使用service role key绕过RLS，但仍然检查用户权限
            const { data, error } = await supabaseAdmin
                .from('expenses')
                .insert({
                    user_id: expenseData.userId,
                    amount: parseFloat(expenseData.amount),
                    category: expenseData.category,
                    description: expenseData.description,
                    date: expenseData.date || new Date().toISOString(),
                    location: expenseData.location || null,
                    payment_method: expenseData.paymentMethod || 'cash',
                    is_recurring: expenseData.isRecurring || false,
                    tags: expenseData.tags || [],
                    notes: expenseData.notes || ''
                })
                .select()
                .single();
            
            if (error) {
                console.error('❌ 创建支出记录失败:', error);
                throw new Error(`创建支出记录失败: ${error.message}`);
            }
            
            console.log(`✅ 支出记录已创建: 用户${expenseData.userId} ¥${expenseData.amount} ${expenseData.description}`);
            return new Expense(data);
        } catch (error) {
            console.error('❌ 创建支出记录失败:', error);
            throw error;
        }
    }

    /**
     * 根据ID查找支出记录
     * @param {string} expenseId - 支出ID
     * @returns {Expense|null} 支出对象或null
     */
    static async findById(expenseId) {
        try {
            const { data, error } = await supabaseAdmin
                .from('expenses')
                .select('*')
                .eq('id', expenseId)
                .single();
            
            if (error) {
                if (error.code === 'PGRST116') {
                    return null;
                }
                console.error('❌ 查找支出记录失败:', error);
                throw new Error(`查找支出记录失败: ${error.message}`);
            }
            
            return data ? new Expense(data) : null;
        } catch (error) {
            console.error('❌ 查找支出记录失败:', error);
            throw error;
        }
    }

    /**
     * 根据用户ID获取支出记录
     * @param {string} userId - 用户ID
     * @param {Object} options - 查询选项
     * @returns {Array} 支出记录列表
     */
    static async findByUserId(userId, options = {}) {
        try {
            let query = supabaseAdmin
                .from('expenses')
                .select('*')
                .eq('user_id', userId);
            
            // 日期过滤
            if (options.startDate) {
                query = query.gte('date', options.startDate);
            }
            
            if (options.endDate) {
                query = query.lte('date', options.endDate);
            }
            
            // 分类过滤
            if (options.category) {
                query = query.eq('category', options.category);
            }
            
            // 排序
            if (options.sort === 'date_desc') {
                query = query.order('date', { ascending: false });
            } else if (options.sort === 'amount_desc') {
                query = query.order('amount', { ascending: false });
            } else {
                query = query.order('created_at', { ascending: false });
            }
            
            // 分页
            if (options.limit) {
                const offset = options.offset || 0;
                query = query.range(offset, offset + options.limit - 1);
            }
            
            const { data, error } = await query;
            
            if (error) {
                console.error('❌ 获取用户支出记录失败:', error);
                throw new Error(`获取支出记录失败: ${error.message}`);
            }
            
            console.log(`✅ 查询到 ${data.length} 条支出记录`);
            return data.map(expense => new Expense(expense));
        } catch (error) {
            console.error('❌ 获取用户支出记录失败:', error);
            throw error;
        }
    }

    /**
     * 更新支出记录
     * @param {string} expenseId - 支出ID
     * @param {Object} updateData - 更新数据
     * @returns {Expense|null} 更新后的支出对象
     */
    static async updateById(expenseId, updateData) {
        try {
            // 验证更新数据
            if (updateData.amount !== undefined || updateData.category !== undefined || 
                updateData.description !== undefined) {
                // 获取原始数据并合并更新数据进行验证
                const original = await Expense.findById(expenseId);
                if (!original) {
                    return null;
                }
                
                const mergedData = {
                    userId: original.userId,
                    amount: updateData.amount !== undefined ? updateData.amount : original.amount,
                    category: updateData.category !== undefined ? updateData.category : original.category,
                    description: updateData.description !== undefined ? updateData.description : original.description,
                    paymentMethod: updateData.paymentMethod !== undefined ? updateData.paymentMethod : original.paymentMethod,
                    tags: updateData.tags !== undefined ? updateData.tags : original.tags,
                    notes: updateData.notes !== undefined ? updateData.notes : original.notes,
                    location: updateData.location !== undefined ? updateData.location : original.location
                };
                
                Expense.validateData(mergedData);
            }
            
            // 构建更新对象
            const updateObj = {
                updated_at: new Date().toISOString()
            };
            
            if (updateData.amount !== undefined) updateObj.amount = parseFloat(updateData.amount);
            if (updateData.category !== undefined) updateObj.category = updateData.category;
            if (updateData.description !== undefined) updateObj.description = updateData.description;
            if (updateData.date !== undefined) updateObj.date = updateData.date;
            if (updateData.location !== undefined) updateObj.location = updateData.location;
            if (updateData.paymentMethod !== undefined) updateObj.payment_method = updateData.paymentMethod;
            if (updateData.isRecurring !== undefined) updateObj.is_recurring = updateData.isRecurring;
            if (updateData.tags !== undefined) updateObj.tags = updateData.tags;
            if (updateData.notes !== undefined) updateObj.notes = updateData.notes;
            
            const { data, error } = await supabaseAdmin
                .from('expenses')
                .update(updateObj)
                .eq('id', expenseId)
                .select()
                .single();
            
            if (error) {
                console.error('❌ 更新支出记录失败:', error);
                throw new Error(`更新支出记录失败: ${error.message}`);
            }
            
            console.log(`✅ 支出记录已更新: ID${expenseId}`);
            return data ? new Expense(data) : null;
        } catch (error) {
            console.error('❌ 更新支出记录失败:', error);
            throw error;
        }
    }

    /**
     * 删除支出记录
     * @param {string} expenseId - 支出ID
     * @returns {boolean} 是否删除成功
     */
    static async deleteById(expenseId) {
        try {
            const { error } = await supabaseAdmin
                .from('expenses')
                .delete()
                .eq('id', expenseId);
            
            if (error) {
                console.error('❌ 删除支出记录失败:', error);
                throw new Error(`删除支出记录失败: ${error.message}`);
            }
            
            console.log(`✅ 支出记录已删除: ID${expenseId}`);
            return true;
        } catch (error) {
            console.error('❌ 删除支出记录失败:', error);
            return false;
        }
    }

    /**
     * 按分类统计支出
     * @param {string} userId - 用户ID
     * @param {string} startDate - 开始日期
     * @param {string} endDate - 结束日期
     * @returns {Array} 分类统计结果
     */
    static async getStatsByCategory(userId, startDate, endDate) {
        try {
            let query = supabaseAdmin
                .from('expenses')
                .select('category, amount')
                .eq('user_id', userId);
            
            if (startDate) {
                query = query.gte('date', startDate);
            }
            
            if (endDate) {
                query = query.lte('date', endDate);
            }
            
            const { data, error } = await query;
            
            if (error) {
                console.error('❌ 获取分类统计失败:', error);
                throw new Error(`获取分类统计失败: ${error.message}`);
            }
            
            // 按分类分组统计
            const stats = {};
            if (data) {
                data.forEach(expense => {
                    if (!stats[expense.category]) {
                        stats[expense.category] = {
                            category: expense.category,
                            total: 0,
                            count: 0
                        };
                    }
                    stats[expense.category].total += expense.amount;
                    stats[expense.category].count += 1;
                });
            }
            
            return Object.values(stats);
        } catch (error) {
            console.error('❌ 获取分类统计失败:', error);
            throw error;
        }
    }

    /**
     * 获取用户总支出
     * @param {string} userId - 用户ID
     * @param {string} startDate - 开始日期
     * @param {string} endDate - 结束日期
     * @returns {number} 总支出金额
     */
    static async getTotalByUser(userId, startDate, endDate) {
        try {
            let query = supabaseAdmin
                .from('expenses')
                .select('amount')
                .eq('user_id', userId);
            
            if (startDate) {
                query = query.gte('date', startDate);
            }
            
            if (endDate) {
                query = query.lte('date', endDate);
            }
            
            const { data, error } = await query;
            
            if (error) {
                console.error('❌ 获取用户总支出失败:', error);
                throw new Error(`获取用户总支出失败: ${error.message}`);
            }
            
            return data ? data.reduce((total, expense) => total + expense.amount, 0) : 0;
        } catch (error) {
            console.error('❌ 获取用户总支出失败:', error);
            throw error;
        }
    }

    /**
     * 获取当前月份总支出
     * @param {string} userId - 用户ID
     * @returns {number} 当前月份总支出
     */
    static async getCurrentMonthTotal(userId) {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
        
        return await Expense.getTotalByUser(userId, startOfMonth, endOfMonth);
    }

    /**
     * 获取指定月份总支出
     * @param {string} userId - 用户ID
     * @param {number} year - 年份
     * @param {number} month - 月份
     * @returns {number} 指定月份总支出
     */
    static async getMonthlyTotal(userId, year, month) {
        const startOfMonth = new Date(year, month - 1, 1).toISOString();
        const endOfMonth = new Date(year, month, 0).toISOString();
        
        return await Expense.getTotalByUser(userId, startOfMonth, endOfMonth);
    }

    /**
     * 检查支出是否属于指定用户
     * @param {string} userId - 用户ID
     * @returns {boolean} 是否属于该用户
     */
    belongsToUser(userId) {
        return this.userId === userId;
    }

    /**
     * 格式化金额显示
     * @returns {string} 格式化后的金额
     */
    get formattedAmount() {
        return `¥${this.amount.toFixed(2)}`;
    }

    /**
     * 格式化日期显示
     * @returns {string} 格式化后的日期
     */
    get formattedDate() {
        return this.date.toLocaleDateString('zh-CN');
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

// 导出类和枚举
module.exports = {
    Expense,
    CATEGORIES,
    PAYMENT_METHODS
};