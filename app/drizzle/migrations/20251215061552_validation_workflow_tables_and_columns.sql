CREATE TABLE IF NOT EXISTS public.entity_validation_assignment
(
    id uuid,
    entity_id uuid,
    entity_type text,
    assigned_to_user_id uuid,
    assigned_by_user_id uuid,
    assigned_at timestamp without time zone,
    PRIMARY KEY (id),
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
    id uuid,
    entity_id uuid,
    entity_type text,
    rejected_by_user_id uuid,
    rejection_message text,
    rejected_at timestamp without time zone,
    PRIMARY KEY (id),
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