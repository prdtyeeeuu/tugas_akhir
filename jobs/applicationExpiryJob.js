const cron = require('node-cron');
const Application = require('../models/Application');
const logger = require('../utils/logger');

async function expireApplications() {
  const affectedRows = await Application.expireOldOfferings();
  if (affectedRows > 0) {
    logger.info('Expired outdated offering applications', { affectedRows });
  }
  return affectedRows;
}

function startApplicationExpiryJob() {
  cron.schedule('0 0 * * *', async () => {
    try {
      await expireApplications();
    } catch (error) {
      logger.error('Application expiry cron failed', { error: error.message });
    }
  });
}

module.exports = {
  startApplicationExpiryJob,
  expireApplications
};
