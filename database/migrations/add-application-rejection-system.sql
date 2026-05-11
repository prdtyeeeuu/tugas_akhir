ALTER TABLE applications
  ADD COLUMN rejection_reason TEXT DEFAULT NULL;

ALTER TABLE applications
  MODIFY COLUMN status ENUM(
    'applied',
    'interviewing',
    'offered',
    'accepted',
    'declined',
    'rejected',
    'expired',
    'withdrawn'
  ) DEFAULT 'applied';
