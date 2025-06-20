/**
 * Supabase连接测试脚本
 * 用于验证Supabase客户端配置是否正确
 */

const { supabase } = require('./supabase');

async function testSupabaseConnection() {
  try {
    console.log('🔍 正在测试Supabase连接...');
    
    // 检查auth服务
    const { data: authData, error: authError } = await supabase.auth.getSession();
    
    if (authError) {
      console.error('❌ Auth服务测试失败:', authError.message);
    } else {
      console.log('✅ Supabase连接测试成功!');
      console.log('🔐 Auth服务状态: 正常');
      console.log('🔑 当前会话状态:', authData.session ? '已登录' : '未登录');
    }
    
    // 尝试获取数据库表信息
    try {
      console.log('\n📋 尝试获取数据库信息...');
      
      // 尝试查询系统表
      const { data: schemasData, error: schemasError } = await supabase
        .from('information_schema.schemata')
        .select('schema_name')
        .limit(5);
        
      if (schemasError) {
        console.log('📊 无法查询数据库信息，这可能是因为权限限制');
        console.log('💡 提示: 您需要创建数据库表结构');
      } else if (schemasData && schemasData.length > 0) {
        console.log('📊 数据库架构列表 (前5个):');
        schemasData.forEach(schema => {
          console.log(`   - ${schema.schema_name}`);
        });
      }
    } catch (dbError) {
      console.log('📊 数据库查询测试失败，这是正常的，因为我们尚未创建表结构');
    }
    
    console.log('\n🚀 下一步:');
    console.log('1. 创建数据库表结构');
    console.log('2. 设置行级安全策略(RLS)');
    console.log('3. 配置认证设置');
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
  }
}

// 执行测试
testSupabaseConnection(); 