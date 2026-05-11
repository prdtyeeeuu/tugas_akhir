const Warning = require('../models/Warning');
const { validateReturnUrl } = require('../utils/helpers');

const acknowledgeWarning = async (req, res, next) => {
  try {
    const warningId = req.params.id;
    const returnUrl = validateReturnUrl(req.body.returnUrl || req.query.returnUrl || '/dashboard') || '/dashboard';

    await Warning.acknowledge(warningId, req.user.id);
    res.redirect(returnUrl);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  acknowledgeWarning
};
