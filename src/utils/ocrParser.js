const Merchant = require('../models/Merchant');

/**
 * OCR文本解析服务
 */
class OCRParser {
    /**
     * 解析OCR文本，提取账单信息
     * @param {string} text - OCR识别的文本
     * @param {Object} options - 解析选项
     * @returns {Object} 解析结果
     */
    static async parseText(text, options = {}) {
        try {
            console.log('🔍 开始解析OCR文本:', { textLength: text.length });
            
            if (!text || typeof text !== 'string') {
                throw new Error('无效的文本输入');
            }

            const cleanText = this.cleanText(text);
            console.log('🧹 清理后的文本:', { cleanTextLength: cleanText.length });

            // 解析各个字段
            const amount = this.parseAmount(cleanText);
            const date = this.parseDate(cleanText);
            const merchants = await this.parseMerchant(cleanText);
            const paymentMethod = this.parsePaymentMethod(cleanText);

            // 选择最佳商户匹配
            const bestMerchant = merchants.length > 0 ? merchants[0] : null;
            const category = bestMerchant ? bestMerchant.merchant.category : this.inferCategory(cleanText);

            // 计算整体置信度
            const confidence = this.calculateOverallConfidence({
                amount,
                date,
                merchant: bestMerchant,
                paymentMethod,
                textLength: cleanText.length
            });

            const result = {
                success: true,
                data: {
                    amount: amount?.value || null,
                    amountConfidence: amount?.confidence || 0,
                    date: date?.value || null,
                    dateConfidence: date?.confidence || 0,
                    merchant: bestMerchant?.merchant?.name || null,
                    merchantConfidence: bestMerchant?.confidence || 0,
                    category: category,
                    paymentMethod: paymentMethod?.value || null,
                    paymentMethodConfidence: paymentMethod?.confidence || 0,
                    allMerchants: merchants.map(m => ({
                        name: m.merchant.name,
                        category: m.merchant.category,
                        confidence: m.confidence
                    })),
                    overallConfidence: confidence,
                    originalText: text,
                    cleanedText: cleanText
                },
                message: confidence > 0.7 ? '解析成功' : confidence > 0.4 ? '部分解析成功' : '解析置信度较低'
            };

            console.log('✅ OCR文本解析完成:', {
                amount: result.data.amount,
                merchant: result.data.merchant,
                category: result.data.category,
                confidence: result.data.overallConfidence
            });

            return result;
        } catch (error) {
            console.error('❌ OCR文本解析失败:', error);
            return {
                success: false,
                error: error.message,
                data: null
            };
        }
    }

    /**
     * 清理文本，移除无关字符
     * @param {string} text - 原始文本
     * @returns {string} 清理后的文本
     */
    static cleanText(text) {
        return text
            .replace(/\s+/g, ' ')  // 合并多个空格
            .replace(/[^\u4e00-\u9fa5\w\s\-\.\,\:\$¥￥]/g, ' ')  // 保留中文、字母、数字、基本符号
            .trim();
    }

    /**
     * 解析金额
     * @param {string} text - 文本
     * @returns {Object|null} 金额解析结果
     */
    static parseAmount(text) {
        const patterns = [
            // ¥123.45 格式
            /[¥￥]\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g,
            // 123.45元 格式
            /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*元/g,
            // $123.45 格式
            /\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g,
            // 123.45USD 格式
            /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*USD/gi,
            // 纯数字格式（金额相关上下文）
            /(?:金额|总计|合计|应付|实付|支付|消费)[：:\s]*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g,
            // 一般数字格式（作为备选）
            /(\d{1,3}(?:,\d{3})*\.\d{2})/g
        ];

        const amounts = [];

        for (let i = 0; i < patterns.length; i++) {
            const pattern = patterns[i];
            let match;
            
            while ((match = pattern.exec(text)) !== null) {
                const amountStr = match[1].replace(/,/g, '');
                const amount = parseFloat(amountStr);
                
                if (!isNaN(amount) && amount > 0 && amount < 1000000) {  // 合理的金额范围
                    amounts.push({
                        value: amount,
                        confidence: this.getAmountConfidence(i, match[0], text),
                        source: match[0],
                        pattern: i
                    });
                }
            }
        }

        if (amounts.length === 0) {
            return null;
        }

        // 选择置信度最高的金额
        amounts.sort((a, b) => b.confidence - a.confidence);
        return amounts[0];
    }

    /**
     * 获取金额解析的置信度
     * @param {number} patternIndex - 模式索引
     * @param {string} match - 匹配的文本
     * @param {string} fullText - 完整文本
     * @returns {number} 置信度
     */
    static getAmountConfidence(patternIndex, match, fullText) {
        let confidence = 0;

        // 基础置信度（根据模式）
        const baseConfidence = [0.9, 0.85, 0.8, 0.75, 0.7, 0.4][patternIndex] || 0.3;
        confidence = baseConfidence;

        // 上下文加分
        if (fullText.includes('支付') || fullText.includes('消费') || fullText.includes('金额')) {
            confidence += 0.1;
        }

        // 货币符号加分
        if (match.includes('¥') || match.includes('￥') || match.includes('元')) {
            confidence += 0.1;
        }

        return Math.min(confidence, 1.0);
    }

    /**
     * 解析日期
     * @param {string} text - 文本
     * @returns {Object|null} 日期解析结果
     */
    static parseDate(text) {
        const patterns = [
            // 2024-01-15 格式
            /(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})/g,
            // 2024年1月15日 格式
            /(\d{4})年(\d{1,2})月(\d{1,2})日/g,
            // 01-15 格式（当年）
            /(\d{1,2})[-\/](\d{1,2})/g,
            // 1月15日 格式（当年）
            /(\d{1,2})月(\d{1,2})日/g
        ];

        const dates = [];
        const currentYear = new Date().getFullYear();

        for (let i = 0; i < patterns.length; i++) {
            const pattern = patterns[i];
            let match;

            while ((match = pattern.exec(text)) !== null) {
                let dateStr = '';
                let confidence = 0.8 - (i * 0.1);

                if (i === 0) {
                    // 2024-01-15 格式
                    dateStr = match[1];
                } else if (i === 1) {
                    // 2024年1月15日 格式
                    dateStr = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
                } else if (i === 2) {
                    // 01-15 格式（当年）
                    dateStr = `${currentYear}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`;
                    confidence -= 0.2; // 年份不确定，降低置信度
                } else if (i === 3) {
                    // 1月15日 格式（当年）
                    dateStr = `${currentYear}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`;
                    confidence -= 0.2;
                }

                const date = new Date(dateStr);
                if (!isNaN(date.getTime())) {
                    dates.push({
                        value: date.toISOString().split('T')[0],
                        confidence: confidence,
                        source: match[0]
                    });
                }
            }
        }

        if (dates.length === 0) {
            // 如果没有找到日期，使用当前日期但置信度很低
            return {
                value: new Date().toISOString().split('T')[0],
                confidence: 0.1,
                source: '默认当前日期'
            };
        }

        // 选择置信度最高的日期
        dates.sort((a, b) => b.confidence - a.confidence);
        return dates[0];
    }

    /**
     * 解析商户信息
     * @param {string} text - 文本
     * @returns {Array} 商户匹配结果
     */
    static async parseMerchant(text) {
        try {
            const merchants = await Merchant.smartMatch(text, {
                minConfidence: 0.3,
                maxResults: 5
            });

            console.log(`🏪 商户匹配结果: 找到 ${merchants.length} 个候选商户`);
            return merchants;
        } catch (error) {
            console.error('❌ 商户解析失败:', error);
            return [];
        }
    }

    /**
     * 解析支付方式
     * @param {string} text - 文本
     * @returns {Object|null} 支付方式解析结果
     */
    static parsePaymentMethod(text) {
        const methods = [
            { keywords: ['支付宝', 'Alipay'], value: '支付宝', confidence: 0.9 },
            { keywords: ['微信', '微信支付', 'WeChat'], value: '微信支付', confidence: 0.9 },
            { keywords: ['银行卡', '储蓄卡', '信用卡'], value: '银行卡', confidence: 0.8 },
            { keywords: ['现金', '现付'], value: '现金', confidence: 0.8 },
            { keywords: ['Apple Pay', 'ApplePay'], value: 'Apple Pay', confidence: 0.9 },
            { keywords: ['云闪付'], value: '云闪付', confidence: 0.9 }
        ];

        for (const method of methods) {
            for (const keyword of method.keywords) {
                if (text.includes(keyword)) {
                    return {
                        value: method.value,
                        confidence: method.confidence,
                        source: keyword
                    };
                }
            }
        }

        return {
            value: '其他',
            confidence: 0.1,
            source: '默认'
        };
    }

    /**
     * 推断分类（当没有匹配到商户时）
     * @param {string} text - 文本
     * @returns {string} 分类
     */
    static inferCategory(text) {
        const categoryKeywords = {
            '餐饮': ['餐厅', '饭店', '咖啡', '茶', '外卖', '美食', '小吃', '火锅', '烧烤'],
            '交通': ['出租车', '地铁', '公交', '滴滴', '加油', '停车', '高速'],
            '购物': ['超市', '商场', '淘宝', '京东', '购物', '服装', '电器'],
            '娱乐': ['电影', '游戏', 'KTV', '健身', '运动'],
            '生活': ['水费', '电费', '燃气', '物业', '话费', '宽带'],
            '医疗': ['医院', '药店', '体检', '看病'],
            '教育': ['学费', '培训', '书店', '教育']
        };

        for (const [category, keywords] of Object.entries(categoryKeywords)) {
            for (const keyword of keywords) {
                if (text.includes(keyword)) {
                    return category;
                }
            }
        }

        return '其他';
    }

    /**
     * 计算整体置信度
     * @param {Object} components - 各组件解析结果
     * @returns {number} 整体置信度
     */
    static calculateOverallConfidence(components) {
        const weights = {
            amount: 0.4,        // 金额权重最高
            merchant: 0.3,      // 商户权重次之
            date: 0.2,          // 日期权重
            paymentMethod: 0.1  // 支付方式权重最低
        };

        let totalScore = 0;
        let totalWeight = 0;

        if (components.amount) {
            totalScore += components.amount.confidence * weights.amount;
            totalWeight += weights.amount;
        }

        if (components.merchant) {
            totalScore += components.merchant.confidence * weights.merchant;
            totalWeight += weights.merchant;
        }

        if (components.date) {
            totalScore += components.date.confidence * weights.date;
            totalWeight += weights.date;
        }

        if (components.paymentMethod) {
            totalScore += components.paymentMethod.confidence * weights.paymentMethod;
            totalWeight += weights.paymentMethod;
        }

        // 文本长度加分（较长的文本通常包含更多信息）
        if (components.textLength > 50) {
            totalScore += 0.1;
            totalWeight += 0.1;
        }

        return totalWeight > 0 ? Math.min(totalScore / totalWeight, 1.0) : 0;
    }

    /**
     * 验证解析结果
     * @param {Object} parsedData - 解析结果
     * @returns {Object} 验证结果
     */
    static validateParsedData(parsedData) {
        const errors = [];
        const warnings = [];

        // 验证金额
        if (!parsedData.amount || parsedData.amount <= 0) {
            errors.push('未能识别有效金额');
        } else if (parsedData.amount > 100000) {
            warnings.push('金额异常高，请确认');
        }

        // 验证日期
        if (parsedData.date) {
            const date = new Date(parsedData.date);
            const now = new Date();
            const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
            const oneMonthLater = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

            if (date < oneYearAgo || date > oneMonthLater) {
                warnings.push('日期超出常见范围，请确认');
            }
        }

        // 验证商户
        if (!parsedData.merchant) {
            warnings.push('未能识别商户信息');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            confidence: parsedData.overallConfidence
        };
    }
}

module.exports = OCRParser; 