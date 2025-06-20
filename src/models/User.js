/**
 * 用户模型
 * 使用Supabase进行用户认证和管理
 */

const { supabase, supabaseAdmin } = require('../utils/supabase');

class User {
    constructor(userData) {
        this.id = userData.id;
        this.email = userData.email;
        this.isDeleted = userData.is_deleted || false;
        this.deletedAt = userData.deleted_at || null;
        this.createdAt = userData.created_at || new Date();
        this.updatedAt = userData.updated_at || new Date();
    }

    // 创建用户
    static async create(userData) {
        try {
            // 使用Supabase Auth创建用户
            const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
                email: userData.email,
                password: userData.password,
                email_confirm: true // 自动确认邮箱，跳过验证步骤
            });

            if (authError) throw authError;
            
            // 用户已通过auth服务创建，profiles表会通过触发器自动创建记录
            // 但我们仍需要获取profile数据
            const { data: profileData, error: profileError } = await supabaseAdmin
                .from('profiles')
                .select('*')
                .eq('id', authData.user.id)
                .single();
                
            if (profileError) throw profileError;
            
            return new User({
                id: authData.user.id,
                email: authData.user.email,
                created_at: authData.user.created_at,
                updated_at: authData.user.created_at
            });
        } catch (error) {
            console.error('创建用户失败:', error);
            throw error;
        }
    }

    // 根据邮箱查找用户（排除已删除用户）
    static async findByEmail(email) {
        try {
            // 先通过Auth API查找用户
            const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
            
            if (authError) throw authError;
            
            const user = authData.users.find(u => u.email === email);
            if (!user) return null;
            
            // 然后获取profile信息
            const { data: profileData, error: profileError } = await supabaseAdmin
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .eq('is_deleted', false)
                .single();
                
            if (profileError) {
                if (profileError.code === 'PGRST116') return null; // 没有找到记录
                throw profileError;
            }
            
            return new User({
                id: user.id,
                email: user.email,
                ...profileData
            });
        } catch (error) {
            console.error('通过邮箱查找用户失败:', error);
            throw error;
        }
    }

    // 根据ID查找用户（排除已删除用户）
    static async findById(id) {
        try {
            // 获取用户profile
            const { data: profileData, error: profileError } = await supabaseAdmin
                .from('profiles')
                .select('*')
                .eq('id', id)
                .eq('is_deleted', false)
                .single();
                
            if (profileError) {
                if (profileError.code === 'PGRST116') return null; // 没有找到记录
                throw profileError;
            }
            
            // 获取用户auth信息
            const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(id);
            
            if (userError) throw userError;
            if (!userData.user) return null;
            
            return new User({
                id: userData.user.id,
                email: userData.user.email,
                ...profileData
            });
        } catch (error) {
            console.error('通过ID查找用户失败:', error);
            throw error;
        }
    }

    // 根据ID查找用户（包含已删除用户，用于内部验证）
    static async findByIdIncludeDeleted(id) {
        try {
            // 获取用户profile，不过滤已删除
            const { data: profileData, error: profileError } = await supabaseAdmin
                .from('profiles')
                .select('*')
                .eq('id', id)
                .single();
                
            if (profileError) {
                if (profileError.code === 'PGRST116') return null; // 没有找到记录
                throw profileError;
            }
            
            // 获取用户auth信息
            const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(id);
            
            if (userError) throw userError;
            if (!userData.user) return null;
            
            return new User({
                id: userData.user.id,
                email: userData.user.email,
                ...profileData
            });
        } catch (error) {
            console.error('通过ID查找用户(包含已删除)失败:', error);
            throw error;
        }
    }

    // 软删除用户
    static async softDelete(id) {
        try {
            // 更新profile标记为已删除
            const { data: profileData, error: profileError } = await supabaseAdmin
                .from('profiles')
                .update({
                    is_deleted: true,
                    deleted_at: new Date().toISOString()
                })
                .eq('id', id)
                .select()
                .single();
                
            if (profileError) throw profileError;
            
            // 禁用用户但不删除（保留数据）
            await supabaseAdmin.auth.admin.updateUserById(id, { 
                ban_duration: '87600h' // 10年，实际上是永久禁用
            });
            
            return new User(profileData);
        } catch (error) {
            console.error('软删除用户失败:', error);
            throw error;
        }
    }

    // 获取所有用户（调试用，排除已删除用户）
    static async getAllUsers() {
        try {
            // 获取所有未删除的profiles
            const { data: profilesData, error: profilesError } = await supabaseAdmin
                .from('profiles')
                .select('*')
                .eq('is_deleted', false);
                
            if (profilesError) throw profilesError;
            
            // 获取所有用户的auth信息
            const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
            
            if (authError) throw authError;
            
            // 合并数据
            return profilesData.map(profile => {
                const authUser = authData.users.find(u => u.id === profile.id);
                return new User({
                    ...profile,
                    email: authUser ? authUser.email : profile.email
                });
            });
        } catch (error) {
            console.error('获取所有用户失败:', error);
            throw error;
        }
    }

    // 获取用户信息（不包含敏感数据）
    toJSON() {
        return {
            id: this.id,
            email: this.email,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
}

module.exports = User;