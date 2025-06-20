/**
 * 认证控制器
 * 处理用户注册、登录和身份验证的核心逻辑
 */

const { supabase, supabaseAdmin } = require('../utils/supabase');
const User = require('../models/User');
const TokenBlacklist = require('../utils/tokenBlacklist');

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

        // 使用Supabase创建用户
        const user = await User.create({
            email,
            password
        });

        console.log('✅ 新用户注册:', email, '用户ID:', user.id);

        // 使用Supabase登录获取会话
        const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (sessionError) throw sessionError;

        // 返回成功响应
        res.status(201).json({
            success: true,
            message: '注册成功',
            data: {
                user: user.toJSON(),
                token: sessionData.session.access_token
            }
        });

    } catch (error) {
        // 错误处理
        console.error('❌ 注册错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
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

        // 使用Supabase进行身份验证
        const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (sessionError) {
            console.log('❌ 登录失败:', sessionError.message);
            return res.status(401).json({
                success: false,
                message: '邮箱或密码错误'
            });
        }

        // 获取用户信息
        const user = await User.findById(sessionData.user.id);
        if (!user) {
            console.log('❌ 用户不存在:', email);
            return res.status(401).json({
                success: false,
                message: '用户不存在'
            });
        }

        console.log('✅ 用户登录成功:', email);

        // 返回成功响应
        res.json({
            success: true,
            message: '登录成功',
            data: {
                user: user.toJSON(),
                token: sessionData.session.access_token
            }
        });

    } catch (error) {
        // 错误处理
        console.error('❌ 登录错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
                user: user.toJSON()
            }
        });
    } catch (error) {
        console.error('❌ 获取用户信息错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
        
        // 返回用户列表
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
            message: '服务器内部错误',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
        
        // 检查用户是否存在
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
        
        // 软删除用户
        const deletedUser = await User.softDelete(userId);
        
        // 使用户的所有token失效
        const authHeader = req.headers.authorization;
        const token = authHeader.split(' ')[1];
        TokenBlacklist.invalidateAllUserTokens(userId, token);
        
        console.log('✅ 用户账号已删除，ID:', userId);
        
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
            message: '服务器内部错误',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};