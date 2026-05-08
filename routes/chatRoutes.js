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
router.get('/', chatController.showInbox);

// PENTING: route spesifik harus sebelum route parameter /:id
// GET /chat/api/:id/messages - Get new messages (API polling)
router.get('/api/:id/messages', chatController.getNewMessages);

// POST /chat/start/:jobId - Mulai chat baru (hanya jika sudah melamar)
router.post('/start/:jobId', chatController.chatAuth.checkApplicationExists, chatController.startChat);

// POST /chat/send - Kirim pesan baru
router.post('/send', chatController.sendMessage);

// GET /chat/:id - Chat room (harus paling akhir karena param generik)
router.get('/:id', chatController.showChatRoom);

module.exports = router;
