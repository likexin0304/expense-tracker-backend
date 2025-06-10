// 临时内存存储，用于MVP测试
let users = [];
let currentId = 1;

class User {
    constructor(email, password, wechatOpenId = null) {
        this.id = currentId++;
        this.email = email;
        this.password = password;
        this.wechatOpenId = wechatOpenId;
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }

    // 创建用户
    static async create(userData) {
        const user = new User(userData.email, userData.password, userData.wechatOpenId);
        users.push(user);
        return user;
    }

    // 根据邮箱查找用户
    static async findByEmail(email) {
        return users.find(user => user.email === email);
    }

    // 根据ID查找用户
    static async findById(id) {
        return users.find(user => user.id === id);
    }

    // 根据微信OpenID查找用户
    static async findByWeChatOpenId(openId) {
        return users.find(user => user.wechatOpenId === openId);
    }

    // 获取用户信息（不包含密码）
    toJSON() {
        const { password, ...userWithoutPassword } = this;
        return userWithoutPassword;
    }
}

module.exports = User;