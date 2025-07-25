/** 
 * Express应用程序主配置文件 
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// 导入路由模块
const authRoutes = require('./routes/auth');
const budgetRoutes = require('./routes/budget');
const expenseRoutes = require('./routes/expense');
const ocrRoutes = require('./routes/ocr');

const app = express();

console.log('🚀 正在启动服务器...');

// 🔧 信任代理服务器 - 修复Vercel/生产环境中的X-Forwarded-For错误
// 这对于正确的IP识别和rate limiting是必需的
app.set('trust proxy', true);

// 安全中间件
app.use(helmet());
app.use(cors());

// 限流中间件 - 优化配置以避免trust proxy警告
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 100, // 最多100个请求
    message: {
        success: false,
        message: '请求过于频繁，请稍后再试'
    },
    // 自定义IP获取逻辑，避免trust proxy警告
    keyGenerator: (req) => {
        // 在生产环境中使用X-Forwarded-For（由Vercel提供），开发环境使用真实IP
        if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-for']) {
            // 从X-Forwarded-For头部获取真实IP（取第一个IP）
            const forwarded = req.headers['x-forwarded-for'];
            return Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0].trim();
        }
        // 开发环境或没有代理头部时使用连接IP
        return req.connection.remoteAddress || req.socket.remoteAddress || req.ip || 'unknown';
    },
    // 跳过trust proxy验证，使用自定义keyGenerator
    skipSuccessfulRequests: false,
    skipFailedRequests: false
});
app.use(limiter);

// JSON解析错误处理中间件
app.use('/api', (req, res, next) => {
    // 只处理有body的请求
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
        const originalSend = res.send;
        res.send = function(data) {
            // 恢复原始send方法
            res.send = originalSend;
            return originalSend.call(this, data);
        };
    }
    next();
});

// 解析JSON - 添加自定义错误处理
app.use(express.json({ 
    limit: '10mb',
    verify: (req, res, buf, encoding) => {
        try {
            // 尝试基本验证
            const body = buf.toString(encoding || 'utf8');
            
            // 检查是否为base64编码的JSON (常见错误)
            if (body.startsWith('"') && body.endsWith('"')) {
                const innerContent = body.slice(1, -1);
                // 检查是否像base64
                if (/^[A-Za-z0-9+/=]+$/.test(innerContent) && innerContent.length % 4 === 0) {
                    try {
                        const decoded = Buffer.from(innerContent, 'base64').toString('utf8');
                        JSON.parse(decoded); // 验证解码后是否为有效JSON
                        // 如果解码成功，在错误中提供提示
                        req.__possibleBase64 = true;
                        req.__decodedContent = decoded;
                    } catch (e) {
                        // 不是base64编码的JSON，继续正常处理
                    }
                }
            }
        } catch (e) {
            // 验证失败，让express的JSON解析器处理
        }
    }
}));
app.use(express.urlencoded({ extended: true }));

// 请求日志中间件
app.use((req, res, next) => {
    console.log(`📝 ${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
});

// 健康检查
app.get('/health', (req, res) => {
    console.log('💚 健康检查');
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV || 'development'
    });
});

// 挂载路由 - 确保正确使用中间件
app.use('/api/auth', authRoutes);      // 认证路由
app.use('/api/budget', budgetRoutes);  // 预算路由
app.use('/api/expense', expenseRoutes); // 支出路由（注意路径是/expense单数形式）
app.use('/api/ocr', ocrRoutes);        // OCR自动识别路由

// API文档路由
app.get('/api/debug/routes', (req, res) => {
    res.json({
        message: '费用追踪后端API文档',
        requestFormat: {
            contentType: 'application/json',
            authHeader: 'Authorization: Bearer <your_jwt_token>',
            bodyFormat: 'JSON对象 (不要进行base64编码或双重字符串化)',
            example: {
                correct: '{"email": "user@example.com", "password": "password123"}',
                incorrect: [
                    '"eyJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20ifQ=="  // Base64编码',
                    '"{\\\"email\\\":\\\"user@example.com\\\"}"      // 双重字符串化',
                    '"{\"email\":\"user@example.com\"}"            // 字符串格式JSON'
                ]
            }
        },
        available_routes: [
            'GET /health',
            'GET /api/debug/routes',
            // 认证相关
            'POST /api/auth/register',
            'POST /api/auth/login',
            'GET /api/auth/me',
            'DELETE /api/auth/account',
            'GET /api/auth/debug/users (仅开发环境)',
            // 预算相关 (需要认证)
            'POST /api/budget',
            'GET /api/budget/current',
            'GET /api/budget/alerts',
            'GET /api/budget/suggestions',
            'GET /api/budget/history',
            'GET /api/budget/:year/:month',
            'DELETE /api/budget/:budgetId',
            // 支出相关 (需要认证)
            'POST /api/expense',
            'GET /api/expense',
            'GET /api/expense/stats',
            'GET /api/expense/categories',
            'GET /api/expense/export',
            'GET /api/expense/trends',
            'GET /api/expense/:id',
            'PUT /api/expense/:id',
            'DELETE /api/expense/:id',
            // OCR自动识别 (需要认证)
            'POST /api/ocr/parse',
            'POST /api/ocr/parse-auto (🆕 自动创建)',
            'POST /api/ocr/confirm/:recordId',
            'GET /api/ocr/records',
            'GET /api/ocr/records/:recordId',
            'DELETE /api/ocr/records/:recordId',
            'GET /api/ocr/statistics',
            'GET /api/ocr/merchants',
            'POST /api/ocr/merchants/match',
            'GET /api/ocr/shortcuts/generate (🆕 iOS快捷指令)'
        ],
        errorHandling: {
            jsonParseErrors: '会提供详细的格式错误提示和修复建议',
            authErrors: '会提供认证相关的错误信息',
            validationErrors: '会提供字段验证错误详情'
        }
    });
});

// 智能路径重定向中间件 - 处理重复的/api前缀
app.use((req, res, next) => {
    // 检测 /api/api/ 路径模式
    if (req.originalUrl.startsWith('/api/api/')) {
        const correctedPath = req.originalUrl.replace('/api/api/', '/api/');
        console.log(`🔧 检测到重复路径: ${req.originalUrl} -> ${correctedPath}`);
        
        // 返回详细的错误信息和修复指导
        return res.status(400).json({
            success: false,
            error: 'URL_PATH_DUPLICATE',
            message: '检测到重复的API路径前缀',
            details: {
                received: req.originalUrl,
                correct: correctedPath,
                problem: '您的请求URL包含重复的/api前缀',
                solution: '请检查前端代码中的API基础URL配置'
            },
            ios_client_fix: {
                description: 'iOS客户端推荐的修复方法',
                recommended_approach: {
                    title: '使用APIConfig.Endpoint枚举（推荐）',
                    code: `
// ✅ 推荐的API配置方式
struct APIConfig {
    static let baseURL = "https://your-domain.com"
    
    enum Endpoint: String {
        case ocrParse = "/api/ocr/parse"
        case ocrParseAuto = "/api/ocr/parse-auto"
        case ocrShortcuts = "/api/ocr/shortcuts/generate"
        case authLogin = "/api/auth/login"
        case authRegister = "/api/auth/register"
        
        var fullURL: String {
            return APIConfig.baseURL + self.rawValue
        }
    }
}

// ✅ 正确的API调用方式
let url = APIConfig.Endpoint.ocrParseAuto.fullURL
                    `
                },
                common_mistakes: [
                    {
                        problem: 'baseURL已包含/api，但又添加了/api前缀',
                        wrong: 'let baseURL = "https://domain.com/api"\nlet url = baseURL + "/api/ocr/parse"',
                        correct: 'let baseURL = "https://domain.com"\nlet url = baseURL + "/api/ocr/parse"'
                    },
                    {
                        problem: '硬编码了重复的/api路径',
                        wrong: 'let endpoint = "/api/api/ocr/parse"',
                        correct: 'let endpoint = "/api/ocr/parse"'
                    },
                    {
                        problem: 'URL字符串拼接错误',
                        wrong: 'let url = "\\(baseURL)/api/api/ocr/parse"',
                        correct: 'let url = "\\(baseURL)/api/ocr/parse"'
                    }
                ]
            },
            help: {
                correct_url: correctedPath,
                test_command: `curl -X ${req.method} http://localhost:3000${correctedPath}`,
                documentation: '/api/debug/routes'
            }
        });
    }
    next();
});

// 404处理
app.use((req, res, next) => {
    console.log(`❌ 404: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
        success: false,
        message: `路由 ${req.originalUrl} 不存在`,
        available_routes: '/api/debug/routes'
    });
});

// 全局错误处理
app.use((error, req, res, next) => {
    console.error('💥 全局错误:', error);
    
    // JSON解析错误的特殊处理
    if (error.type === 'entity.parse.failed' || error.name === 'SyntaxError') {
        let errorMessage = '请求体格式错误：无法解析JSON数据';
        let suggestions = [];
        
        // 检查是否可能是base64编码问题
        if (req.__possibleBase64 && req.__decodedContent) {
            errorMessage = '检测到Base64编码的JSON数据';
            suggestions = [
                '请直接发送JSON对象，不要进行Base64编码',
                '正确格式示例: {"key": "value"}',
                `检测到的原始数据: ${req.__decodedContent}`
            ];
        } else if (error.body && typeof error.body === 'string') {
            // 分析其他常见错误
            if (error.body.includes('\\"')) {
                errorMessage = '检测到双重JSON字符串化';
                suggestions = [
                    '请避免对JSON进行双重字符串化',
                    '使用 JSON.stringify(object) 而不是 JSON.stringify(JSON.stringify(object))'
                ];
            } else if (error.body.startsWith('"') && error.body.endsWith('"')) {
                errorMessage = '检测到字符串格式的JSON';
                suggestions = [
                    '请发送JSON对象而不是JSON字符串',
                    '移除外层的引号包装'
                ];
            }
        }
        
        return res.status(400).json({
            success: false,
            message: errorMessage,
            error: {
                type: 'JSON_PARSE_ERROR',
                details: error.message,
                suggestions: suggestions,
                receivedBody: process.env.NODE_ENV === 'development' ? error.body : undefined
            },
            help: {
                correctFormat: 'Content-Type: application/json + JSON object in body',
                example: '{"email": "user@example.com", "password": "yourpassword"}',
                documentation: '/api/debug/routes'
            }
        });
    }
    
    // 其他类型的错误
    res.status(error.status || 500).json({
        success: false,
        message: error.status === 400 ? '请求参数错误' : '服务器内部错误',
        ...(process.env.NODE_ENV === 'development' && { 
            error: error.message,
            stack: error.stack 
        })
    });
});

console.log('✅ 服务器配置完成');

module.exports = app;