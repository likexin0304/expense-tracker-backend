/**
 * 服务器入口文件
 * 负责启动Express应用服务器并监听指定端口
 */

// 导入配置好的Express应用实例
const app = require('./src/app');

// 设置服务器端口，优先使用环境变量中的PORT，如不存在则使用3000
const PORT = process.env.PORT || 3000;

// 启动服务器，监听指定端口
app.listen(PORT, () => {
    // 服务器成功启动后在控制台输出信息
    console.log(`🚀 Server running on port ${PORT}`);
}); 