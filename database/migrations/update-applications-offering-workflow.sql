ALTER TABLE applications
  MODIFY COLUMN status ENUM(
    'pending',
    'review',
    'interview',
    'diterima',
    'ditolak',
    'offering',
    'applied',
    'interviewing',
    'offered',
    'accepted',
    'declined',
    'expired',
    'withdrawn'
  ) DEFAULT 'applied';

UPDATE applications
SET status = CASE status
  WHEN 'pending' THEN 'applied'
  WHEN 'review' THEN 'applied'
  WHEN 'interview' THEN 'interviewing'
  WHEN 'offering' THEN 'offered'
  WHEN 'diterima' THEN 'accepted'
  WHEN 'ditolak' THEN 'declined'
  ELSE status
END;

ALTER TABLE applications
  MODIFY COLUMN status ENUM(
    'applied',
    'interviewing',
    'offered',
    'accepted',
    'declined',
    'expired',
    'withdrawn'
  ) DEFAULT 'applied',
  ADD COLUMN expired_at DATETIME NULL,
  ADD COLUMN document_path VARCHAR(255) NULL;
