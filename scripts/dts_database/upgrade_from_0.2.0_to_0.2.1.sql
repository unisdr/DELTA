ALTER TABLE IF EXISTS public."user" DROP COLUMN IF EXISTS email_verification_code;
ALTER TABLE IF EXISTS public."user" DROP COLUMN IF EXISTS email_verification_sent_at;
ALTER TABLE IF EXISTS public."user" DROP COLUMN IF EXISTS email_verification_expires_at;

ALTER TABLE IF EXISTS public."user" 
    DROP COLUMN IF EXISTS organization;

ALTER TABLE IF EXISTS public.user_country_accounts
    ADD COLUMN organization_id uuid;
ALTER TABLE IF EXISTS public.user_country_accounts
    ADD FOREIGN KEY (organization_id)
    REFERENCES public.organization (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE NO ACTION
    NOT VALID;

ALTER TABLE countries 
ADD COLUMN type VARCHAR NOT NULL DEFAULT 'Real'
CHECK (type IN ('Real', 'Fictional'));

ALTER TABLE instance_system_settings DROP COLUMN admin_setup_complete;

UPDATE dts_system_info
SET version_no = '0.2.1',
updated_at = NOW();