/**
 * 认证中间件
 * 验证请求中的JWT令牌，并将用户ID附加到请求对象
 */

const { supabase } = require('../utils/supabase');
const TokenBlacklist = require('../utils/tokenBlacklist');
const User = require('../models/User');

/**
 * 认证中间件函数
 * 检查请求头中的Authorization字段是否包含有效的JWT令牌
 * 成功时在req对象上添加userId属性
 */
module.exports = async (req, res, next) => {
    try {
        // 获取请求头中的Authorization字段
        const authHeader = req.headers.authorization;
        
        // 检查授权头是否存在
        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: '未提供认证令牌'
            });
        }
        
        // 检查Bearer格式
        if (!authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: '认证格式无效'
            });
        }
        
        // 提取令牌
        const token = authHeader.split(' ')[1];
        
        // 检查token是否在黑名单中
        if (TokenBlacklist.isBlacklisted(token)) {
            return res.status(401).json({
                success: false,
                message: '令牌已失效，请重新登录'
            });
        }
        
        // 使用Supabase验证令牌
        const { data: sessionData, error: sessionError } = await supabase.auth.getUser(token);
        
        if (sessionError) {
            console.error('❌ 令牌验证错误:', sessionError.message);
            return res.status(401).json({
                success: false,
                message: '无效的认证令牌'
            });
        }
        
        if (!sessionData.user) {
            return res.status(401).json({
                success: false,
                message: '无效的用户会话'
            });
        }
        
        // 检查用户是否存在且未被删除
        const user = await User.findByIdIncludeDeleted(sessionData.user.id);
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: '用户不存在'
            });
        }
        
        if (user.isDeleted) {
            // 用户已删除，将token加入黑名单
            TokenBlacklist.addToken(token, user.id);
            return res.status(401).json({
                success: false,
                message: '账号已删除，请重新注册'
            });
        }
        
        // 记录用户token（用于后续可能的批量失效）
        TokenBlacklist.recordUserToken(sessionData.user.id, token);
        
        // 将用户ID添加到请求对象
        req.userId = sessionData.user.id;
        
        // 继续处理请求
        next();
        
    } catch (error) {
        console.error('❌ 认证错误:', error);
        
        // 根据错误类型返回不同的错误信息
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: '令牌已过期，请重新登录'
            });
        }
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: '无效的认证令牌'
            });
        }
        
        // 其他错误
        res.status(500).json({
            success: false,
            message: '认证过程中发生错误',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};