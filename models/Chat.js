/**
 * Chat Model
 * Mengelola semua operasi database terkait chat messaging
 */
const { query } = require('../config/db');

const Chat = {
  /**
   * Cek apakah user sudah melamar pekerjaan tertentu (required untuk chat)
   * @param {number} applicantId - ID user yang melamar
   * @param {number} hrId - ID HR yang dituju
   * @param {number} jobId - ID pekerjaan
   * @returns {Promise<boolean>} - True jika sudah melamar
   */
  hasApplied: async (applicantId, hrId, jobId) => {
    const sql = `
      SELECT COUNT(*) as count FROM applications 
      WHERE user_id = ? AND job_id = ?
    `;
    const results = await query(sql, [applicantId, jobId]);
    return results[0].count > 0;
  },

  /**
   * Mendapatkan atau membuat conversation
   * Menggunakan INSERT IGNORE untuk menghindari race condition
   * @param {number} applicantId - ID applicant
   * @param {number} hrId - ID HR
   * @param {number} jobId - ID job
   * @returns {Promise} - Conversation ID
   */
  getOrCreateConversation: async (applicantId, hrId, jobId) => {
    // Cek apakah conversation sudah ada
    const checkSql = `
      SELECT id FROM chat_conversations
      WHERE applicant_id = ? AND hr_id = ? AND job_id = ?
    `;
    const existing = await query(checkSql, [applicantId, hrId, jobId]);

    if (existing.length > 0) {
      return existing[0].id;
    }

    // Buat conversation baru dengan INSERT IGNORE untuk menghindari race condition
    // Tabel harus memiliki UNIQUE KEY pada (applicant_id, hr_id, job_id)
    const insertSql = `
      INSERT IGNORE INTO chat_conversations (applicant_id, hr_id, job_id)
      VALUES (?, ?, ?)
    `;
    await query(insertSql, [applicantId, hrId, jobId]);

    // Ambil ID yang baru saja di-insert (atau yang sudah ada)
    const newResult = await query(checkSql, [applicantId, hrId, jobId]);
    return newResult[0].id;
  },

  /**
   * Mengirim pesan baru
   * @param {object} messageData - { conversation_id, sender_id, receiver_id, message }
   * @returns {Promise} - Message ID
   */
  sendMessage: async (messageData) => {
    const { conversation_id, sender_id, receiver_id, message } = messageData;

    const sql = `
      INSERT INTO chat_messages (conversation_id, sender_id, receiver_id, message)
      VALUES (?, ?, ?, ?)
    `;

    const result = await query(sql, [conversation_id, sender_id, receiver_id, message]);
    return result.insertId;
  },

  /**
   * Mendapatkan semua conversation untuk user
   * @param {number} userId - ID user
   * @param {boolean} isApplicant - Apakah user adalah applicant
   * @returns {Promise} - Array of conversations
   */
  getConversations: async (userId, isApplicant) => {
    const sql = isApplicant
      ? `
        SELECT
          c.id as conversation_id,
          c.job_id,
          j.title as job_title,
          j.company,
          u.name as hr_name,
          u.profile_image as hr_image,
          lm.last_message,
          lm.last_message_time,
          COALESCE(unread.unread_count, 0) as unread_count
        FROM chat_conversations c
        JOIN jobs j ON c.job_id = j.id
        JOIN users u ON c.hr_id = u.id
        LEFT JOIN (
          SELECT conversation_id,
                 message as last_message,
                 created_at as last_message_time
          FROM chat_messages m1
          WHERE created_at = (
            SELECT MAX(created_at) FROM chat_messages m2
            WHERE m2.conversation_id = m1.conversation_id
          )
        ) lm ON lm.conversation_id = c.id
        LEFT JOIN (
          SELECT conversation_id, COUNT(*) as unread_count
          FROM chat_messages
          WHERE receiver_id = ? AND is_read = FALSE
          GROUP BY conversation_id
        ) unread ON unread.conversation_id = c.id
        WHERE c.applicant_id = ?
        ORDER BY lm.last_message_time DESC
      `
      : `
        SELECT
          c.id as conversation_id,
          c.job_id,
          j.title as job_title,
          j.company,
          u.name as applicant_name,
          u.profile_image as applicant_image,
          lm.last_message,
          lm.last_message_time,
          COALESCE(unread.unread_count, 0) as unread_count
        FROM chat_conversations c
        JOIN jobs j ON c.job_id = j.id
        JOIN users u ON c.applicant_id = u.id
        LEFT JOIN (
          SELECT conversation_id,
                 message as last_message,
                 created_at as last_message_time
          FROM chat_messages m1
          WHERE created_at = (
            SELECT MAX(created_at) FROM chat_messages m2
            WHERE m2.conversation_id = m1.conversation_id
          )
        ) lm ON lm.conversation_id = c.id
        LEFT JOIN (
          SELECT conversation_id, COUNT(*) as unread_count
          FROM chat_messages
          WHERE receiver_id = ? AND is_read = FALSE
          GROUP BY conversation_id
        ) unread ON unread.conversation_id = c.id
        WHERE c.hr_id = ?
        ORDER BY lm.last_message_time DESC
      `;

    return await query(sql, [userId, userId]);
  },

  /**
   * Mendapatkan semua pesan dalam conversation
   * @param {number} conversationId - ID conversation
   * @param {number} userId - ID user yang membaca (untuk mark as read)
   * @returns {Promise} - Array of messages
   */
  getMessages: async (conversationId, userId) => {
    // Mark messages as read
    const markReadSql = `
      UPDATE chat_messages 
      SET is_read = TRUE 
      WHERE conversation_id = ? AND receiver_id = ? AND is_read = FALSE
    `;
    await query(markReadSql, [conversationId, userId]);

    // Get messages
    const sql = `
      SELECT 
        m.*,
        u.name as sender_name,
        u.profile_image as sender_image
      FROM chat_messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.conversation_id = ?
      ORDER BY m.created_at ASC
    `;

    return await query(sql, [conversationId]);
  },

  /**
   * Mendapatkan detail conversation
   * @param {number} conversationId - ID conversation
   * @param {number} userId - ID user yang mengakses
   * @returns {Promise} - Conversation detail
   */
  getConversationDetail: async (conversationId, userId) => {
    const sql = `
      SELECT 
        c.*,
        j.title as job_title,
        j.company,
        j.location,
        applicant.name as applicant_name,
        applicant.profile_image as applicant_image,
        hr.name as hr_name,
        hr.profile_image as hr_image
      FROM chat_conversations c
      JOIN jobs j ON c.job_id = j.id
      JOIN users applicant ON c.applicant_id = applicant.id
      JOIN users hr ON c.hr_id = hr.id
      WHERE c.id = ? AND (c.applicant_id = ? OR c.hr_id = ?)
    `;
    const results = await query(sql, [conversationId, userId, userId]);
    return results[0] || null;
  },

  /**
   * Mendapatkan total unread messages untuk user
   * @param {number} userId - ID user
   * @returns {Promise<number>} - Jumlah pesan belum dibaca
   */
  getUnreadCount: async (userId) => {
    const sql = `
      SELECT COUNT(*) as count 
      FROM chat_messages 
      WHERE receiver_id = ? AND is_read = FALSE
    `;
    const results = await query(sql, [userId]);
    return results[0].count;
  }
};

module.exports = Chat;
