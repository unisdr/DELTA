
ALTER TABLE IF EXISTS public.disaster_event
    ADD COLUMN submitted_by_user_id uuid;
ALTER TABLE IF EXISTS public.disaster_event
    ADD FOREIGN KEY (submitted_by_user_id)
    REFERENCES public."user" (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE NO ACTION
    NOT VALID;
	
ALTER TABLE IF EXISTS public.disaster_event
    ADD COLUMN submitted_at timestamp without time zone;



ALTER TABLE IF EXISTS public.disaster_records
    ADD COLUMN submitted_by_user_id uuid;
ALTER TABLE IF EXISTS public.disaster_records
    ADD FOREIGN KEY (submitted_by_user_id)
    REFERENCES public."user" (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE NO ACTION
    NOT VALID;
	
ALTER TABLE IF EXISTS public.disaster_records
    ADD COLUMN submitted_at timestamp without time zone;
