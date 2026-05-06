DROP TABLE dev_example1;

ALTER TABLE instance_system_settings
DROP COLUMN country_name;


ALTER TABLE IF EXISTS public.disaster_event
    ADD COLUMN IF NOT EXISTS submitted_by_user_id uuid;
ALTER TABLE IF EXISTS public.disaster_event
    ADD FOREIGN KEY (submitted_by_user_id)
    REFERENCES public."user" (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE NO ACTION
    NOT VALID;
	
ALTER TABLE IF EXISTS public.disaster_event
    ADD COLUMN IF NOT EXISTS submitted_at timestamp without time zone;



ALTER TABLE IF EXISTS public.disaster_records
    ADD COLUMN IF NOT EXISTS submitted_by_user_id uuid;
ALTER TABLE IF EXISTS public.disaster_records
    ADD FOREIGN KEY (submitted_by_user_id)
    REFERENCES public."user" (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE NO ACTION
    NOT VALID;
	
ALTER TABLE IF EXISTS public.disaster_records
    ADD COLUMN IF NOT EXISTS submitted_at timestamp without time zone;

UPDATE dts_system_info
SET version_no = '0.2.2',
updated_at = NOW();