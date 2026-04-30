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