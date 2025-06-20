/**
 * Supabase客户端配置
 * 用于连接Supabase服务并提供数据访问接口
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase配置
const supabaseUrl = process.env.SUPABASE_URL || 'https://nlrtjnvwgsaavtpfccxg.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5scnRqbnZ3Z3NhYXZ0cGZjY3hnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwNzU3MDgsImV4cCI6MjA2NTY1MTcwOH0.5r2tzDOV1T1Lkz_Mtujq35VBBfo77SCh6H__rUSHQCo';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5scnRqbnZ3Z3NhYXZ0cGZjY3hnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDA3NTcwOCwiZXhwIjoyMDY1NjUxNzA4fQ.j71A2nthbWaSzULxnUd9U7nOeXd0u6ru0CJmu90Vcdk';

// 创建Supabase客户端实例 - 使用匿名密钥（用于前端和一般API访问）
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 创建具有管理权限的Supabase客户端实例 - 使用服务密钥（仅用于需要特殊权限的操作）
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

console.log('✅ Supabase客户端配置完成');

module.exports = {
  supabase,
  supabaseAdmin,
  supabaseUrl
}; 