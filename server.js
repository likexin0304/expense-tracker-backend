/**
 * 费用追踪应用后端服务器
 * v1.0.8 - 添加缺失依赖和修复Vercel配置
 * 修复: Vercel路由配置，使用builds+routes替代rewrites
 * 修复: UUID处理问题，移除所有parseInt(id)调用
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
    console.log(`📝 Version: 1.0.8 - 添加缺失依赖`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`⚡ Force deployment: ${new Date().toISOString()}`);
    console.log(`🔧 Vercel config: builds+routes (fixed)`);
}); 