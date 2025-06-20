# iOS 费用追踪应用 - 后端集成完整指南

## 📋 目录
- [项目概述](#项目概述)
- [后端架构说明](#后端架构说明)
- [环境配置](#环境配置)
- [Supabase 集成](#supabase-集成)
- [认证系统集成](#认证系统集成)
- [数据模型](#数据模型)
- [API 集成示例](#api-集成示例)
- [错误处理](#错误处理)
- [安全注意事项](#安全注意事项)
- [测试和调试](#测试和调试)
- [部署信息](#部署信息)

## 项目概述

### 🏗️ 后端技术栈
- **框架**: Node.js + Express.js
- **数据库**: Supabase PostgreSQL
- **认证**: Supabase Auth + 自定义用户管理
- **令牌类型**: Supabase JWT Access Token
- **部署**: Vercel
- **API 风格**: RESTful API

### 🌐 环境地址
- **生产环境**: https://expense-tracker-backend-ccuxsyehj-likexin0304s-projects.vercel.app/
- **开发环境**: http://localhost:3000 (本地开发时)
- **API 文档**: `/api/debug/routes` 端点

### 📊 功能支持
- ✅ 用户注册/登录/注销
- ✅ 支出记录的增删改查
- ✅ 预算管理
- ✅ 数据统计和趋势分析
- ✅ 数据导出 (JSON/CSV)
- ✅ 分类管理
- ✅ 实时数据同步

## 后端架构说明

### 🔄 数据流架构
```
iOS 应用 ↔ Node.js API ↔ Supabase 数据库
    ↓           ↓              ↓
 用户界面    业务逻辑        数据存储
```

### 🛡️ 安全架构
- **认证**: Supabase Auth + 自定义认证中间件
- **令牌**: Supabase JWT Access Token
- **授权**: 自定义权限控制 + RLS
- **用户管理**: 自定义User模型 + Supabase profiles表
- **数据验证**: 后端 + 数据库双重验证
- **API 限流**: 每15分钟100次请求
- **令牌黑名单**: 支持令牌失效机制

### 📁 数据库表结构
- `profiles`: 用户扩展信息
- `expenses`: 支出记录
- `budgets`: 预算管理

## 环境配置

### 1. Supabase 项目信息
```swift
// 配置常量
struct SupabaseConfig {
    static let url = "https://nlrtjnvwgsaavtpfccxg.supabase.co"
    static let anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5scnRqbnZ3Z3NhYXZ0cGZjY3hnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwNzU3MDgsImV4cCI6MjA2NTY1MTcwOH0.5r2tzDOV1T1Lkz_Mtujq35VBBfo77SCh6H__rUSHQCo"
}
```

### 2. API 基础配置
```swift
struct APIConfig {
    static let baseURL = "https://expense-tracker-backend-ccuxsyehj-likexin0304s-projects.vercel.app"
    static let timeout: TimeInterval = 30.0
}
```

### 3. Info.plist 配置
```xml
<key>SUPABASE_URL</key>
<string>https://nlrtjnvwgsaavtpfccxg.supabase.co</string>
<key>SUPABASE_ANON_KEY</key>
<string>eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5scnRqbnZ3Z3NhYXZ0cGZjY3hnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwNzU3MDgsImV4cCI6MjA2NTY1MTcwOH0.5r2tzDOV1T1Lkz_Mtujq35VBBfo77SCh6H__rUSHQCo</string>
<key>API_BASE_URL</key>
<string>https://expense-tracker-backend-ccuxsyehj-likexin0304s-projects.vercel.app</string>
```

## Supabase 集成

### 1. Swift Package Manager 依赖
在 Xcode 中添加以下包：
```
https://github.com/supabase-community/supabase-swift
```

### 2. Supabase 客户端初始化
```swift
import Foundation
import Supabase

class SupabaseManager: ObservableObject {
    static let shared = SupabaseManager()
    
    let client: SupabaseClient
    
    private init() {
        guard let supabaseUrl = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_URL") as? String,
              let supabaseAnonKey = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_ANON_KEY") as? String,
              let url = URL(string: supabaseUrl) else {
            fatalError("无法加载 Supabase 配置，请检查 Info.plist")
        }
        
        client = SupabaseClient(supabaseURL: url, supabaseKey: supabaseAnonKey)
    }
}
```

### 3. 实时数据订阅示例
```swift
class ExpenseViewModel: ObservableObject {
    @Published var expenses: [Expense] = []
    private var subscription: RealtimeChannel?
    
    func subscribeToExpenseChanges() {
        subscription = SupabaseManager.shared.client
            .channel("expenses_changes")
            .on(.all) { [weak self] message in
                DispatchQueue.main.async {
                    self?.fetchExpenses()
                }
            }
            .subscribe()
    }
    
    deinit {
        subscription?.unsubscribe()
    }
}
```

## 认证系统集成

### 🔐 认证架构说明

本项目使用 **混合认证架构**：
- **Supabase Auth**: 处理用户认证和令牌生成
- **自定义后端**: 处理用户管理和业务逻辑
- **令牌验证**: 后端使用Supabase API验证令牌
- **用户数据**: 存储在Supabase数据库的profiles表中

### 1. 认证管理器
```swift
import Foundation
import Supabase

class AuthManager: ObservableObject {
    @Published var isAuthenticated = false
    @Published var currentUser: User?
    
    private let supabase = SupabaseManager.shared.client
    
    init() {
        checkAuthStatus()
    }
    
    // 检查认证状态
    func checkAuthStatus() {
        Task {
            do {
                let user = try await supabase.auth.user()
                DispatchQueue.main.async {
                    self.currentUser = user
                    self.isAuthenticated = true
                }
            } catch {
                DispatchQueue.main.async {
                    self.isAuthenticated = false
                    self.currentUser = nil
                }
            }
        }
    }
    
    // 用户注册 - 使用后端API
    func signUp(email: String, password: String, confirmPassword: String) async throws {
        let registerData = [
            "email": email,
            "password": password,
            "confirmPassword": confirmPassword
        ]
        
        let jsonData = try JSONSerialization.data(withJSONObject: registerData)
        
        var request = URLRequest(url: URL(string: "\(APIConfig.baseURL)/api/auth/register")!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = jsonData
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 201 else {
            throw AuthError.registrationFailed
        }
        
        let apiResponse = try JSONDecoder().decode(APIResponse<AuthResponseData>.self, from: data)
        
        if let userData = apiResponse.data {
            DispatchQueue.main.async {
                self.currentUser = userData.user
                self.isAuthenticated = true
                // 保存令牌供后续API调用使用
                UserDefaults.standard.set(userData.token, forKey: "access_token")
            }
        }
    }
    
    // 用户登录 - 使用后端API
    func signIn(email: String, password: String) async throws {
        let loginData = [
            "email": email,
            "password": password
        ]
        
        let jsonData = try JSONSerialization.data(withJSONObject: loginData)
        
        var request = URLRequest(url: URL(string: "\(APIConfig.baseURL)/api/auth/login")!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = jsonData
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw AuthError.loginFailed
        }
        
        let apiResponse = try JSONDecoder().decode(APIResponse<AuthResponseData>.self, from: data)
        
        if let userData = apiResponse.data {
            DispatchQueue.main.async {
                self.currentUser = userData.user
                self.isAuthenticated = true
                // 保存令牌供后续API调用使用
                UserDefaults.standard.set(userData.token, forKey: "access_token")
            }
        }
    }
    
    // 用户登出
    func signOut() async throws {
        DispatchQueue.main.async {
            self.currentUser = nil
            self.isAuthenticated = false
            // 清除本地保存的令牌
            UserDefaults.standard.removeObject(forKey: "access_token")
        }
    }
}
```

### 2. 认证状态监听
```swift
class AuthStateListener: ObservableObject {
    @Published var authState: AuthChangeEvent = .signedOut
    
    init() {
        SupabaseManager.shared.client.auth.onAuthStateChange { [weak self] event, session in
            DispatchQueue.main.async {
                self?.authState = event
            }
        }
    }
}
```

## 数据模型

### 1. 基础数据模型
```swift
import Foundation

// 用户模型 - 修正版
struct User: Codable, Identifiable {
    let id: String  // 修正：使用String而不是UUID
    let email: String
    let createdAt: String  // 修正：使用String处理ISO8601日期
    let updatedAt: String
    
    enum CodingKeys: String, CodingKey {
        case id, email
        case createdAt = "createdAt"
        case updatedAt = "updatedAt"
    }
}

// 支出记录模型 - 修正版
struct Expense: Codable, Identifiable {
    let id: String  // 修正：使用String而不是UUID
    let userId: String  // 修正：使用String而不是UUID
    let amount: Double  // 修正：使用Double而不是Decimal
    let category: String
    let description: String
    let date: String  // 修正：使用String处理日期
    let location: String?
    let paymentMethod: String
    let tags: [String]
    let createdAt: String  // 修正：使用String处理ISO8601日期
    let updatedAt: String
    
    enum CodingKeys: String, CodingKey {
        case id
        case userId = "userId"  // 修正：匹配后端字段名
        case amount, category, description, date, location
        case paymentMethod = "paymentMethod"  // 修正：匹配后端字段名
        case tags
        case createdAt = "createdAt"
        case updatedAt = "updatedAt"
    }
}

// 预算模型 - 修正版
struct Budget: Codable, Identifiable {
    let id: String  // 修正：使用String而不是UUID
    let userId: String  // 修正：使用String而不是UUID
    let amount: Double  // 修正：使用Double而不是Decimal
    let year: Int
    let month: Int
    let createdAt: String  // 修正：使用String处理ISO8601日期
    let updatedAt: String
    
    enum CodingKeys: String, CodingKey {
        case id
        case userId = "userId"  // 修正：匹配后端字段名
        case amount, year, month
        case createdAt = "createdAt"
        case updatedAt = "updatedAt"
    }
}

// 创建支出记录的输入模型
struct ExpenseCreate: Codable {
    let amount: Double  // 修正：使用Double而不是Decimal
    let category: String
    let description: String
    let date: String?  // 修正：使用String处理日期
    let location: String?
    let paymentMethod: String?
    let tags: [String]?
    
    enum CodingKeys: String, CodingKey {
        case amount, category, description, date, location
        case paymentMethod = "paymentMethod"  // 修正：匹配后端字段名
        case tags
    }
}

// 预算状态模型
struct BudgetStatus: Codable {
    let budget: Budget?
    let statistics: BudgetStatistics
}

// 预算统计模型
struct BudgetStatistics: Codable {
    let budgetAmount: Double
    let totalExpenses: Double
    let remainingBudget: Double
    let usagePercentage: Double
    let year: Int
    let month: Int
}
```

### 2. API 响应模型
```swift
// 通用 API 响应
struct APIResponse<T: Codable>: Codable {
    let success: Bool
    let message: String
    let data: T?
}

// 认证相关响应模型 - 匹配后端API响应结构
struct AuthResponseData: Codable {
    let user: User
    let token: String
}

// 注意：实际API返回的是 APIResponse<AuthResponseData> 格式
// 即：{ "success": true, "message": "...", "data": { "user": {...}, "token": "..." } }

// 认证错误类型
enum AuthError: Error {
    case registrationFailed
    case loginFailed
    case invalidCredentials
    case networkError
}

// 分页响应
struct PaginatedResponse<T: Codable>: Codable {
    let items: [T]
    let pagination: Pagination
    
    struct Pagination: Codable {
        let current: Int
        let pages: Int
        let total: Int
        let limit: Int
    }
}
```

## API 集成示例

### 1. 网络服务基类
```swift
import Foundation

class APIService {
    static let shared = APIService()
    
    private let baseURL: String
    private let session: URLSession
    
    private init() {
        self.baseURL = Bundle.main.object(forInfoDictionaryKey: "API_BASE_URL") as? String ?? ""
        
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30.0
        config.timeoutIntervalForResource = 60.0
        self.session = URLSession(configuration: config)
    }
    
    // 通用请求方法
    func request<T: Codable>(
        endpoint: String,
        method: HTTPMethod = .GET,
        body: Data? = nil,
        responseType: T.Type
    ) async throws -> T {
        guard let url = URL(string: baseURL + endpoint) else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = method.rawValue
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        // 添加认证头 - 使用本地存储的令牌
        if let token = UserDefaults.standard.string(forKey: "access_token") {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        if let body = body {
            request.httpBody = body
        }
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        guard 200...299 ~= httpResponse.statusCode else {
            throw APIError.serverError(httpResponse.statusCode)
        }
        
        do {
            return try JSONDecoder().decode(T.self, from: data)
        } catch {
            throw APIError.decodingError(error)
        }
    }
}

enum HTTPMethod: String {
    case GET = "GET"
    case POST = "POST"
    case PUT = "PUT"
    case DELETE = "DELETE"
}

enum APIError: Error {
    case invalidURL
    case invalidResponse
    case serverError(Int)
    case decodingError(Error)
    case noData
}
```

### 2. 支出记录服务
```swift
class ExpenseService {
    private let apiService = APIService.shared
    
    // 获取支出列表
    func getExpenses(
        page: Int = 1,
        limit: Int = 20,
        category: String? = nil,
        startDate: Date? = nil,
        endDate: Date? = nil
    ) async throws -> PaginatedResponse<Expense> {
        var queryItems: [URLQueryItem] = [
            URLQueryItem(name: "page", value: "\(page)"),
            URLQueryItem(name: "limit", value: "\(limit)")
        ]
        
        if let category = category {
            queryItems.append(URLQueryItem(name: "category", value: category))
        }
        
        if let startDate = startDate {
            queryItems.append(URLQueryItem(name: "startDate", value: ISO8601DateFormatter().string(from: startDate)))
        }
        
        if let endDate = endDate {
            queryItems.append(URLQueryItem(name: "endDate", value: ISO8601DateFormatter().string(from: endDate)))
        }
        
        var urlComponents = URLComponents()
        urlComponents.queryItems = queryItems
        let queryString = urlComponents.url?.query ?? ""
        
        let response: APIResponse<PaginatedResponse<Expense>> = try await apiService.request(
            endpoint: "/api/expense?\(queryString)",
            responseType: APIResponse<PaginatedResponse<Expense>>.self
        )
        
        guard let data = response.data else {
            throw APIError.noData
        }
        
        return data
    }
    
    // 创建支出记录
    func createExpense(_ expense: ExpenseCreate) async throws -> Expense {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        let body = try encoder.encode(expense)
        
        let response: APIResponse<Expense> = try await apiService.request(
            endpoint: "/api/expense",
            method: .POST,
            body: body,
            responseType: APIResponse<Expense>.self
        )
        
        guard let data = response.data else {
            throw APIError.noData
        }
        
        return data
    }
    
    // 更新支出记录
    func updateExpense(id: UUID, expense: ExpenseCreate) async throws -> Expense {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        let body = try encoder.encode(expense)
        
        let response: APIResponse<Expense> = try await apiService.request(
            endpoint: "/api/expense/\(id)",
            method: .PUT,
            body: body,
            responseType: APIResponse<Expense>.self
        )
        
        guard let data = response.data else {
            throw APIError.noData
        }
        
        return data
    }
    
    // 删除支出记录
    func deleteExpense(id: UUID) async throws {
        let _: APIResponse<String> = try await apiService.request(
            endpoint: "/api/expense/\(id)",
            method: .DELETE,
            responseType: APIResponse<String>.self
        )
    }
}
```

### 3. 预算服务
```swift
class BudgetService {
    private let apiService = APIService.shared
    
    // 获取当前预算状态
    func getCurrentBudget() async throws -> BudgetStatus {
        let response: APIResponse<BudgetStatus> = try await apiService.request(
            endpoint: "/api/budget/current",
            responseType: APIResponse<BudgetStatus>.self
        )
        
        guard let data = response.data else {
            throw APIError.noData
        }
        
        return data
    }
    
    // 设置预算
    func setBudget(amount: Decimal, year: Int? = nil, month: Int? = nil) async throws -> Budget {
        let budgetData: [String: Any] = [
            "amount": amount,
            "year": year ?? Calendar.current.component(.year, from: Date()),
            "month": month ?? Calendar.current.component(.month, from: Date())
        ]
        
        let body = try JSONSerialization.data(withJSONObject: budgetData)
        
        let response: APIResponse<Budget> = try await apiService.request(
            endpoint: "/api/budget",
            method: .POST,
            body: body,
            responseType: APIResponse<Budget>.self
        )
        
        guard let data = response.data else {
            throw APIError.noData
        }
        
        return data
    }
}

struct BudgetStatus: Codable {
    let budget: Budget?
    let statistics: BudgetStatistics
}

struct BudgetStatistics: Codable {
    let budgetAmount: Decimal
    let totalExpenses: Decimal
    let remainingBudget: Decimal
    let usagePercentage: Double
    let year: Int
    let month: Int
    
    enum CodingKeys: String, CodingKey {
        case budgetAmount = "budget_amount"
        case totalExpenses = "total_expenses"
        case remainingBudget = "remaining_budget"
        case usagePercentage = "usage_percentage"
        case year, month
    }
}
```

## 错误处理

### 1. 自定义错误类型
```swift
enum ExpenseAppError: LocalizedError {
    case networkError(Error)
    case authenticationRequired
    case invalidInput(String)
    case serverError(String)
    case unknownError
    
    var errorDescription: String? {
        switch self {
        case .networkError(let error):
            return "网络错误: \(error.localizedDescription)"
        case .authenticationRequired:
            return "请先登录"
        case .invalidInput(let message):
            return "输入错误: \(message)"
        case .serverError(let message):
            return "服务器错误: \(message)"
        case .unknownError:
            return "未知错误"
        }
    }
}
```

### 2. 错误处理中间件
```swift
class ErrorHandler: ObservableObject {
    @Published var currentError: ExpenseAppError?
    @Published var showingError = false
    
    func handle(_ error: Error) {
        DispatchQueue.main.async {
            if let apiError = error as? APIError {
                switch apiError {
                case .serverError(401):
                    self.currentError = .authenticationRequired
                case .serverError(let code):
                    self.currentError = .serverError("HTTP \(code)")
                default:
                    self.currentError = .networkError(error)
                }
            } else {
                self.currentError = .networkError(error)
            }
            self.showingError = true
        }
    }
}
```

## 安全注意事项

### 🔒 重要安全规则

1. **永远不要在客户端存储敏感信息**
   ```swift
   // ❌ 错误做法
   let serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   
   // ✅ 正确做法 - 只使用 anon key
   let anonKey = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_ANON_KEY") as? String
   ```

2. **使用 Keychain 存储敏感数据**
   ```swift
   import Security
   
   class KeychainManager {
       static func save(key: String, data: Data) -> Bool {
           let query: [String: Any] = [
               kSecClass as String: kSecClassGenericPassword,
               kSecAttrAccount as String: key,
               kSecValueData as String: data
           ]
           
           SecItemDelete(query as CFDictionary)
           return SecItemAdd(query as CFDictionary, nil) == noErr
       }
       
       static func load(key: String) -> Data? {
           let query: [String: Any] = [
               kSecClass as String: kSecClassGenericPassword,
               kSecAttrAccount as String: key,
               kSecReturnData as String: true
           ]
           
           var result: AnyObject?
           SecItemCopyMatching(query as CFDictionary, &result)
           return result as? Data
       }
   }
   ```

3. **输入验证**
   ```swift
   extension Decimal {
       var isValidAmount: Bool {
           return self > 0 && self < 1000000
       }
   }
   
   extension String {
       var isValidEmail: Bool {
           let emailRegex = "[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,64}"
           let emailPredicate = NSPredicate(format:"SELF MATCHES %@", emailRegex)
           return emailPredicate.evaluate(with: self)
       }
   }
   ```

## 测试和调试

### 1. 网络请求调试
```swift
class DebugAPIService: APIService {
    override func request<T: Codable>(
        endpoint: String,
        method: HTTPMethod = .GET,
        body: Data? = nil,
        responseType: T.Type
    ) async throws -> T {
        print("🌐 API Request: \(method.rawValue) \(endpoint)")
        
        if let body = body, let bodyString = String(data: body, encoding: .utf8) {
            print("📤 Request Body: \(bodyString)")
        }
        
        do {
            let result = try await super.request(
                endpoint: endpoint,
                method: method,
                body: body,
                responseType: responseType
            )
            print("✅ API Success: \(endpoint)")
            return result
        } catch {
            print("❌ API Error: \(endpoint) - \(error)")
            throw error
        }
    }
}
```

### 2. 健康检查
```swift
class HealthCheckService {
    func checkBackendHealth() async -> Bool {
        do {
            let response: [String: Any] = try await APIService.shared.request(
                endpoint: "/health",
                responseType: [String: Any].self
            )
            return response["status"] as? String == "OK"
        } catch {
            return false
        }
    }
}
```

## 部署信息

### 🚀 生产环境信息
- **API 基础 URL**: `https://expense-tracker-backend-ccuxsyehj-likexin0304s-projects.vercel.app`
- **健康检查**: `/health`
- **API 文档**: `/api/debug/routes`
- **部署平台**: Vercel
- **更新频率**: 代码推送后自动部署

### 📱 iOS 应用发布
- **目标平台**: App Store
- **开发者账号费用**: $99/年
- **最低 iOS 版本**: iOS 15.0+
- **支持设备**: iPhone, iPad

### 🔄 版本管理
建议在 iOS 应用中实现版本检查机制：
```swift
struct AppVersion {
    static let current = "1.0.0"
    static let minimumBackendVersion = "1.0.0"
    
    static func checkCompatibility() async -> Bool {
        // 实现版本兼容性检查
        return true
    }
}
```

---

## 📞 技术支持

如果在集成过程中遇到问题，请：

1. 检查本文档的相关章节
2. 查看 API 文档 (`/api/debug/routes`)
3. 检查网络连接和认证状态
4. 查看 Xcode 控制台输出

**文档版本**: v1.0  
**最后更新**: 2024-06-17  
**适用后端版本**: v2.0+ 