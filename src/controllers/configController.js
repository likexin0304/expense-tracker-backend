/**
 * 配置控制器 - 提供动态配置信息
 * 解决前端API URL配置问题
 */

/**
 * 获取API配置信息
 * GET /api/config
 */
exports.getConfig = async (req, res) => {
    try {
        // 获取当前部署信息
        const deploymentUrl = req.get('host');
        const protocol = req.get('x-forwarded-proto') || req.protocol || 'https';
        const baseURL = `${protocol}://${deploymentUrl}`;
        
        // 检测环境
        const environment = process.env.NODE_ENV || 'development';
        const isProduction = environment === 'production';
        const isLocal = deploymentUrl.includes('localhost');
        
        // 版本信息
        const version = process.env.npm_package_version || '1.0.12';
        const deployTime = new Date().toISOString();
        
        // API端点配置
        const endpoints = {
            health: '/health',
            auth: {
                register: '/api/auth/register',
                login: '/api/auth/login',
                logout: '/api/auth/logout',
                refresh: '/api/auth/refresh'
            },
            expense: {
                list: '/api/expense',
                create: '/api/expense',
                update: '/api/expense/:id',
                delete: '/api/expense/:id'
            },
            budget: {
                list: '/api/budget',
                create: '/api/budget',
                update: '/api/budget/:id',
                delete: '/api/budget/:id'
            },
            ocr: {
                parse: '/api/ocr/parse',
                parseAuto: '/api/ocr/parse-auto',
                confirm: '/api/ocr/confirm/:recordId',
                records: '/api/ocr/records',
                merchants: '/api/ocr/merchants',
                shortcuts: '/api/ocr/shortcuts/generate'
            }
        };

        // 推荐的API配置
        const recommendedConfig = {
            baseURL: baseURL,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };

        // 环境特定配置
        const environmentConfig = {
            development: {
                baseURL: 'http://localhost:3000',
                debug: true,
                timeout: 10000
            },
            production: {
                baseURL: baseURL,
                debug: false,
                timeout: 30000
            }
        };

        const config = {
            success: true,
            data: {
                // 基础信息
                environment: environment,
                version: version,
                deployTime: deployTime,
                isProduction: isProduction,
                isLocal: isLocal,
                
                // API配置
                api: {
                    baseURL: baseURL,
                    endpoints: endpoints,
                    recommended: recommendedConfig
                },
                
                // 环境配置
                environments: environmentConfig,
                
                // 当前推荐配置
                current: environmentConfig[environment] || environmentConfig.production,
                
                // 部署信息
                deployment: {
                    url: baseURL,
                    host: deploymentUrl,
                    protocol: protocol,
                    vercelRegion: process.env.VERCEL_REGION || 'unknown',
                    vercelUrl: process.env.VERCEL_URL || deploymentUrl
                },
                
                // 健康检查
                health: {
                    status: 'OK',
                    uptime: process.uptime(),
                    timestamp: new Date().toISOString()
                }
            }
        };

        // 添加CORS头部
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET');
        res.header('Access-Control-Allow-Headers', 'Content-Type');
        
        res.status(200).json(config);
        
    } catch (error) {
        console.error('❌ 获取配置失败:', error);
        res.status(500).json({
            success: false,
            message: '获取配置失败',
            error: error.message
        });
    }
};

/**
 * 获取Swift配置代码
 * GET /api/config/swift
 */
exports.getSwiftConfig = async (req, res) => {
    try {
        const deploymentUrl = req.get('host');
        const protocol = req.get('x-forwarded-proto') || req.protocol || 'https';
        const baseURL = `${protocol}://${deploymentUrl}`;
        
        const swiftCode = `
// ✅ 动态API配置 - 自动获取正确的API URL
import Foundation

struct APIConfig {
    static var baseURL: String = ""
    static var isConfigured: Bool = false
    
    // 静态配置作为fallback
    private static let fallbackURL = "${baseURL}"
    
    // 动态获取配置
    static func configure() async {
        do {
            let config = try await fetchDynamicConfig()
            self.baseURL = config.api.baseURL
            self.isConfigured = true
            print("✅ API配置已更新: \\(self.baseURL)")
        } catch {
            print("⚠️ 动态配置获取失败，使用fallback: \\(error)")
            self.baseURL = fallbackURL
            self.isConfigured = true
        }
    }
    
    // 获取动态配置
    private static func fetchDynamicConfig() async throws -> APIConfigResponse {
        let url = URL(string: "\\(fallbackURL)/api/config")!
        let (data, _) = try await URLSession.shared.data(from: url)
        return try JSONDecoder().decode(APIConfigResponse.self, from: data)
    }
    
    // 确保配置已加载
    static func ensureConfigured() async {
        if !isConfigured {
            await configure()
        }
    }
    
    enum Endpoint: String {
        case health = "/health"
        case authRegister = "/api/auth/register"
        case authLogin = "/api/auth/login"
        case ocrParseAuto = "/api/ocr/parse-auto"
        case ocrConfirm = "/api/ocr/confirm"
        
        var url: String {
            return APIConfig.baseURL + self.rawValue
        }
    }
}

// 配置响应模型
struct APIConfigResponse: Codable {
    let success: Bool
    let data: ConfigData
    
    struct ConfigData: Codable {
        let api: APIInfo
        let environment: String
        let version: String
        
        struct APIInfo: Codable {
            let baseURL: String
        }
    }
}

// 使用示例
class NetworkService {
    static func makeRequest() async {
        // 确保配置已加载
        await APIConfig.ensureConfigured()
        
        // 使用动态配置的URL
        let url = APIConfig.Endpoint.ocrParseAuto.url
        print("🌐 使用API URL: \\(url)")
    }
}
`;

        res.header('Content-Type', 'text/plain');
        res.header('Access-Control-Allow-Origin', '*');
        res.status(200).send(swiftCode.trim());
        
    } catch (error) {
        console.error('❌ 生成Swift配置失败:', error);
        res.status(500).json({
            success: false,
            message: '生成Swift配置失败',
            error: error.message
        });
    }
};
