/**
 * 认证控制器
 * 处理用户注册、登录和身份验证的核心逻辑
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

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
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: '该邮箱已被注册'
            });
        }

        // 密码加密 - 使用bcrypt进行单向哈希
        const hashedPassword = await bcrypt.hash(password, 12);

        // 使用User模型创建新用户
        const user = await User.create({
            email,
            password: hashedPassword
        });

        console.log('✅ 新用户注册:', email, '用户ID:', user.id);

        // 生成认证令牌
        const token = generateToken(user.id);

        // 返回成功响应
        res.status(201).json({
            success: true,
            message: '注册成功',
            data: {
                user: user.toJSON(), // 使用User模型的toJSON方法，自动移除密码
                token                // JWT认证令牌
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

        // 使用User模型查找用户
        const user = await User.findByEmail(email);
        if (!user) {
            console.log('❌ 用户不存在:', email);
            return res.status(401).json({
                success: false,
                message: '邮箱或密码错误'
            });
        }

        // 验证密码是否正确
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            console.log('❌ 密码错误:', email);
            return res.status(401).json({
                success: false,
                message: '邮箱或密码错误'
            });
        }

        // 生成认证令牌
        const token = generateToken(user.id);

        console.log('✅ 用户登录成功:', email);

        // 返回成功响应
        res.json({
            success: true,
            message: '登录成功',
            data: {
                user: user.toJSON(), // 使用User模型的toJSON方法，自动移除密码
                token                // JWT认证令牌
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
exports.getCurrentUser = async (req, res) => {
    try {
        // 从请求中获取用户ID（由auth中间件添加）
        const userId = req.userId;
        
        // 使用User模型查找用户
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }
        
        res.json({
            success: true,
            data: {
                user: user.toJSON() // 使用User模型的toJSON方法
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
exports.getUsers = async (req, res) => {
    try {
        // 使用User模型获取所有用户
        const allUsers = await User.getAllUsers();
        
        console.log('🔍 获取用户列表，当前用户数:', allUsers.length);
        
        // 返回用户列表（toJSON已自动移除密码）
        res.json({
            success: true,
            message: '用户列表获取成功',
            data: {
                users: allUsers.map(user => user.toJSON()),
                total: allUsers.length
            }
        });
    } catch (error) {
        console.error('❌ 获取用户列表错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
};

/**
 * 删除账号控制器
 * 软删除用户账号，需要用户输入确认文本
 * 删除后立即使所有相关JWT token失效
 */
exports.deleteAccount = async (req, res) => {
    try {
        console.log('🗑️ 删除账号请求，用户ID:', req.userId);
        
        // 从请求中获取确认文本
        const { confirmationText } = req.body;
        
        // 验证确认文本
        if (!confirmationText) {
            return res.status(400).json({
                success: false,
                message: '请提供确认文本'
            });
        }
        
        // 检查确认文本是否包含"我确认"
        if (!confirmationText.includes('我确认')) {
            return res.status(400).json({
                success: false,
                message: '确认文本不正确，请输入包含"我确认"的文本'
            });
        }
        
        // 获取当前用户ID
        const userId = req.userId;
        
        // 查找用户（包含已删除用户，防止重复删除）
        const user = await User.findByIdIncludeDeleted(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }
        
        // 检查用户是否已被删除
        if (user.isDeleted) {
            return res.status(400).json({
                success: false,
                message: '账号已经被删除'
            });
        }
        
        // 执行软删除
        const deletedUser = await User.softDelete(userId);
        if (!deletedUser) {
            return res.status(500).json({
                success: false,
                message: '删除账号失败'
            });
        }
        
        // 使该用户的所有JWT token失效
        const TokenBlacklist = require('../utils/tokenBlacklist');
        TokenBlacklist.blacklistUserTokens(userId);
        
        console.log('✅ 账号删除成功:', user.email, '用户ID:', userId);
        console.log('📊 删除时间:', deletedUser.deletedAt);
        
        // 返回成功响应
        res.json({
            success: true,
            message: '账号已成功删除',
            data: {
                deletedAt: deletedUser.deletedAt,
                message: '您的账号已被永久删除，所有相关数据已保留但无法访问。感谢您使用我们的服务。'
            }
        });
        
    } catch (error) {
        console.error('❌ 删除账号错误:', error);
        res.status(500).json({
            success: false,
            message: '删除账号过程中发生错误'
        });
    }
};