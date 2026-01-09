UPDATE dts_system_info
SET version_no = '0.1.4',
updated_at = NOW();

ALTER TABLE instance_system_settings
ADD COLUMN IF NOT EXISTS language VARCHAR(10) NOT NULL DEFAULT 'en';