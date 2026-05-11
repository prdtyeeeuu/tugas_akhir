/**
 * Chat Controller
 * Menangani semua operasi terkait chat messaging
 */
const Chat = require('../models/Chat');
const Job = require('../models/Job');
const Application = require('../models/Application');
const Warning = require('../models/Warning');
const { formatTimeAgo } = require('../utils/helpers');

/**
 * Middleware: Cek apakah user sudah melamar pekerjaan
 * Hanya user yang sudah melamar yang bisa chat
 */
const checkApplicationExists = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const jobId = req.params.jobId || req.body.job_id;

    if (!jobId) {
      return res.status(400).json({ error: 'Job ID diperlukan' });
    }

    // Cek apakah user sudah melamar
    const existingApp = await Application.findByUserAndJob(userId, parseInt(jobId));
    
    if (!existingApp) {
      return res.status(403).json({ 
        error: 'Anda harus melamar pekerjaan ini terlebih dahulu untuk bisa chat' 
      });
    }

    next();
  } catch (error) {
    console.error('Check application error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan' });
  }
};

/**
 * Menampilkan halaman inbox chat
 * Logika role:
 * - isApplicant = true → job seeker (pencari kerja)
 * - isApplicant = false → HR (pencari karyawan)
 */
const showInbox = async (req, res) => {
  try {
    const userId = req.user.id;
    const isApplicant = req.user.role === 'job_seeker';

    // Get conversations sesuai role user
    const conversations = await Chat.getConversations(userId, isApplicant);

    // Get unread count
    const unreadCount = await Chat.getUnreadCount(userId);
    const warnings = isApplicant ? await Warning.findByUserId(userId, 10) : [];

    res.render('pages/chat/inbox', {
      title: 'Pesan - Lokerin',
      conversations,
      unreadCount,
      warnings,
      isApplicant,
      formatTimeAgo,
      hideFooter: true
    });
  } catch (error) {
    console.error('Inbox error:', error);
    res.render('pages/chat/inbox', {
      title: 'Pesan - Lokerin',
      conversations: [],
      unreadCount: 0,
      warnings: [],
      isApplicant: false,
      formatTimeAgo,
      hideFooter: true,
      error: 'Gagal memuat pesan'
    });
  }
};

/**
 * Menampilkan halaman chat room
 */
const showChatRoom = async (req, res) => {
  try {
    const userId = req.user.id;
    const conversationId = req.params.id;

    // Get conversation detail
    const conversation = await Chat.getConversationDetail(conversationId, userId);

    if (!conversation) {
      return res.redirect('/chat');
    }

    // Cek apakah user adalah participant
    if (conversation.applicant_id !== userId && conversation.hr_id !== userId) {
      return res.redirect('/chat');
    }

    // Get messages
    const messages = await Chat.getMessages(conversationId, userId);

    // Determine other party info
    const isApplicant = conversation.applicant_id === userId;
    const otherParty = {
      name: isApplicant ? conversation.hr_name : conversation.applicant_name,
      image: isApplicant ? conversation.hr_image : conversation.applicant_image,
      role: isApplicant ? 'HR' : 'Pelamar'
    };

    res.render('pages/chat/room', {
      title: `Chat dengan ${otherParty.name} - Lokerin`,
      conversation,
      messages,
      otherParty,
      isApplicant,
      currentUserId: userId,
      hideFooter: true
    });
  } catch (error) {
    console.error('Chat room error:', error);
    res.redirect('/chat');
  }
};

/**
 * Memulai chat baru dengan HR
 * Hanya bisa jika sudah melamar
 */
const startChat = async (req, res) => {
  try {
    const applicantId = req.user.id;
    const jobId = parseInt(req.params.jobId);

    // Get job info to get HR
    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({ error: 'Pekerjaan tidak ditemukan' });
    }

    if (!job.hr_id) {
      return res.status(400).json({ error: 'HR tidak ditemukan untuk pekerjaan ini' });
    }

    // Cek apakah sudah melamar (middleware sudah cek, tapi double check)
    const hasApplied = await Application.findByUserAndJob(applicantId, jobId);
    if (!hasApplied) {
      return res.status(403).json({ 
        error: 'Anda harus melamar pekerjaan ini terlebih dahulu' 
      });
    }

    // Get or create conversation
    const conversationId = await Chat.getOrCreateConversation(
      applicantId,
      job.hr_id,
      jobId
    );

    // Redirect ke chat room
    res.json({ 
      success: true, 
      conversation_id: conversationId,
      redirect_url: `/chat/${conversationId}`
    });
  } catch (error) {
    console.error('Start chat error:', error);
    res.status(500).json({ error: 'Gagal memulai chat' });
  }
};

/**
 * Mengirim pesan baru
 */
const sendMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversation_id, message } = req.body;

    if (!conversation_id || !message) {
      return res.status(400).json({ error: 'Conversation ID dan pesan diperlukan' });
    }

    // Get conversation detail to get receiver_id
    const conversation = await Chat.getConversationDetail(conversation_id, userId);
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation tidak ditemukan' });
    }

    // Determine receiver
    const receiverId = conversation.applicant_id === userId 
      ? conversation.hr_id 
      : conversation.applicant_id;

    // Send message
    const messageId = await Chat.sendMessage({
      conversation_id,
      sender_id: userId,
      receiver_id: receiverId,
      message
    });

    res.json({ 
      success: true, 
      message_id: messageId,
      message: {
        id: messageId,
        sender_id: userId,
        message,
        created_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Gagal mengirim pesan' });
  }
};

/**
 * API: Get new messages (untuk polling)
 */
const getNewMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const conversationId = req.params.id;
    const since = req.query.since;

    let sql = `
      SELECT 
        m.*,
        u.name as sender_name
      FROM chat_messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.conversation_id = ?
    `;
    const params = [conversationId];

    if (since) {
      sql += ' AND m.created_at > ?';
      params.push(since);
    }

    sql += ' ORDER BY m.created_at ASC';

    const { query } = require('../config/db');
    const messages = await query(sql, params);

    res.json({ success: true, messages });
  } catch (error) {
    console.error('Get new messages error:', error);
    res.status(500).json({ error: 'Gagal memuat pesan' });
  }
};

/**
 * Middleware export
 */
const chatAuth = {
  checkApplicationExists
};

module.exports = {
  showInbox,
  showChatRoom,
  startChat,
  sendMessage,
  getNewMessages,
  chatAuth
};
