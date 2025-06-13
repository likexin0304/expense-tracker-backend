/**
 * JWT Token 黑名单管理模块
 * 用于管理已失效的JWT token，特别是用户删除账号后的token失效
 */

// 内存存储黑名单token（生产环境建议使用Redis）
let blacklistedTokens = new Set();

// 用户token映射（用于批量失效某用户的所有token）
let userTokens = new Map(); // userId -> Set of tokens

class TokenBlacklist {
    /**
     * 将token添加到黑名单
     * @param {string} token - JWT token
     * @param {number} userId - 用户ID（可选）
     */
    static addToken(token, userId = null) {
        blacklistedTokens.add(token);
        
        if (userId) {
            if (!userTokens.has(userId)) {
                userTokens.set(userId, new Set());
            }
            userTokens.get(userId).add(token);
        }
        
        console.log(`🚫 Token已加入黑名单: ${token.substring(0, 20)}...`);
    }

    /**
     * 将用户的所有token添加到黑名单
     * @param {number} userId - 用户ID
     */
    static blacklistUserTokens(userId) {
        const tokens = userTokens.get(userId);
        if (tokens) {
            tokens.forEach(token => {
                blacklistedTokens.add(token);
            });
            console.log(`🚫 用户 ${userId} 的所有token已加入黑名单，共 ${tokens.size} 个`);
        }
    }

    /**
     * 检查token是否在黑名单中
     * @param {string} token - JWT token
     * @returns {boolean} - 是否在黑名单中
     */
    static isBlacklisted(token) {
        return blacklistedTokens.has(token);
    }

    /**
     * 记录用户token（用于后续批量失效）
     * @param {number} userId - 用户ID
     * @param {string} token - JWT token
     */
    static recordUserToken(userId, token) {
        if (!userTokens.has(userId)) {
            userTokens.set(userId, new Set());
        }
        userTokens.get(userId).add(token);
    }

    /**
     * 清理过期的token（可选实现，用于内存优化）
     * 注意：这里简化实现，实际应该根据JWT的exp字段判断
     */
    static cleanup() {
        // 简化实现：清空所有黑名单（实际应该只清理过期的）
        // 生产环境建议使用Redis的TTL功能
        console.log(`🧹 清理黑名单，当前黑名单token数量: ${blacklistedTokens.size}`);
    }

    /**
     * 获取黑名单统计信息（调试用）
     */
    static getStats() {
        return {
            blacklistedTokensCount: blacklistedTokens.size,
            usersWithTokens: userTokens.size,
            totalUserTokens: Array.from(userTokens.values()).reduce((sum, tokens) => sum + tokens.size, 0)
        };
    }
}

module.exports = TokenBlacklist; 