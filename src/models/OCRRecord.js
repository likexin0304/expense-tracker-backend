const { supabaseAdmin } = require('../utils/supabase');

/**
 * OCR记录数据模型
 */
class OCRRecord {
    constructor(data) {
        this.id = data.id;
        this.userId = data.user_id;
        this.originalText = data.original_text;
        this.parsedData = data.parsed_data || {};
        this.confidenceScore = parseFloat(data.confidence_score || 0);
        this.status = data.status || 'processing';
        this.errorMessage = data.error_message;
        this.expenseId = data.expense_id;
        this.createdAt = data.created_at;
        this.updatedAt = data.updated_at;
    }

    /**
     * 创建新的OCR记录
     * @param {string} userId - 用户ID
     * @param {string} originalText - 原始OCR文本
     * @param {Object} options - 选项
     * @returns {OCRRecord} 新创建的OCR记录
     */
    static async create(userId, originalText, options = {}) {
        try {
            if (!userId || !originalText) {
                throw new Error('用户ID和原始文本不能为空');
            }

            const { data, error } = await supabaseAdmin
                .from('ocr_records')
                .insert({
                    user_id: userId,
                    original_text: originalText,
                    parsed_data: options.parsedData || {},
                    confidence_score: options.confidenceScore || 0,
                    status: options.status || 'processing'
                })
                .select()
                .single();

            if (error) {
                console.error('❌ 创建OCR记录失败:', error);
                throw new Error(`创建OCR记录失败: ${error.message}`);
            }

            console.log(`✅ OCR记录已创建: ${data.id}`);
            return new OCRRecord(data);
        } catch (error) {
            console.error('❌ 创建OCR记录失败:', error);
            throw error;
        }
    }

    /**
     * 根据ID查找OCR记录
     * @param {string} recordId - 记录ID
     * @param {string} userId - 用户ID（用于权限验证）
     * @returns {OCRRecord|null} OCR记录对象或null
     */
    static async findById(recordId, userId) {
        try {
            const { data, error } = await supabaseAdmin
                .from('ocr_records')
                .select('*')
                .eq('id', recordId)
                .eq('user_id', userId)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    return null;
                }
                console.error('❌ 查找OCR记录失败:', error);
                throw new Error(`查找OCR记录失败: ${error.message}`);
            }

            return data ? new OCRRecord(data) : null;
        } catch (error) {
            console.error('❌ 查找OCR记录失败:', error);
            throw error;
        }
    }

    /**
     * 获取用户的OCR记录列表
     * @param {string} userId - 用户ID
     * @param {Object} options - 查询选项
     * @returns {Array} OCR记录列表
     */
    static async findByUserId(userId, options = {}) {
        try {
            let query = supabaseAdmin
                .from('ocr_records')
                .select('*')
                .eq('user_id', userId);

            // 按状态筛选
            if (options.status) {
                query = query.eq('status', options.status);
            }

            // 排序
            query = query.order('created_at', { ascending: false });

            // 分页
            if (options.limit) {
                const offset = options.offset || 0;
                query = query.range(offset, offset + options.limit - 1);
            }

            const { data, error } = await query;

            if (error) {
                console.error('❌ 获取OCR记录列表失败:', error);
                throw new Error(`获取OCR记录列表失败: ${error.message}`);
            }

            console.log(`✅ 查询到 ${data.length} 条OCR记录`);
            return data.map(record => new OCRRecord(record));
        } catch (error) {
            console.error('❌ 获取OCR记录列表失败:', error);
            throw error;
        }
    }

    /**
     * 更新OCR记录
     * @param {string} recordId - 记录ID
     * @param {string} userId - 用户ID
     * @param {Object} updateData - 更新数据
     * @returns {OCRRecord|null} 更新后的OCR记录
     */
    static async updateById(recordId, userId, updateData) {
        try {
            const updateObj = {
                updated_at: new Date().toISOString()
            };

            if (updateData.parsedData !== undefined) updateObj.parsed_data = updateData.parsedData;
            if (updateData.confidenceScore !== undefined) updateObj.confidence_score = updateData.confidenceScore;
            if (updateData.status !== undefined) updateObj.status = updateData.status;
            if (updateData.errorMessage !== undefined) updateObj.error_message = updateData.errorMessage;
            if (updateData.expenseId !== undefined) updateObj.expense_id = updateData.expenseId;

            const { data, error } = await supabaseAdmin
                .from('ocr_records')
                .update(updateObj)
                .eq('id', recordId)
                .eq('user_id', userId)
                .select()
                .single();

            if (error) {
                console.error('❌ 更新OCR记录失败:', error);
                throw new Error(`更新OCR记录失败: ${error.message}`);
            }

            if (!data) {
                return null;
            }

            console.log(`✅ OCR记录已更新: ${recordId}`);
            return new OCRRecord(data);
        } catch (error) {
            console.error('❌ 更新OCR记录失败:', error);
            throw error;
        }
    }

    /**
     * 删除OCR记录
     * @param {string} recordId - 记录ID
     * @param {string} userId - 用户ID
     * @returns {boolean} 是否删除成功
     */
    static async deleteById(recordId, userId) {
        try {
            const { error } = await supabaseAdmin
                .from('ocr_records')
                .delete()
                .eq('id', recordId)
                .eq('user_id', userId);

            if (error) {
                console.error('❌ 删除OCR记录失败:', error);
                throw new Error(`删除OCR记录失败: ${error.message}`);
            }

            console.log(`✅ OCR记录已删除: ${recordId}`);
            return true;
        } catch (error) {
            console.error('❌ 删除OCR记录失败:', error);
            throw error;
        }
    }

    /**
     * 获取用户的OCR统计信息
     * @param {string} userId - 用户ID
     * @returns {Object} 统计信息
     */
    static async getStatistics(userId) {
        try {
            const { data, error } = await supabaseAdmin
                .from('ocr_records')
                .select('status, confidence_score')
                .eq('user_id', userId);

            if (error) {
                console.error('❌ 获取OCR统计失败:', error);
                throw new Error(`获取OCR统计失败: ${error.message}`);
            }

            const stats = {
                total: data.length,
                processing: 0,
                success: 0,
                failed: 0,
                confirmed: 0,
                averageConfidence: 0
            };

            let totalConfidence = 0;
            let confidenceCount = 0;

            for (const record of data) {
                stats[record.status] = (stats[record.status] || 0) + 1;
                
                if (record.confidence_score > 0) {
                    totalConfidence += parseFloat(record.confidence_score);
                    confidenceCount++;
                }
            }

            if (confidenceCount > 0) {
                stats.averageConfidence = totalConfidence / confidenceCount;
            }

            console.log(`✅ OCR统计信息获取成功: 总计${stats.total}条记录`);
            return stats;
        } catch (error) {
            console.error('❌ 获取OCR统计失败:', error);
            throw error;
        }
    }

    /**
     * 标记记录为已确认
     * @param {string} recordId - 记录ID
     * @param {string} userId - 用户ID
     * @param {string} expenseId - 关联的支出记录ID
     * @returns {OCRRecord|null} 更新后的记录
     */
    static async markAsConfirmed(recordId, userId, expenseId) {
        try {
            return await this.updateById(recordId, userId, {
                status: 'confirmed',
                expenseId: expenseId
            });
        } catch (error) {
            console.error('❌ 标记OCR记录为已确认失败:', error);
            throw error;
        }
    }

    /**
     * 标记记录为失败
     * @param {string} recordId - 记录ID
     * @param {string} userId - 用户ID
     * @param {string} errorMessage - 错误信息
     * @returns {OCRRecord|null} 更新后的记录
     */
    static async markAsFailed(recordId, userId, errorMessage) {
        try {
            return await this.updateById(recordId, userId, {
                status: 'failed',
                errorMessage: errorMessage
            });
        } catch (error) {
            console.error('❌ 标记OCR记录为失败失败:', error);
            throw error;
        }
    }

    /**
     * 检查用户是否拥有此记录
     * @param {string} userId - 用户ID
     * @returns {boolean} 是否拥有
     */
    belongsToUser(userId) {
        return this.userId === userId;
    }

    /**
     * 获取解析后的金额
     * @returns {number|null} 金额
     */
    getParsedAmount() {
        return this.parsedData?.amount || null;
    }

    /**
     * 获取解析后的商户名称
     * @returns {string|null} 商户名称
     */
    getParsedMerchant() {
        return this.parsedData?.merchant || null;
    }

    /**
     * 获取解析后的日期
     * @returns {string|null} 日期
     */
    getParsedDate() {
        return this.parsedData?.date || null;
    }

    /**
     * 获取解析后的分类
     * @returns {string|null} 分类
     */
    getParsedCategory() {
        return this.parsedData?.category || null;
    }

    /**
     * 转换为JSON格式
     * @returns {Object} JSON对象
     */
    toJSON() {
        return {
            id: this.id,
            userId: this.userId,
            originalText: this.originalText,
            parsedData: this.parsedData,
            confidenceScore: this.confidenceScore,
            status: this.status,
            errorMessage: this.errorMessage,
            expenseId: this.expenseId,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
}

module.exports = OCRRecord; 