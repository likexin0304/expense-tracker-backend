/**
 * Supabase数据库设置脚本
 * 用于创建必要的表结构和权限
 */

const { supabase } = require('./supabase');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
  try {
    console.log('🚀 开始设置数据库...');
    
    // 读取SQL脚本
    const sqlFilePath = path.join(__dirname, '../../docs/supabase-setup.sql');
    const sqlScript = fs.readFileSync(sqlFilePath, 'utf8');
    
    // 将SQL脚本拆分为单独的语句
    const statements = sqlScript
      .replace(/--.*$/gm, '') // 移除注释
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    console.log(`📝 从SQL文件中读取了${statements.length}条语句`);
    
    // 逐个执行SQL语句
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`\n执行语句 ${i + 1}/${statements.length}:`);
      console.log(statement.substring(0, 100) + (statement.length > 100 ? '...' : ''));
      
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          console.error(`❌ 执行失败: ${error.message}`);
          console.log('💡 提示: 这可能是因为权限限制或语法错误');
        } else {
          console.log('✅ 执行成功');
        }
      } catch (error) {
        console.error(`❌ 执行失败: ${error.message}`);
        console.log('💡 提示: 您可能需要在Supabase控制台中手动执行SQL脚本');
      }
    }
    
    console.log('\n🎉 数据库设置尝试完成!');
    console.log('📋 请检查Supabase控制台以确认表是否创建成功');
    console.log('💡 如果自动设置失败，请在Supabase控制台的SQL编辑器中手动执行docs/supabase-setup.sql文件中的SQL脚本');
    
  } catch (error) {
    console.error('❌ 设置过程中发生错误:', error.message);
    console.log('💡 提示: 请在Supabase控制台的SQL编辑器中手动执行docs/supabase-setup.sql文件中的SQL脚本');
  }
}

// 执行设置
setupDatabase(); 