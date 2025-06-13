// 临时内存存储，用于MVP测试
let users = [];
let currentId = 1;

class User {
    constructor(email, password, wechatOpenId = null) {
        this.id = currentId++;
        this.email = email;
        this.password = password;
        this.wechatOpenId = wechatOpenId;
        this.isDeleted = false; // 软删除标记
        this.deletedAt = null; // 删除时间戳
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }

    // 创建用户
    static async create(userData) {
        const user = new User(userData.email, userData.password, userData.wechatOpenId);
        users.push(user);
        return user;
    }

    // 根据邮箱查找用户（排除已删除用户）
    static async findByEmail(email) {
        return users.find(user => user.email === email && !user.isDeleted);
    }

    // 根据ID查找用户（排除已删除用户）
    static async findById(id) {
        return users.find(user => user.id === id && !user.isDeleted);
    }

    // 根据ID查找用户（包含已删除用户，用于内部验证）
    static async findByIdIncludeDeleted(id) {
        return users.find(user => user.id === id);
    }

    // 根据微信OpenID查找用户（排除已删除用户）
    static async findByWeChatOpenId(openId) {
        return users.find(user => user.wechatOpenId === openId && !user.isDeleted);
    }

    // 软删除用户
    static async softDelete(id) {
        const user = users.find(user => user.id === id);
        if (user) {
            user.isDeleted = true;
            user.deletedAt = new Date();
            user.updatedAt = new Date();
            return user;
        }
        return null;
    }

    // 获取所有用户（调试用，排除已删除用户）
    static async getAllUsers() {
        return users.filter(user => !user.isDeleted);
    }

    // 获取用户信息（不包含密码）
    toJSON() {
        const { password, ...userWithoutPassword } = this;
        return userWithoutPassword;
    }
}

module.exports = User;