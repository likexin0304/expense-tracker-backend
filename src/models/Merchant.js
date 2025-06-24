const { supabaseAdmin } = require('../utils/supabase');

/**
 * 商户数据模型
 */
class Merchant {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.category = data.category;
        this.keywords = data.keywords || [];
        this.confidenceScore = parseFloat(data.confidence_score || 1.0);
        this.isActive = data.is_active !== false;
        this.createdAt = data.created_at;
        this.updatedAt = data.updated_at;
    }

    /**
     * 获取所有商户列表
     * @param {Object} options - 查询选项
     * @returns {Array} 商户列表
     */
    static async findAll(options = {}) {
        try {
            let query = supabaseAdmin
                .from('merchants')
                .select('*')
                .eq('is_active', true);

            // 按分类筛选
            if (options.category) {
                query = query.eq('category', options.category);
            }

            // 排序
            if (options.sort === 'name') {
                query = query.order('name', { ascending: true });
            } else {
                query = query.order('confidence_score', { ascending: false })
                             .order('name', { ascending: true });
            }

            // 分页
            if (options.limit) {
                const offset = options.offset || 0;
                query = query.range(offset, offset + options.limit - 1);
            }

            const { data, error } = await query;

            if (error) {
                console.error('❌ 获取商户列表失败:', error);
                throw new Error(`获取商户列表失败: ${error.message}`);
            }

            console.log(`✅ 查询到 ${data.length} 个商户`);
            return data.map(merchant => new Merchant(merchant));
        } catch (error) {
            console.error('❌ 获取商户列表失败:', error);
            throw error;
        }
    }

    /**
     * 根据ID查找商户
     * @param {string} merchantId - 商户ID
     * @returns {Merchant|null} 商户对象或null
     */
    static async findById(merchantId) {
        try {
            const { data, error } = await supabaseAdmin
                .from('merchants')
                .select('*')
                .eq('id', merchantId)
                .eq('is_active', true)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    return null;
                }
                console.error('❌ 查找商户失败:', error);
                throw new Error(`查找商户失败: ${error.message}`);
            }

            return data ? new Merchant(data) : null;
        } catch (error) {
            console.error('❌ 查找商户失败:', error);
            throw error;
        }
    }

    /**
     * 智能匹配商户
     * @param {string} text - 待匹配的文本
     * @param {Object} options - 匹配选项
     * @returns {Array} 匹配结果数组，按置信度排序
     */
    static async smartMatch(text, options = {}) {
        try {
            if (!text || typeof text !== 'string') {
                return [];
            }

            const searchText = text.toLowerCase().trim();
            console.log(`🔍 开始智能匹配商户: "${searchText}"`);

            // 使用PostgreSQL的全文搜索和相似度匹配
            const { data, error } = await supabaseAdmin
                .rpc('smart_merchant_match', {
                    search_text: searchText,
                    min_confidence: options.minConfidence || 0.3,
                    max_results: options.maxResults || 10
                });

            if (error) {
                console.error('❌ 智能匹配商户失败:', error);
                // 如果RPC函数不存在，降级使用基础匹配
                return await this.basicMatch(searchText, options);
            }

            const matches = data.map(item => ({
                merchant: new Merchant(item),
                confidence: parseFloat(item.match_confidence || 0),
                matchType: item.match_type || 'unknown'
            }));

            console.log(`✅ 智能匹配完成，找到 ${matches.length} 个候选商户`);
            return matches;
        } catch (error) {
            console.error('❌ 智能匹配商户失败:', error);
            // 降级使用基础匹配
            return await this.basicMatch(text, options);
        }
    }

    /**
     * 基础匹配算法（降级方案）
     * @param {string} searchText - 搜索文本
     * @param {Object} options - 匹配选项
     * @returns {Array} 匹配结果
     */
    static async basicMatch(searchText, options = {}) {
        try {
            console.log(`🔄 使用基础匹配算法: "${searchText}"`);

            const { data, error } = await supabaseAdmin
                .from('merchants')
                .select('*')
                .eq('is_active', true);

            if (error) {
                throw new Error(`基础匹配失败: ${error.message}`);
            }

            const matches = [];
            const minConfidence = options.minConfidence || 0.3;

            for (const merchantData of data) {
                const merchant = new Merchant(merchantData);
                const confidence = this.calculateMatchConfidence(searchText, merchant);
                
                if (confidence >= minConfidence) {
                    matches.push({
                        merchant,
                        confidence,
                        matchType: 'basic'
                    });
                }
            }

            // 按置信度排序
            matches.sort((a, b) => b.confidence - a.confidence);

            // 限制结果数量
            const maxResults = options.maxResults || 10;
            const limitedMatches = matches.slice(0, maxResults);

            console.log(`✅ 基础匹配完成，找到 ${limitedMatches.length} 个候选商户`);
            return limitedMatches;
        } catch (error) {
            console.error('❌ 基础匹配失败:', error);
            return [];
        }
    }

    /**
     * 计算匹配置信度
     * @param {string} searchText - 搜索文本
     * @param {Merchant} merchant - 商户对象
     * @returns {number} 置信度 (0-1)
     */
    static calculateMatchConfidence(searchText, merchant) {
        let confidence = 0;
        const text = searchText.toLowerCase();
        const merchantName = merchant.name.toLowerCase();

        // 完全匹配商户名称
        if (text.includes(merchantName) || merchantName.includes(text)) {
            confidence = Math.max(confidence, 0.9);
        }

        // 检查关键词匹配
        for (const keyword of merchant.keywords) {
            const keywordLower = keyword.toLowerCase();
            if (text.includes(keywordLower) || keywordLower.includes(text)) {
                confidence = Math.max(confidence, 0.8);
            }
        }

        // 部分匹配
        if (this.calculateSimilarity(text, merchantName) > 0.6) {
            confidence = Math.max(confidence, 0.6);
        }

        // 应用商户本身的置信度权重
        return confidence * merchant.confidenceScore;
    }

    /**
     * 计算字符串相似度
     * @param {string} str1 - 字符串1
     * @param {string} str2 - 字符串2
     * @returns {number} 相似度 (0-1)
     */
    static calculateSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) {
            return 1.0;
        }
        
        const distance = this.levenshteinDistance(longer, shorter);
        return (longer.length - distance) / longer.length;
    }

    /**
     * 计算编辑距离
     * @param {string} str1 - 字符串1
     * @param {string} str2 - 字符串2
     * @returns {number} 编辑距离
     */
    static levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }

    /**
     * 创建新商户
     * @param {Object} merchantData - 商户数据
     * @returns {Merchant} 新创建的商户对象
     */
    static async create(merchantData) {
        try {
            // 验证数据
            this.validateData(merchantData);

            const { data, error } = await supabaseAdmin
                .from('merchants')
                .insert({
                    name: merchantData.name,
                    category: merchantData.category,
                    keywords: merchantData.keywords || [],
                    confidence_score: merchantData.confidenceScore || 1.0,
                    is_active: merchantData.isActive !== false
                })
                .select()
                .single();

            if (error) {
                console.error('❌ 创建商户失败:', error);
                throw new Error(`创建商户失败: ${error.message}`);
            }

            console.log(`✅ 商户已创建: ${merchantData.name} (${merchantData.category})`);
            return new Merchant(data);
        } catch (error) {
            console.error('❌ 创建商户失败:', error);
            throw error;
        }
    }

    /**
     * 验证商户数据
     * @param {Object} data - 商户数据
     */
    static validateData(data) {
        if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
            throw new Error('商户名称不能为空');
        }

        if (!data.category || typeof data.category !== 'string' || data.category.trim().length === 0) {
            throw new Error('商户分类不能为空');
        }

        if (data.keywords && !Array.isArray(data.keywords)) {
            throw new Error('关键词必须是数组格式');
        }

        if (data.confidenceScore !== undefined) {
            const score = parseFloat(data.confidenceScore);
            if (isNaN(score) || score < 0 || score > 1) {
                throw new Error('置信度必须是0-1之间的数字');
            }
        }
    }

    /**
     * 获取分类列表
     * @returns {Array} 分类列表
     */
    static async getCategories() {
        try {
            const { data, error } = await supabaseAdmin
                .from('merchants')
                .select('category')
                .eq('is_active', true)
                .group('category');

            if (error) {
                console.error('❌ 获取分类列表失败:', error);
                throw new Error(`获取分类列表失败: ${error.message}`);
            }

            const categories = [...new Set(data.map(item => item.category))];
            console.log(`✅ 获取到 ${categories.length} 个分类`);
            return categories;
        } catch (error) {
            console.error('❌ 获取分类列表失败:', error);
            throw error;
        }
    }

    /**
     * 转换为JSON格式
     * @returns {Object} JSON对象
     */
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            category: this.category,
            keywords: this.keywords,
            confidenceScore: this.confidenceScore,
            isActive: this.isActive,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
}

module.exports = Merchant; 