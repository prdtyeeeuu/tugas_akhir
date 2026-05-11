ALTER TABLE applications
  ADD COLUMN interview_date DATE NULL,
  ADD COLUMN interview_time TIME NULL,
  ADD COLUMN interview_method VARCHAR(50) NULL,
  ADD COLUMN interview_location VARCHAR(255) NULL;
