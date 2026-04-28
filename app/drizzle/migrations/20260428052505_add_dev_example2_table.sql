-- Custom SQL migration file for dev_example2 table

CREATE TABLE public.dev_example2 (
    api_import_id text,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    field1 text NOT NULL,
    field2 text NOT NULL,
    field3 bigint NOT NULL,
    field4 bigint,
    field6 text DEFAULT 'one'::text NOT NULL,
    field7 timestamp without time zone,
    field8 text DEFAULT ''::text NOT NULL,
    repeatable_num1 integer,
    repeatable_text1 text,
    repeatable_num2 integer,
    repeatable_text2 text,
    repeatable_num3 integer,
    repeatable_text3 text,
    json_data jsonb,
    country_accounts_id uuid,
    form_status text DEFAULT 'draft'::text NOT NULL
);

ALTER TABLE ONLY public.dev_example2
    ADD CONSTRAINT dev_example2_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.dev_example2
    ADD CONSTRAINT dev_example2_api_import_id_tenant_unique UNIQUE (api_import_id, country_accounts_id);

ALTER TABLE ONLY public.dev_example2
    ADD CONSTRAINT dev_example2_country_accounts_id_country_accounts_id_fk FOREIGN KEY (country_accounts_id) REFERENCES public.country_accounts(id) ON DELETE CASCADE;
