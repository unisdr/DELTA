ALTER TABLE IF EXISTS public."user" DROP COLUMN IF EXISTS email_verification_code;
ALTER TABLE IF EXISTS public."user" DROP COLUMN IF EXISTS email_verification_sent_at;
ALTER TABLE IF EXISTS public."user" DROP COLUMN IF EXISTS email_verification_expires_at;