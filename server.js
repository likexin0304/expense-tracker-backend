/**
 * 费用追踪应用后端服务器
 * v1.0.6 - 强制更新Vercel部署
 * 修复: UUID处理问题，移除所有parseInt(id)调用
 * 修复: Vercel部署配置，使用现代路由格式
 */

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// 导入配置好的Express应用实例
const app = require('./src/app');

// 设置服务器端口，优先使用环境变量中的PORT，如不存在则使用3000
const PORT = process.env.PORT || 3000;

console.log('✅ Supabase客户端配置完成');
console.log('🚀 正在启动服务器...');

// 启动服务器，监听指定端口
app.listen(PORT, () => {
    console.log('✅ 服务器配置完成');
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📝 Version: 1.0.6 - UUID修复版本`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⚡ Force deployment: ${new Date().toISOString()}`);
}); 