/**
 * 配置路由 - 提供动态API配置
 */

const express = require('express');
const router = express.Router();
const configController = require('../controllers/configController');

// 获取API配置信息
router.get('/', configController.getConfig);

// 获取Swift配置代码
router.get('/swift', configController.getSwiftConfig);

module.exports = router;
