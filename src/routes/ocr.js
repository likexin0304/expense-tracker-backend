const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const OCRController = require('../controllers/ocrController');

// 所有OCR路由都需要认证
router.use(authenticateToken);

/**
 * @route POST /api/ocr/parse
 * @desc 提交OCR文本进行解析
 * @access Private
 */
router.post('/parse', OCRController.parseText);

/**
 * @route POST /api/ocr/confirm/:recordId
 * @desc 确认OCR解析结果并创建支出记录
 * @access Private
 */
router.post('/confirm/:recordId', OCRController.confirmAndCreateExpense);

/**
 * @route GET /api/ocr/records
 * @desc 获取OCR记录列表
 * @access Private
 */
router.get('/records', OCRController.getRecords);

/**
 * @route GET /api/ocr/records/:recordId
 * @desc 获取单个OCR记录详情
 * @access Private
 */
router.get('/records/:recordId', OCRController.getRecord);

/**
 * @route DELETE /api/ocr/records/:recordId
 * @desc 删除OCR记录
 * @access Private
 */
router.delete('/records/:recordId', OCRController.deleteRecord);

/**
 * @route GET /api/ocr/statistics
 * @desc 获取OCR统计信息
 * @access Private
 */
router.get('/statistics', OCRController.getStatistics);

/**
 * @route GET /api/ocr/merchants
 * @desc 获取商户列表（用于OCR结果校正）
 * @access Private
 */
router.get('/merchants', OCRController.getMerchants);

/**
 * @route POST /api/ocr/merchants/match
 * @desc 智能匹配商户
 * @access Private
 */
router.post('/merchants/match', OCRController.matchMerchants);

module.exports = router; 