/**
 * 认证控制器
 * 处理用户注册、登录和身份验证的核心逻辑
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 简单的内存用户存储 - 在生产环境中应使用数据库
let users = [];
let currentId = 1;

/**
 * 生成JWT令牌
 * @param {number} userId - 用户ID
 * @returns {string} 生成的JWT令牌
 */
const generateToken = (userId) => {
    return jwt.sign(
        { userId },                               // 令牌载荷
        process.env.JWT_SECRET || 'default-secret', // 签名密钥
        { expiresIn: '7d' }                       // 7天过期
    );
};

/**
 * 用户注册控制器
 * 处理新用户注册逻辑
 */
exports.register = async (req, res) => {
    try {
        console.log('📝 注册请求:', req.body);
        
        // 从请求中提取用户信息
        const { email, password, confirmPassword } = req.body;

        // 验证必填字段
        if (!email || !password || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: '请填写所有必填字段'
            });
        }

        // 验证密码匹配
        if (password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: '两次输入的密码不一致'
            });
        }

        // 验证邮箱唯一性
        const existingUser = users.find(user => user.email === email);
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: '该邮箱已被注册'
            });
        }

        // 密码加密 - 使用bcrypt进行单向哈希
        const hashedPassword = await bcrypt.hash(password, 12);

        // 创建新用户对象
        const user = {
            id: currentId++,        // 分配新ID
            email,                  // 电子邮箱
            password: hashedPassword, // 哈希后的密码
            createdAt: new Date(),  // 创建时间
            updatedAt: new Date()   // 更新时间
        };

        // 保存用户到内存数组
        users.push(user);
        console.log('✅ 新用户注册:', email, '用户总数:', users.length);

        // 生成认证令牌
        const token = generateToken(user.id);

        // 从返回结果中移除密码字段
        const { password: _, ...userWithoutPassword } = user;

        // 返回成功响应
        res.status(201).json({
            success: true,
            message: '注册成功',
            data: {
                user: userWithoutPassword, // 不含密码的用户信息
                token                      // JWT认证令牌
            }
        });

    } catch (error) {
        // 错误处理
        console.error('❌ 注册错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
};

/**
 * 用户登录控制器
 * 验证用户凭证并生成访问令牌
 */
exports.login = async (req, res) => {
    try {
        console.log('📝 登录请求:', req.body.email);
        
        // 从请求中提取登录信息
        const { email, password } = req.body;

        // 验证必填字段
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: '请输入邮箱和密码'
            });
        }

        // 查找用户是否存在
        const user = users.find(user => user.email === email);
        if (!user) {
            // 用户不存在，返回错误
            // 注意：为安全考虑，不指明是邮箱还是密码错误
            return res.status(401).json({
                success: false,
                message: '邮箱或密码错误'
            });
        }

        // 验证密码是否正确
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            // 密码错误，返回错误
            return res.status(401).json({
                success: false,
                message: '邮箱或密码错误'
            });
        }

        // 生成认证令牌
        const token = generateToken(user.id);

        // 从返回结果中移除密码字段
        const { password: _, ...userWithoutPassword } = user;

        console.log('✅ 用户登录成功:', email);

        // 返回成功响应
        res.json({
            success: true,
            message: '登录成功',
            data: {
                user: userWithoutPassword, // 不含密码的用户信息
                token                      // JWT认证令牌
            }
        });

    } catch (error) {
        // 错误处理
        console.error('❌ 登录错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
};

/**
 * 获取当前用户信息控制器
 * 返回已认证用户的详细信息
 * 需要配合auth中间件使用
 */
exports.getCurrentUser = (req, res) => {
    try {
        // 从请求中获取用户ID（由auth中间件添加）
        const userId = req.userId;
        
        // 查找用户
        const user = users.find(user => user.id === userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }
        
        // 返回用户信息（不包含密码）
        const { password, ...userWithoutPassword } = user;
        
        res.json({
            success: true,
            data: {
                user: userWithoutPassword
            }
        });
    } catch (error) {
        console.error('❌ 获取用户信息错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
};

/**
 * 获取所有用户列表（仅用于调试）
 */
exports.getUsers = (req, res) => {
    console.log('🔍 获取用户列表，当前用户数:', users.length);
    
    // 从所有用户对象中移除密码字段
    const usersWithoutPasswords = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
    });
    
    // 返回用户列表
    res.json({
        success: true,
        message: '用户列表获取成功',
        data: {
            users: usersWithoutPasswords, // 不含密码的用户列表
            total: users.length           // 用户总数
        }
    });
};