# 前端API配置自动化指南

## 🎯 解决URL混淆问题的完整方案

### 📋 问题背景

之前遇到的问题：
- ❌ 前端使用错误URL：`expense-tracker-backend-mocrhvaay-likexin0304s-projects.vercel.app`
- ✅ 正确URL应该是：`expense-tracker-backend-1mnvyo1le-likexin0304s-projects.vercel.app`

### 🚀 自动化解决方案

#### 方案1：动态配置获取（推荐）

**Swift实现示例**：

```swift
import Foundation

// ✅ 自动化API配置管理
class APIConfigManager {
    static let shared = APIConfigManager()
    
    private var currentConfig: APIConfiguration?
    private let fallbackURL = "https://expense-tracker-backend-1mnvyo1le-likexin0304s-projects.vercel.app"
    
    // 配置数据模型
    struct APIConfiguration: Codable {
        let baseURL: String
        let environment: String
        let version: String
        let endpoints: [String: String]
        
        enum CodingKeys: String, CodingKey {
            case baseURL = "baseURL"
            case environment, version, endpoints
        }
    }
    
    // 动态获取配置
    func loadConfiguration() async throws {
        // 1. 尝试从多个可能的URL获取配置
        let possibleURLs = [
            "https://expense-tracker-backend-1mnvyo1le-likexin0304s-projects.vercel.app",
            "https://expense-tracker-backend-mocrhvaay-likexin0304s-projects.vercel.app",
            fallbackURL
        ]
        
        for baseURL in possibleURLs {
            do {
                let config = try await fetchConfig(from: baseURL)
                self.currentConfig = config
                print("✅ 成功获取配置: \\(config.baseURL)")
                return
            } catch {
                print("⚠️ 尝试URL失败: \\(baseURL) - \\(error)")
                continue
            }
        }
        
        throw APIError.configurationFailed
    }
    
    // 从指定URL获取配置
    private func fetchConfig(from baseURL: String) async throws -> APIConfiguration {
        let configURL = URL(string: "\\(baseURL)/api/config")!
        let (data, response) = try await URLSession.shared.data(from: configURL)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw APIError.invalidResponse
        }
        
        let configResponse = try JSONDecoder().decode(ConfigResponse.self, from: data)
        
        return APIConfiguration(
            baseURL: configResponse.data.api.baseURL,
            environment: configResponse.data.environment,
            version: configResponse.data.version,
            endpoints: [:]
        )
    }
    
    // 获取当前配置
    func getConfiguration() async -> APIConfiguration {
        if let config = currentConfig {
            return config
        }
        
        do {
            try await loadConfiguration()
            return currentConfig ?? APIConfiguration(
                baseURL: fallbackURL,
                environment: "production",
                version: "unknown",
                endpoints: [:]
            )
        } catch {
            print("❌ 配置加载失败，使用fallback: \\(error)")
            return APIConfiguration(
                baseURL: fallbackURL,
                environment: "production",
                version: "unknown",
                endpoints: [:]
            )
        }
    }
    
    // 获取API URL
    func getAPIURL(for endpoint: String) async -> String {
        let config = await getConfiguration()
        return "\\(config.baseURL)\\(endpoint)"
    }
}

// 配置响应模型
struct ConfigResponse: Codable {
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

// 错误类型
enum APIError: Error {
    case configurationFailed
    case invalidResponse
}
```

#### 方案2：环境检测配置

```swift
// ✅ 环境自动检测
class EnvironmentConfig {
    static func getBaseURL() -> String {
        #if DEBUG
            // 开发环境：优先使用本地，然后是开发服务器
            if isLocalServerRunning() {
                return "http://localhost:3000"
            } else {
                return "https://expense-tracker-backend-1mnvyo1le-likexin0304s-projects.vercel.app"
            }
        #else
            // 生产环境：使用生产服务器
            return "https://expense-tracker-backend-1mnvyo1le-likexin0304s-projects.vercel.app"
        #endif
    }
    
    private static func isLocalServerRunning() -> Bool {
        // 检测本地服务器是否运行
        let url = URL(string: "http://localhost:3000/health")!
        let semaphore = DispatchSemaphore(value: 0)
        var isRunning = false
        
        URLSession.shared.dataTask(with: url) { _, response, _ in
            if let httpResponse = response as? HTTPURLResponse,
               httpResponse.statusCode == 200 {
                isRunning = true
            }
            semaphore.signal()
        }.resume()
        
        _ = semaphore.wait(timeout: .now() + 2.0)
        return isRunning
    }
}
```

#### 方案3：配置缓存和更新

```swift
// ✅ 智能配置缓存
class SmartAPIConfig {
    private let userDefaults = UserDefaults.standard
    private let configCacheKey = "api_config_cache"
    private let lastUpdateKey = "config_last_update"
    private let cacheValidityHours: TimeInterval = 24 * 60 * 60 // 24小时
    
    func getCachedConfig() -> APIConfiguration? {
        guard let data = userDefaults.data(forKey: configCacheKey),
              let config = try? JSONDecoder().decode(APIConfiguration.self, from: data) else {
            return nil
        }
        
        let lastUpdate = userDefaults.double(forKey: lastUpdateKey)
        let now = Date().timeIntervalSince1970
        
        // 检查缓存是否过期
        if now - lastUpdate > cacheValidityHours {
            return nil
        }
        
        return config
    }
    
    func cacheConfig(_ config: APIConfiguration) {
        if let data = try? JSONEncoder().encode(config) {
            userDefaults.set(data, forKey: configCacheKey)
            userDefaults.set(Date().timeIntervalSince1970, forKey: lastUpdateKey)
        }
    }
    
    func getConfig() async -> APIConfiguration {
        // 1. 尝试使用缓存
        if let cached = getCachedConfig() {
            print("📱 使用缓存配置: \\(cached.baseURL)")
            return cached
        }
        
        // 2. 获取新配置
        let config = await APIConfigManager.shared.getConfiguration()
        
        // 3. 缓存新配置
        cacheConfig(config)
        
        return config
    }
}
```

### 🔧 使用方法

#### 在App启动时初始化

```swift
// AppDelegate.swift 或 App.swift
class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        
        // 异步初始化API配置
        Task {
            do {
                try await APIConfigManager.shared.loadConfiguration()
                print("✅ API配置初始化成功")
            } catch {
                print("⚠️ API配置初始化失败: \\(error)")
            }
        }
        
        return true
    }
}
```

#### 在网络请求中使用

```swift
// NetworkService.swift
class NetworkService {
    static func makeOCRRequest(text: String) async throws -> OCRResponse {
        // 自动获取正确的API URL
        let apiURL = await APIConfigManager.shared.getAPIURL(for: "/api/ocr/parse-auto")
        
        guard let url = URL(string: apiURL) else {
            throw NetworkError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let requestBody = ["text": text, "autoCreateThreshold": 0.8]
        request.httpBody = try JSONSerialization.data(withJSONObject: requestBody)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw NetworkError.serverError
        }
        
        return try JSONDecoder().decode(OCRResponse.self, from: data)
    }
}
```

### 📱 完整集成示例

```swift
// AutoExpenseService.swift - 更新版本
class AutoExpenseService {
    private let configManager = SmartAPIConfig()
    
    func processReceiptText(_ text: String, threshold: Double = 0.85) async throws -> AutoExpenseResult {
        // 1. 获取当前配置
        let config = await configManager.getConfig()
        print("🌐 使用API: \\(config.baseURL)")
        
        // 2. 构建请求
        let apiURL = "\\(config.baseURL)/api/ocr/parse-auto"
        guard let url = URL(string: apiURL) else {
            throw AutoExpenseError.invalidConfiguration
        }
        
        // 3. 发送请求
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \\(getAuthToken())", forHTTPHeaderField: "Authorization")
        
        let requestBody = [
            "text": text,
            "autoCreateThreshold": threshold
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: requestBody)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw AutoExpenseError.networkError
        }
        
        if httpResponse.statusCode == 200 {
            let ocrResponse = try JSONDecoder().decode(OCRAutoResponse.self, from: data)
            
            if ocrResponse.data.autoCreated {
                return .success(ocrResponse.data.expense!)
            } else {
                return .needsConfirmation(
                    recordId: ocrResponse.data.recordId,
                    parsedData: ocrResponse.data.parsedData
                )
            }
        } else {
            let errorResponse = try JSONDecoder().decode(ErrorResponse.self, from: data)
            throw AutoExpenseError.serverError(errorResponse.message)
        }
    }
    
    private func getAuthToken() -> String {
        // 从Keychain或其他安全存储获取token
        return UserDefaults.standard.string(forKey: "auth_token") ?? ""
    }
}
```

### 🔄 自动更新机制

```swift
// 定期检查配置更新
class ConfigUpdateService {
    static func scheduleConfigUpdate() {
        Timer.scheduledTimer(withTimeInterval: 3600, repeats: true) { _ in
            Task {
                try? await APIConfigManager.shared.loadConfiguration()
            }
        }
    }
}
```

### 📊 监控和调试

```swift
// 配置状态监控
extension APIConfigManager {
    func getConfigStatus() -> [String: Any] {
        return [
            "current_url": currentConfig?.baseURL ?? "未配置",
            "environment": currentConfig?.environment ?? "未知",
            "version": currentConfig?.version ?? "未知",
            "last_update": Date().description
        ]
    }
    
    func printConfigStatus() {
        let status = getConfigStatus()
        print("📊 API配置状态:")
        for (key, value) in status {
            print("   \\(key): \\(value)")
        }
    }
}
```

## 🎯 实施步骤

### 1. 立即实施（今天）
- [ ] 复制上述Swift代码到项目中
- [ ] 替换现有的硬编码API URL
- [ ] 测试动态配置获取

### 2. 短期优化（本周）
- [ ] 添加配置缓存机制
- [ ] 实现环境自动检测
- [ ] 添加错误处理和重试逻辑

### 3. 长期维护（持续）
- [ ] 监控配置更新频率
- [ ] 优化缓存策略
- [ ] 添加配置变更通知

## ✅ 验证方法

```bash
# 测试配置端点
curl https://expense-tracker-backend-1mnvyo1le-likexin0304s-projects.vercel.app/api/config

# 获取Swift配置代码
curl https://expense-tracker-backend-1mnvyo1le-likexin0304s-projects.vercel.app/api/config/swift
```

这样就彻底解决了URL混淆问题，并建立了自动化的配置管理机制！🚀
