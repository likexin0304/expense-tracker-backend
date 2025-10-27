const OCRRecord = require('../models/OCRRecord');
const Merchant = require('../models/Merchant');
const { Expense } = require('../models/Expense');
const OCRParser = require('../utils/ocrParser');

// 分类映射：中文 -> 英文
const CATEGORY_MAPPING = {
    '餐饮': 'food',
    '交通': 'transport',
    '娱乐': 'entertainment',
    '购物': 'shopping',
    '账单': 'bills',
    '医疗': 'healthcare',
    '教育': 'education',
    '旅行': 'travel',
    '其他': 'other'
};

// 支付方式映射：中文 -> 英文
const PAYMENT_METHOD_MAPPING = {
    '现金': 'cash',
    '银行卡': 'card',
    '信用卡': 'card',
    '借记卡': 'card',
    '支付宝': 'online',
    '微信支付': 'online',
    '微信': 'online',
    '网上支付': 'online',
    '在线支付': 'online',
    '其他': 'other'
};

/**
 * OCR控制器
 */
class OCRController {
    /**
     * 提交OCR文本进行解析
     * POST /api/ocr/parse
     */
    static async parseText(req, res) {
        try {
            const { text, options = {} } = req.body;
            const userId = req.userId;

            console.log('📱 收到OCR解析请求:', { userId, textLength: text?.length });

            // 验证输入
            if (!text || typeof text !== 'string' || text.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    message: '请提供有效的OCR文本',
                    error: 'INVALID_TEXT',
                    data: null
                });
            }

            // 创建OCR记录
            let ocrRecord = null;
            try {
                ocrRecord = await OCRRecord.create(userId, text, {
                status: 'processing'
            });
                
                // 检查OCR记录是否成功创建
                if (!ocrRecord || !ocrRecord.id) {
                    console.error('❌ OCR记录创建失败');
                    return res.status(500).json({
                        success: false,
                        message: 'OCR记录创建失败',
                        error: 'RECORD_CREATION_FAILED',
                        data: null
                    });
                }
            } catch (dbError) {
                console.error('❌ 数据库操作失败:', dbError);
                return res.status(500).json({
                    success: false,
                    message: '数据库操作失败',
                    error: 'DATABASE_ERROR',
                    data: null
                });
            }

            try {
                // 解析OCR文本
                const parseResult = await OCRParser.parseText(text, options);
                console.log('🔍 OCR解析结果:', { success: parseResult.success, hasData: !!parseResult.data });

                if (!parseResult.success) {
                    // 标记为失败
                    try {
                    await OCRRecord.markAsFailed(ocrRecord.id, userId, parseResult.error);
                    } catch (markError) {
                        console.error('❌ 标记OCR记录失败时出错:', markError);
                        // 继续执行，不中断响应
                    }
                    
                    return res.status(400).json({
                        success: false,
                        message: '文本解析失败',
                        error: parseResult.error || 'PARSE_FAILED',
                        data: {
                            recordId: ocrRecord.id
                        }
                    });
                }

                // 更新OCR记录
                let updatedRecord = null;
                try {
                    updatedRecord = await OCRRecord.updateById(ocrRecord.id, userId, {
                    parsedData: parseResult.data,
                    confidenceScore: parseResult.data.overallConfidence,
                    status: 'success'
                });
                } catch (updateError) {
                    console.error('❌ 更新OCR记录失败:', updateError);
                    // 继续执行，使用原始记录
                    updatedRecord = ocrRecord;
                }

                console.log('✅ OCR解析成功:', {
                    recordId: ocrRecord.id,
                    confidence: parseResult.data.overallConfidence,
                    merchant: parseResult.data.merchant,
                    amount: parseResult.data.amount
                });

                // 确保响应格式一致
                const responseData = {
                    success: true,
                    message: parseResult.message || '解析成功',
                    data: {
                        recordId: updatedRecord?.id || ocrRecord.id,
                        parsedData: parseResult.data || {},
                        confidence: parseResult.data?.overallConfidence || 0,
                        suggestions: {
                            shouldAutoCreate: (parseResult.data?.overallConfidence || 0) > 0.8,
                            needsReview: (parseResult.data?.overallConfidence || 0) < 0.6
                        }
                    }
                };

                res.status(200).json(responseData);

            } catch (parseError) {
                console.error('❌ OCR解析过程出错:', parseError);
                
                // 标记为失败
                try {
                await OCRRecord.markAsFailed(ocrRecord.id, userId, parseError.message);
                } catch (markError) {
                    console.error('❌ 标记OCR记录失败时出错:', markError);
                    // 继续执行，不中断响应
                }
                
                res.status(500).json({
                    success: false,
                    message: '解析过程中发生错误',
                    error: parseError.message || 'PARSE_ERROR',
                    data: {
                        recordId: ocrRecord.id
                    }
                });
            }

        } catch (error) {
            console.error('❌ OCR解析请求失败:', error);
            res.status(500).json({
                success: false,
                message: '服务器内部错误',
                error: error.message || 'INTERNAL_SERVER_ERROR',
                data: null
            });
        }
    }

    /**
     * 提交OCR文本进行解析并自动创建支出记录（高置信度时）
     * POST /api/ocr/parse-auto
     */
    static async parseTextAndAutoCreate(req, res) {
        try {
            const { text, options = {}, autoCreateThreshold = 0.85 } = req.body;
            const userId = req.userId;

            console.log('📱 收到OCR自动解析请求:', { 
                userId, 
                textLength: text?.length,
                autoCreateThreshold 
            });

            // 验证输入
            if (!text || typeof text !== 'string' || text.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    message: '请提供有效的OCR文本',
                    error: 'INVALID_TEXT',
                    data: null
                });
            }

            // 创建OCR记录
            let ocrRecord = null;
            try {
                ocrRecord = await OCRRecord.create(userId, text, {
                status: 'processing'
            });
                
                // 检查OCR记录是否成功创建
                if (!ocrRecord || !ocrRecord.id) {
                    console.error('❌ OCR记录创建失败');
                    return res.status(500).json({
                        success: false,
                        message: 'OCR记录创建失败',
                        error: 'RECORD_CREATION_FAILED',
                        data: null
                    });
                }
            } catch (dbError) {
                console.error('❌ 数据库操作失败:', dbError);
                return res.status(500).json({
                    success: false,
                    message: '数据库操作失败',
                    error: 'DATABASE_ERROR',
                    data: null
                });
            }

            try {
                // 解析OCR文本
                const parseResult = await OCRParser.parseText(text, options);
                console.log('🔍 OCR自动解析结果:', { success: parseResult.success, hasData: !!parseResult.data });

                if (!parseResult.success) {
                    // 标记为失败
                    try {
                    await OCRRecord.markAsFailed(ocrRecord.id, userId, parseResult.error);
                    } catch (markError) {
                        console.error('❌ 标记OCR记录失败时出错:', markError);
                        // 继续执行，不中断响应
                    }
                    
                    return res.status(400).json({
                        success: false,
                        message: '文本解析失败',
                        error: parseResult.error || 'PARSE_FAILED',
                        data: {
                            recordId: ocrRecord.id
                        }
                    });
                }

                // 更新OCR记录
                let updatedRecord = null;
                try {
                    updatedRecord = await OCRRecord.updateById(ocrRecord.id, userId, {
                    parsedData: parseResult.data,
                    confidenceScore: parseResult.data.overallConfidence,
                    status: 'success'
                });
                } catch (updateError) {
                    console.error('❌ 更新OCR记录失败:', updateError);
                    // 继续执行，使用原始记录
                    updatedRecord = ocrRecord;
                }

                const confidence = parseResult.data.overallConfidence || 0;
                const shouldAutoCreate = confidence >= autoCreateThreshold;

                console.log('✅ OCR解析成功:', {
                    recordId: ocrRecord.id,
                    confidence: confidence,
                    shouldAutoCreate: shouldAutoCreate,
                    threshold: autoCreateThreshold
                });

                if (shouldAutoCreate) {
                    // 高置信度，自动创建支出记录
                    try {
                        const expenseData = {
                            userId: userId,
                            amount: parseResult.data.amount || 0,
                            category: CATEGORY_MAPPING[parseResult.data.category] || 'other',
                            description: parseResult.data.merchant || parseResult.data.description || '自动识别记录',
                            date: parseResult.data.date || new Date().toISOString(),
                            location: parseResult.data.location || '',
                            paymentMethod: PAYMENT_METHOD_MAPPING[parseResult.data.paymentMethod] || 'cash',
                            tags: ['自动创建', 'OCR识别']
                        };

                        const expense = await Expense.create(expenseData);

                        // 标记OCR记录为已确认
                        try {
                        await OCRRecord.markAsConfirmed(ocrRecord.id, userId, expense.id);
                        } catch (markError) {
                            console.error('❌ 标记OCR记录已确认时出错:', markError);
                            // 继续执行，不中断响应
                        }

                        console.log('🚀 自动创建支出记录成功:', {
                            recordId: ocrRecord.id,
                            expenseId: expense.id,
                            amount: expense.amount,
                            confidence: confidence
                        });

                        // 转换为前端期望的格式
                        const formattedParsedData = {
                            amount: parseResult.data.amount ? {
                                value: parseResult.data.amount,
                                confidence: parseResult.data.amountConfidence || 0
                            } : null,
                            merchant: parseResult.data.merchant ? {
                                name: parseResult.data.merchant,
                                confidence: parseResult.data.merchantConfidence || 0
                            } : null,
                            date: {
                                value: parseResult.data.date,
                                confidence: parseResult.data.dateConfidence || 0
                            },
                            category: {
                                name: parseResult.data.category,
                                confidence: 0.8
                            },
                            paymentMethod: {
                                type: parseResult.data.paymentMethod || '其他',
                                confidence: parseResult.data.paymentMethodConfidence || 0
                            },
                            originalText: parseResult.data.originalText
                        };

                        return res.status(201).json({
                            success: true,
                            message: '自动识别并创建支出记录成功',
                            data: {
                                autoCreated: true,
                                recordId: updatedRecord?.id || ocrRecord.id,
                                expense: expense.toJSON(),
                                ocrRecord: {
                                    id: updatedRecord?.id || ocrRecord.id,
                                    originalText: parseResult.data.originalText,
                                    parsedData: parseResult.data,
                                    confidenceScore: confidence,
                                    status: 'confirmed',
                                    expenseId: expense.id
                                },
                                parsedData: formattedParsedData,
                                confidence: confidence,
                                suggestions: {
                                    shouldAutoCreate: true,
                                    needsReview: false,
                                    reason: `置信度 ${confidence.toFixed(2)} 达到自动创建阈值`
                                }
                            }
                        });

                    } catch (expenseError) {
                        console.error('❌ 自动创建支出记录失败:', expenseError.message);
                        
                        // 自动创建失败，返回解析结果让用户手动确认
                        const formattedParsedData = {
                            amount: parseResult.data.amount ? {
                                value: parseResult.data.amount,
                                confidence: parseResult.data.amountConfidence || 0
                            } : null,
                            merchant: parseResult.data.merchant ? {
                                name: parseResult.data.merchant,
                                confidence: parseResult.data.merchantConfidence || 0
                            } : null,
                            date: {
                                value: parseResult.data.date,
                                confidence: parseResult.data.dateConfidence || 0
                            },
                            category: {
                                name: parseResult.data.category,
                                confidence: 0.8
                            },
                            paymentMethod: {
                                type: parseResult.data.paymentMethod || '其他',
                                confidence: parseResult.data.paymentMethodConfidence || 0
                            },
                            originalText: parseResult.data.originalText
                        };

                        return res.status(200).json({
                            success: true,
                            message: '解析成功，但自动创建失败，需要手动确认',
                            data: {
                                autoCreated: false,
                                recordId: updatedRecord?.id || ocrRecord.id,
                                expense: null,
                                ocrRecord: {
                                    id: updatedRecord?.id || ocrRecord.id,
                                    originalText: parseResult.data.originalText,
                                    parsedData: parseResult.data,
                                    confidenceScore: confidence,
                                    status: 'success'
                                },
                                parsedData: formattedParsedData,
                                confidence: confidence,
                                error: expenseError.message || 'AUTO_CREATE_FAILED',
                                suggestions: {
                                    shouldAutoCreate: false,
                                    needsReview: true,
                                    reason: '自动创建失败，需要手动确认'
                                }
                            }
                        });
                    }
                } else {
                    // 置信度不够，需要用户确认
                    // 转换为前端期望的格式
                    const formattedParsedData = {
                        amount: parseResult.data.amount ? {
                            value: parseResult.data.amount,
                            confidence: parseResult.data.amountConfidence || 0
                        } : null,
                        merchant: parseResult.data.merchant ? {
                            name: parseResult.data.merchant,
                            confidence: parseResult.data.merchantConfidence || 0
                        } : null,
                        date: {
                            value: parseResult.data.date,
                            confidence: parseResult.data.dateConfidence || 0
                        },
                        category: {
                            name: parseResult.data.category,
                            confidence: 0.8 // 基于推断的置信度
                        },
                        paymentMethod: {
                            type: parseResult.data.paymentMethod || '其他',
                            confidence: parseResult.data.paymentMethodConfidence || 0
                        },
                        originalText: parseResult.data.originalText
                    };

                    return res.status(200).json({
                        success: true,
                        message: '解析成功，需要用户确认',
                        data: {
                            autoCreated: false,
                            recordId: updatedRecord?.id || ocrRecord.id,
                            expense: null, // 未自动创建时为null
                            ocrRecord: {
                                id: updatedRecord?.id || ocrRecord.id,
                                originalText: parseResult.data.originalText,
                                parsedData: parseResult.data,
                                confidenceScore: confidence,
                                status: 'success'
                            },
                            parsedData: formattedParsedData,
                            confidence: confidence,
                            suggestions: {
                                shouldAutoCreate: false,
                                needsReview: confidence < 0.6,
                                reason: `置信度 ${confidence.toFixed(2)} 低于阈值 ${autoCreateThreshold}`
                            }
                        }
                    });
                }

            } catch (parseError) {
                console.error('❌ OCR解析过程出错:', parseError);
                
                // 标记为失败
                try {
                await OCRRecord.markAsFailed(ocrRecord.id, userId, parseError.message);
                } catch (markError) {
                    console.error('❌ 标记OCR记录失败时出错:', markError);
                    // 继续执行，不中断响应
                }
                
                res.status(500).json({
                    success: false,
                    message: '解析过程中发生错误',
                    error: parseError.message || 'PARSE_ERROR',
                    data: {
                        recordId: ocrRecord.id
                    }
                });
            }

        } catch (error) {
            console.error('❌ OCR解析请求失败:', error);
            res.status(500).json({
                success: false,
                message: '服务器内部错误',
                error: error.message || 'INTERNAL_SERVER_ERROR',
                data: null
            });
        }
    }

    /**
     * 确认OCR解析结果并创建支出记录
     * POST /api/ocr/confirm/:recordId
     */
    static async confirmAndCreateExpense(req, res) {
        try {
            const { recordId } = req.params;
            const userId = req.userId;
            const { 
                amount, 
                category, 
                description, 
                date, 
                location, 
                paymentMethod, 
                tags = [] 
            } = req.body;

            console.log('✅ 收到OCR确认请求:', { recordId, userId, amount });

            // 查找OCR记录
            const ocrRecord = await OCRRecord.findById(recordId, userId);
            if (!ocrRecord) {
                return res.status(404).json({
                    success: false,
                    message: 'OCR记录不存在或已过期',
                    error: 'RECORD_NOT_FOUND'
                });
            }

            if (ocrRecord.status === 'confirmed') {
                return res.status(409).json({
                    success: false,
                    message: '该记录已被确认，不能重复确认',
                    error: 'RECORD_ALREADY_CONFIRMED'
                });
            }

            // 验证必填字段
            const validationErrors = {};
            
            if (!amount || amount <= 0) {
                validationErrors.amount = '金额不能为空且必须大于0';
            }
            
            if (!category) {
                validationErrors.category = '分类不能为空';
            }
            
            if (!description) {
                validationErrors.description = '描述不能为空';
            }

            if (Object.keys(validationErrors).length > 0) {
                return res.status(400).json({
                    success: false,
                    message: '缺少必填字段',
                    error: 'VALIDATION_ERROR',
                    details: validationErrors
                });
            }

            // 创建支出记录
            const expenseData = {
                userId: userId,
                amount: parseFloat(amount),
                category,
                description,
                date: date || new Date().toISOString(),
                location: location || '',
                paymentMethod: paymentMethod || 'cash',
                tags: Array.isArray(tags) ? tags : []
            };

            console.log('🔍 调试信息 - confirmAndCreateExpense:', {
                Expense: typeof Expense,
                ExpenseCreate: typeof Expense.create,
                expenseData
            });
            
            const expense = await Expense.create(expenseData);

            // 标记OCR记录为已确认
            await OCRRecord.markAsConfirmed(recordId, userId, expense.id);

            console.log('✅ OCR记录已确认并创建支出:', {
                recordId,
                expenseId: expense.id,
                amount: expense.amount
            });

            res.status(201).json({
                success: true,
                message: '支出记录创建成功',
                data: {
                    expense: expense.toJSON(),
                    ocrRecord: {
                        id: recordId,
                        status: 'confirmed',
                        expenseId: expense.id
                    }
                }
            });

        } catch (error) {
            console.error('❌ OCR确认失败:', error);
            res.status(500).json({
                success: false,
                message: '确认失败',
                error: error.message
            });
        }
    }

    /**
     * 获取OCR记录列表
     * GET /api/ocr/records
     */
    static async getRecords(req, res) {
        try {
            const userId = req.userId;
            const { 
                page = 1, 
                limit = 20, 
                status 
            } = req.query;

            const offset = (parseInt(page) - 1) * parseInt(limit);
            const options = {
                limit: parseInt(limit),
                offset,
                status
            };

            const records = await OCRRecord.findByUserId(userId, options);

            res.status(200).json({
                success: true,
                data: {
                    records: records.map(record => record.toJSON()),
                    pagination: {
                        current: parseInt(page),
                        limit: parseInt(limit),
                        total: records.length
                    }
                }
            });

        } catch (error) {
            console.error('❌ 获取OCR记录失败:', error);
            res.status(500).json({
                success: false,
                message: '获取记录失败',
                error: error.message
            });
        }
    }

    /**
     * 获取单个OCR记录详情
     * GET /api/ocr/records/:recordId
     */
    static async getRecord(req, res) {
        try {
            const { recordId } = req.params;
            const userId = req.userId;

            const record = await OCRRecord.findById(recordId, userId);
            if (!record) {
                return res.status(404).json({
                    success: false,
                    message: 'OCR记录不存在'
                });
            }

            res.status(200).json({
                success: true,
                data: record.toJSON()
            });

        } catch (error) {
            console.error('❌ 获取OCR记录详情失败:', error);
            res.status(500).json({
                success: false,
                message: '获取记录详情失败',
                error: error.message
            });
        }
    }

    /**
     * 删除OCR记录
     * DELETE /api/ocr/records/:recordId
     */
    static async deleteRecord(req, res) {
        try {
            const { recordId } = req.params;
            const userId = req.userId;

            const record = await OCRRecord.findById(recordId, userId);
            if (!record) {
                return res.status(404).json({
                    success: false,
                    message: 'OCR记录不存在'
                });
            }

            await OCRRecord.deleteById(recordId, userId);

            res.status(200).json({
                success: true,
                message: 'OCR记录删除成功'
            });

        } catch (error) {
            console.error('❌ 删除OCR记录失败:', error);
            res.status(500).json({
                success: false,
                message: '删除记录失败',
                error: error.message
            });
        }
    }

    /**
     * 获取OCR统计信息
     * GET /api/ocr/statistics
     */
    static async getStatistics(req, res) {
        try {
            const userId = req.userId;

            const stats = await OCRRecord.getStatistics(userId);

            res.status(200).json({
                success: true,
                data: {
                    statistics: stats,
                    summary: {
                        totalRecords: stats.total,
                        successRate: stats.total > 0 ? ((stats.success + stats.confirmed) / stats.total * 100).toFixed(1) : 0,
                        averageConfidence: (stats.averageConfidence * 100).toFixed(1),
                        pendingReview: stats.processing + stats.success
                    }
                }
            });

        } catch (error) {
            console.error('❌ 获取OCR统计失败:', error);
            res.status(500).json({
                success: false,
                message: '获取统计信息失败',
                error: error.message
            });
        }
    }

    /**
     * 获取商户列表（用于OCR结果校正）
     * GET /api/ocr/merchants
     */
    static async getMerchants(req, res) {
        try {
            const { 
                category, 
                search, 
                limit = 50 
            } = req.query;

            const options = {
                category,
                limit: parseInt(limit),
                sort: 'name'
            };

            let merchants = await Merchant.findAll(options);

            // 如果有搜索关键词，进行过滤
            if (search && search.trim()) {
                const searchTerm = search.trim().toLowerCase();
                merchants = merchants.filter(merchant => 
                    merchant.name.toLowerCase().includes(searchTerm) ||
                    merchant.keywords.some(keyword => 
                        keyword.toLowerCase().includes(searchTerm)
                    )
                );
            }

            res.status(200).json({
                success: true,
                data: {
                    merchants: merchants.map(merchant => ({
                        id: merchant.id,
                        name: merchant.name,
                        category: merchant.category,
                        keywords: merchant.keywords
                    })),
                    total: merchants.length
                }
            });

        } catch (error) {
            console.error('❌ 获取商户列表失败:', error);
            res.status(500).json({
                success: false,
                message: '获取商户列表失败',
                error: error.message
            });
        }
    }

    /**
     * 智能匹配商户
     * POST /api/ocr/merchants/match
     */
    static async matchMerchants(req, res) {
        try {
            const { text, minConfidence = 0.3, maxResults = 10 } = req.body;

            if (!text || typeof text !== 'string') {
                return res.status(400).json({
                    success: false,
                    message: '请提供有效的文本'
                });
            }

            const matches = await Merchant.smartMatch(text, {
                minConfidence: parseFloat(minConfidence),
                maxResults: parseInt(maxResults)
            });

            res.status(200).json({
                success: true,
                data: {
                    matches: matches.map(match => ({
                        merchant: {
                            id: match.merchant.id,
                            name: match.merchant.name,
                            category: match.merchant.category,
                            keywords: match.merchant.keywords
                        },
                        confidence: match.confidence,
                        matchType: match.matchType
                    })),
                    total: matches.length,
                    searchText: text
                }
            });

        } catch (error) {
            console.error('❌ 智能匹配商户失败:', error);
            res.status(500).json({
                success: false,
                message: '匹配失败',
                error: error.message
            });
        }
    }

    /**
     * 生成iOS快捷指令文件
     * GET /api/ocr/shortcuts/generate
     */
    static async generateShortcut(req, res) {
        try {
            const userId = req.userId;
            const baseURL = process.env.NODE_ENV === 'production' 
                ? 'https://expense-tracker-backend-ccuxsyehj-likexin0304s-projects.vercel.app'
                : 'http://localhost:3000';
            
            // iOS快捷指令配置
            const shortcutConfig = {
                "WFWorkflowActions": [
                    {
                        "WFWorkflowActionIdentifier": "is.workflow.actions.takephoto",
                        "WFWorkflowActionParameters": {
                            "WFCameraCaptureShowPreview": false
                        }
                    },
                    {
                        "WFWorkflowActionIdentifier": "is.workflow.actions.extracttextfromimage",
                        "WFWorkflowActionParameters": {}
                    },
                    {
                        "WFWorkflowActionIdentifier": "is.workflow.actions.request",
                        "WFWorkflowActionParameters": {
                            "WFHTTPMethod": "POST",
                            "WFURL": `${baseURL}/api/ocr/parse`,
                            "WFHTTPHeaders": {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer {{用户需要替换为实际token}}`
                            },
                            "WFHTTPBodyType": "JSON",
                            "WFJSONValues": {
                                "text": "{{ExtractedText}}"
                            }
                        }
                    },
                    {
                        "WFWorkflowActionIdentifier": "is.workflow.actions.getvalueforkey",
                        "WFWorkflowActionParameters": {
                            "WFDictionaryKey": "data"
                        }
                    },
                    {
                        "WFWorkflowActionIdentifier": "is.workflow.actions.conditional",
                        "WFWorkflowActionParameters": {
                            "WFCondition": 1,
                            "WFConditionalIfTrueActions": [
                                {
                                    "WFWorkflowActionIdentifier": "is.workflow.actions.shownotification",
                                    "WFWorkflowActionParameters": {
                                        "WFNotificationActionTitle": "记账成功",
                                        "WFNotificationActionBody": "已自动识别并创建支出记录"
                                    }
                                }
                            ],
                            "WFConditionalIfFalseActions": [
                                {
                                    "WFWorkflowActionIdentifier": "is.workflow.actions.shownotification",
                                    "WFWorkflowActionParameters": {
                                        "WFNotificationActionTitle": "识别失败",
                                        "WFNotificationActionBody": "请手动添加支出记录"
                                    }
                                }
                            ]
                        }
                    }
                ],
                "WFWorkflowName": "智能记账",
                "WFWorkflowIcon": {
                    "WFWorkflowIconStartColor": 2071128575,
                    "WFWorkflowIconGlyphNumber": 61440
                },
                "WFWorkflowInputContentItemClasses": [],
                "WFWorkflowImportQuestions": []
            };

            console.log('📱 生成iOS快捷指令配置:', { userId, baseURL });

            res.status(200).json({
                success: true,
                message: 'iOS快捷指令配置生成成功',
                data: {
                    shortcutConfig,
                    setupInstructions: [
                        '1. 在iOS设备上打开"快捷指令"应用',
                        '2. 点击右上角"+"创建新快捷指令',
                        '3. 选择"高级" → "导入快捷指令"',
                        '4. 粘贴此配置JSON',
                        '5. 替换Authorization头中的token为您的访问令牌',
                        '6. 保存并添加到Siri'
                    ],
                    apiInfo: {
                        endpoint: `${baseURL}/api/ocr/parse`,
                        authRequired: true,
                        tokenHint: '请在iOS应用中获取您的访问令牌并替换{{用户需要替换为实际token}}'
                    }
                }
            });

        } catch (error) {
            console.error('❌ 生成快捷指令失败:', error);
            res.status(500).json({
                success: false,
                message: '生成快捷指令失败',
                error: error.message
            });
        }
    }
}

module.exports = OCRController; 