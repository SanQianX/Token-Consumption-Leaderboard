-- 002_code_column_to_text.sql
-- Widen email_verification_codes.code from VARCHAR(6) to TEXT
-- to support storing pending registration data (pending:{JSON})

ALTER TABLE email_verification_codes ALTER COLUMN code TYPE TEXT;
