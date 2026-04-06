/**
 * Chat Routes
 * Routing untuk fitur chat messaging
 */
const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { requireAuth } = require('../middleware/auth');

// Semua route chat memerlukan auth
router.use(requireAuth);

// GET /chat - Inbox (daftar conversation)
router.get('/chat', chatController.showInbox);

// GET /chat/:id - Chat room
router.get('/chat/:id', chatController.showChatRoom);

// POST /chat/start/:jobId - Mulai chat baru (hanya jika sudah melamar)
router.post('/chat/start/:jobId', chatController.chatAuth.checkApplicationExists, chatController.startChat);

// POST /chat/send - Kirim pesan baru
router.post('/chat/send', chatController.sendMessage);

// GET /chat/api/:id/messages - Get new messages (API polling)
router.get('/chat/api/:id/messages', chatController.getNewMessages);

module.exports = router;
