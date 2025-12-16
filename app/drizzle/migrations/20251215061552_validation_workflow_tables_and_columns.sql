CREATE TYPE public.entity_validation_type AS ENUM (
    'hazardous_event',
    'disaster_event',
    'disaster_records'
);

CREATE TABLE IF NOT EXISTS public.entity_validation_assignment
(
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    entity_id uuid,
    entity_type public.entity_validation_type NOT NULL,
    assigned_to_user_id uuid,
    assigned_by_user_id uuid,
    assigned_at timestamp without time zone DEFAULT NOW(),
    CONSTRAINT fk_entity_validation_assignment_user_assigned_to_user_id FOREIGN KEY (assigned_to_user_id)
        REFERENCES public."user" (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
        NOT VALID,
    CONSTRAINT fk_entity_validation_assignment_user_assigned_by_user_id FOREIGN KEY (assigned_by_user_id)
        REFERENCES public."user" (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
        NOT VALID
);

CREATE TABLE IF NOT EXISTS public.entity_validation_rejection
(
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    entity_id uuid,
    entity_type public.entity_validation_type NOT NULL,
    rejected_by_user_id uuid,
    rejection_message text,
    rejected_at timestamp without time zone DEFAULT NOW(),
    CONSTRAINT fk_entity_validation_rejection_user_rejected_by_user_id FOREIGN KEY (rejected_by_user_id)
        REFERENCES public."user" (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
        NOT VALID
);

-- Alter hazardous_event
ALTER TABLE IF EXISTS public.hazardous_event
    ADD COLUMN created_by_user_id uuid;
ALTER TABLE IF EXISTS public.hazardous_event
    ADD FOREIGN KEY (created_by_user_id)
    REFERENCES public."user" (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE NO ACTION
    NOT VALID;

ALTER TABLE IF EXISTS public.hazardous_event
    ADD COLUMN updated_by_user_id uuid;
ALTER TABLE IF EXISTS public.hazardous_event
    ADD FOREIGN KEY (updated_by_user_id)
    REFERENCES public."user" (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE NO ACTION
    NOT VALID;

ALTER TABLE IF EXISTS public.hazardous_event
    ADD COLUMN validated_by_user_id uuid;
ALTER TABLE IF EXISTS public.hazardous_event
    ADD FOREIGN KEY (validated_by_user_id)
    REFERENCES public."user" (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE NO ACTION
    NOT VALID;

ALTER TABLE IF EXISTS public.hazardous_event
    ADD COLUMN validated_at timestamp without time zone;

ALTER TABLE IF EXISTS public.hazardous_event
    ADD COLUMN published_by_user_id uuid;
ALTER TABLE IF EXISTS public.hazardous_event
    ADD FOREIGN KEY (published_by_user_id)
    REFERENCES public."user" (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE NO ACTION
    NOT VALID;
	
ALTER TABLE IF EXISTS public.hazardous_event
    ADD COLUMN published_at timestamp without time zone;


-- Alter disaster_event
ALTER TABLE IF EXISTS public.disaster_event
    ADD COLUMN created_by_user_id uuid;
ALTER TABLE IF EXISTS public.disaster_event
    ADD FOREIGN KEY (created_by_user_id)
    REFERENCES public."user" (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE NO ACTION
    NOT VALID;

ALTER TABLE IF EXISTS public.disaster_event
    ADD COLUMN updated_by_user_id uuid;
ALTER TABLE IF EXISTS public.disaster_event
    ADD FOREIGN KEY (updated_by_user_id)
    REFERENCES public."user" (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE NO ACTION
    NOT VALID;

ALTER TABLE IF EXISTS public.disaster_event
    ADD COLUMN validated_by_user_id uuid;
ALTER TABLE IF EXISTS public.disaster_event
    ADD FOREIGN KEY (validated_by_user_id)
    REFERENCES public."user" (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE NO ACTION
    NOT VALID;

ALTER TABLE IF EXISTS public.disaster_event
    ADD COLUMN validated_at timestamp without time zone;

ALTER TABLE IF EXISTS public.disaster_event
    ADD COLUMN published_by_user_id uuid;
ALTER TABLE IF EXISTS public.disaster_event
    ADD FOREIGN KEY (published_by_user_id)
    REFERENCES public."user" (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE NO ACTION
    NOT VALID;
	
ALTER TABLE IF EXISTS public.disaster_event
    ADD COLUMN published_at timestamp without time zone;


-- Alter disaster_records
ALTER TABLE IF EXISTS public.disaster_records
    ADD COLUMN created_by_user_id uuid;
ALTER TABLE IF EXISTS public.disaster_records
    ADD FOREIGN KEY (created_by_user_id)
    REFERENCES public."user" (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE NO ACTION
    NOT VALID;

ALTER TABLE IF EXISTS public.disaster_records
    ADD COLUMN updated_by_user_id uuid;
ALTER TABLE IF EXISTS public.disaster_records
    ADD FOREIGN KEY (updated_by_user_id)
    REFERENCES public."user" (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE NO ACTION
    NOT VALID;

ALTER TABLE IF EXISTS public.disaster_records
    ADD COLUMN validated_by_user_id uuid;
ALTER TABLE IF EXISTS public.disaster_records
    ADD FOREIGN KEY (validated_by_user_id)
    REFERENCES public."user" (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE NO ACTION
    NOT VALID;

ALTER TABLE IF EXISTS public.disaster_records
    ADD COLUMN validated_at timestamp without time zone;

ALTER TABLE IF EXISTS public.disaster_records
    ADD COLUMN published_by_user_id uuid;
ALTER TABLE IF EXISTS public.disaster_records
    ADD FOREIGN KEY (published_by_user_id)
    REFERENCES public."user" (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE NO ACTION
    NOT VALID;
	
ALTER TABLE IF EXISTS public.disaster_records
    ADD COLUMN published_at timestamp without time zone;