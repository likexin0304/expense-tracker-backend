/**
 * 认证中间件
 * 验证请求中的JWT令牌，并将用户ID附加到请求对象
 */

const jwt = require('jsonwebtoken');

/**
 * 认证中间件函数
 * 检查请求头中的Authorization字段是否包含有效的JWT令牌
 * 成功时在req对象上添加userId属性
 */
module.exports = (req, res, next) => {
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
        
        // 验证令牌
        const decodedToken = jwt.verify(
            token, 
            process.env.JWT_SECRET || 'default-secret'
        );
        
        // 将用户ID添加到请求对象
        req.userId = decodedToken.userId;
        
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
            message: '认证过程中发生错误'
        });
    }
};