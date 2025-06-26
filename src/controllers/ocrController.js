const OCRRecord = require('../models/OCRRecord');
const Merchant = require('../models/Merchant');
const Expense = require('../models/Expense');
const OCRParser = require('../utils/ocrParser');

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
            const userId = req.user.id;

            console.log('📱 收到OCR解析请求:', { userId, textLength: text?.length });

            // 验证输入
            if (!text || typeof text !== 'string' || text.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    message: '请提供有效的OCR文本'
                });
            }

            // 创建OCR记录
            const ocrRecord = await OCRRecord.create(userId, text, {
                status: 'processing'
            });

            try {
                // 解析OCR文本
                const parseResult = await OCRParser.parseText(text, options);

                if (!parseResult.success) {
                    // 标记为失败
                    await OCRRecord.markAsFailed(ocrRecord.id, userId, parseResult.error);
                    
                    return res.status(400).json({
                        success: false,
                        message: '文本解析失败',
                        error: parseResult.error,
                        data: {
                            recordId: ocrRecord.id
                        }
                    });
                }

                // 更新OCR记录
                const updatedRecord = await OCRRecord.updateById(ocrRecord.id, userId, {
                    parsedData: parseResult.data,
                    confidenceScore: parseResult.data.overallConfidence,
                    status: 'success'
                });

                console.log('✅ OCR解析成功:', {
                    recordId: ocrRecord.id,
                    confidence: parseResult.data.overallConfidence,
                    merchant: parseResult.data.merchant,
                    amount: parseResult.data.amount
                });

                res.status(200).json({
                    success: true,
                    message: parseResult.message,
                    data: {
                        recordId: updatedRecord.id,
                        parsedData: parseResult.data,
                        confidence: parseResult.data.overallConfidence,
                        suggestions: {
                            shouldAutoCreate: parseResult.data.overallConfidence > 0.8,
                            needsReview: parseResult.data.overallConfidence < 0.6
                        }
                    }
                });

            } catch (parseError) {
                console.error('❌ OCR解析过程出错:', parseError);
                
                // 标记为失败
                await OCRRecord.markAsFailed(ocrRecord.id, userId, parseError.message);
                
                res.status(500).json({
                    success: false,
                    message: '解析过程中发生错误',
                    error: parseError.message,
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
                error: error.message
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
            const userId = req.user.id;

            console.log('📱 收到OCR自动解析请求:', { 
                userId, 
                textLength: text?.length,
                autoCreateThreshold 
            });

            // 验证输入
            if (!text || typeof text !== 'string' || text.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    message: '请提供有效的OCR文本'
                });
            }

            // 创建OCR记录
            const ocrRecord = await OCRRecord.create(userId, text, {
                status: 'processing'
            });

            try {
                // 解析OCR文本
                const parseResult = await OCRParser.parseText(text, options);

                if (!parseResult.success) {
                    // 标记为失败
                    await OCRRecord.markAsFailed(ocrRecord.id, userId, parseResult.error);
                    
                    return res.status(400).json({
                        success: false,
                        message: '文本解析失败',
                        error: parseResult.error,
                        data: {
                            recordId: ocrRecord.id
                        }
                    });
                }

                // 更新OCR记录
                const updatedRecord = await OCRRecord.updateById(ocrRecord.id, userId, {
                    parsedData: parseResult.data,
                    confidenceScore: parseResult.data.overallConfidence,
                    status: 'success'
                });

                const confidence = parseResult.data.overallConfidence;
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
                            amount: parseResult.data.amount?.value || 0,
                            category: parseResult.data.category?.value || '其他',
                            description: parseResult.data.merchant?.name || parseResult.data.description || '自动识别记录',
                            date: parseResult.data.date?.value || new Date().toISOString(),
                            location: parseResult.data.location || '',
                            paymentMethod: parseResult.data.paymentMethod?.value || 'cash',
                            tags: ['自动创建', 'OCR识别']
                        };

                        const expense = await Expense.create(userId, expenseData);

                        // 标记OCR记录为已确认
                        await OCRRecord.markAsConfirmed(ocrRecord.id, userId, expense.id);

                        console.log('🚀 自动创建支出记录成功:', {
                            recordId: ocrRecord.id,
                            expenseId: expense.id,
                            amount: expense.amount,
                            confidence: confidence
                        });

                        return res.status(201).json({
                            success: true,
                            message: '自动识别并创建支出记录成功',
                            data: {
                                autoCreated: true,
                                expense: expense.toJSON(),
                                ocrRecord: {
                                    id: updatedRecord.id,
                                    status: 'confirmed',
                                    expenseId: expense.id
                                },
                                confidence: confidence,
                                parsedData: parseResult.data
                            }
                        });

                    } catch (expenseError) {
                        console.error('❌ 自动创建支出记录失败:', expenseError);
                        
                        // 自动创建失败，返回解析结果让用户手动确认
                        return res.status(200).json({
                            success: true,
                            message: '解析成功，但自动创建失败，需要手动确认',
                            data: {
                                autoCreated: false,
                                recordId: updatedRecord.id,
                                parsedData: parseResult.data,
                                confidence: confidence,
                                error: expenseError.message,
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
                    return res.status(200).json({
                        success: true,
                        message: '解析成功，需要用户确认',
                        data: {
                            autoCreated: false,
                            recordId: updatedRecord.id,
                            parsedData: parseResult.data,
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
                await OCRRecord.markAsFailed(ocrRecord.id, userId, parseError.message);
                
                return res.status(500).json({
                    success: false,
                    message: '解析过程中发生错误',
                    error: parseError.message,
                    data: {
                        recordId: ocrRecord.id
                    }
                });
            }

        } catch (error) {
            console.error('❌ OCR自动解析请求失败:', error);
            res.status(500).json({
                success: false,
                message: '服务器内部错误',
                error: error.message
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
            const userId = req.user.id;
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
                    message: 'OCR记录不存在'
                });
            }

            if (ocrRecord.status === 'confirmed') {
                return res.status(400).json({
                    success: false,
                    message: 'OCR记录已经被确认过了'
                });
            }

            // 验证必填字段
            if (!amount || amount <= 0) {
                return res.status(400).json({
                    success: false,
                    message: '请输入有效的金额'
                });
            }

            if (!category || !description) {
                return res.status(400).json({
                    success: false,
                    message: '分类和描述不能为空'
                });
            }

            // 创建支出记录
            const expenseData = {
                amount: parseFloat(amount),
                category,
                description,
                date: date || new Date().toISOString(),
                location: location || '',
                paymentMethod: paymentMethod || 'cash',
                tags: Array.isArray(tags) ? tags : []
            };

            const expense = await Expense.create(userId, expenseData);

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
            const userId = req.user.id;
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
            const userId = req.user.id;

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
            const userId = req.user.id;

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
            const userId = req.user.id;

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
            const userId = req.user.id;
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