-- 003_admin_and_settings.sql
-- Add admin support and configurable settings

-- Add is_admin to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Create admin settings table
CREATE TABLE IF NOT EXISTS admin_settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);

-- Insert default SMTP settings
INSERT INTO admin_settings (key, value) VALUES
  ('smtp_host', 'smtp.163.com'),
  ('smtp_port', '465'),
  ('smtp_user', ''),
  ('smtp_pass', '')
ON CONFLICT (key) DO NOTHING;
