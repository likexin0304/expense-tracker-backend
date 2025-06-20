/**
 * 费用追踪应用后端服务器
 * 版本: 1.0.1 - 强制缓存清除
 * 更新时间: 2025-06-20 13:10:00
 * 修复: UUID处理问题，移除所有parseInt(id)调用
 */

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// 导入配置好的Express应用实例
const app = require('./src/app');

// 设置服务器端口，优先使用环境变量中的PORT，如不存在则使用3000
const PORT = process.env.PORT || 3000;

// 启动服务器，监听指定端口
app.listen(PORT, () => {
    // 服务器成功启动后在控制台输出信息
    console.log(`🚀 Server running on port ${PORT}`);
}); 