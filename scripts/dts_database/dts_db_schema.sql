--
-- PostgreSQL database dump
--

-- Dumped from database version 16.6
-- Dumped by pg_dump version 16.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: postgis; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;


--
-- Name: EXTENSION postgis; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION postgis IS 'PostGIS geometry and geography spatial types and functions';


--
-- Name: dts_get_sector_all_idonly(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dts_get_sector_all_idonly(param_sector_id uuid) RETURNS uuid[]
    LANGUAGE plpgsql
    AS $$BEGIN
	RETURN ARRAY(
		WITH RECURSIVE ParentCTE AS (
			-- Start from the child node
			SELECT id, sectorname, parent_id
			FROM sector
			WHERE id = param_sector_id

			UNION ALL

			-- Recursively find parents
			SELECT s.id, s.sectorname, s.parent_id
			FROM sector s
			INNER JOIN ParentCTE p ON s.id = p.parent_id
		),
		ChildCTE AS (
			-- Find all descendants (children)
			SELECT id, sectorname, parent_id, level
			FROM sector
			WHERE id = param_sector_id
			UNION ALL
			SELECT t.id, t.sectorname, t.parent_id, t.level
			FROM sector t
			INNER JOIN ChildCTE c ON t.parent_id = c.id
		)
		SELECT *
		FROM (
			SELECT id FROM ParentCTE
			UNION
			SELECT id FROM ChildCTE
		) all_records
	);
END;
$$;


--
-- Name: dts_get_sector_ancestors_decentants(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dts_get_sector_ancestors_decentants(sector_id uuid) RETURNS json
    LANGUAGE sql
    AS $$
WITH RECURSIVE ParentCTE AS (
    -- Find all ancestors (parents)
    SELECT id, sectorname, parent_id, level
    FROM sector
    WHERE id = SECTOR_ID
    UNION ALL
    SELECT t.id, t.sectorname, t.parent_id, t.level
    FROM sector t
    INNER JOIN ParentCTE p ON t.id = p.parent_id
),
ChildCTE AS (
    -- Find all descendants (children)
    SELECT id, sectorname, parent_id, level
    FROM sector
    WHERE id = SECTOR_ID
    UNION ALL
    SELECT t.id, t.sectorname, t.parent_id, t.level
    FROM sector t
    INNER JOIN ChildCTE c ON t.parent_id = c.id
)
SELECT json_agg(row_to_json(all_records))
FROM (
    SELECT id, sectorname, level FROM ParentCTE WHERE level = 2
    UNION
    SELECT id, sectorname, level FROM ChildCTE
) all_records;
$$;


--
-- Name: dts_get_sector_children_idonly(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dts_get_sector_children_idonly(param_sector_id uuid) RETURNS uuid[]
    LANGUAGE plpgsql
    AS $$BEGIN
	RETURN ARRAY(
		WITH RECURSIVE ChildCTE AS (
			-- Find all descendants (children)
			SELECT id
			FROM sector
			WHERE id = param_sector_id
			UNION ALL
			SELECT t.id
			FROM sector t
			INNER JOIN ChildCTE c ON t.parent_id = c.id
		)
		SELECT id FROM ChildCTE
	);
END;
$$;


--
-- Name: dts_get_sector_decendants(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dts_get_sector_decendants(sector_id uuid) RETURNS json
    LANGUAGE sql
    AS $$
WITH RECURSIVE ChildCTE AS (
    -- Find all descendants (children)
    SELECT id, sectorname, parent_id, level
    FROM sector
    WHERE id = SECTOR_ID
    UNION ALL
    SELECT t.id, t.sectorname, t.parent_id, t.level
    FROM sector t
    INNER JOIN ChildCTE c ON t.parent_id = c.id
)
SELECT json_agg(row_to_json(all_records))
FROM (
    SELECT id, sectorname, level FROM ChildCTE
) all_records;
$$;


--
-- Name: dts_get_sector_parent_idonly(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dts_get_sector_parent_idonly(param_sector_id uuid) RETURNS uuid[]
    LANGUAGE plpgsql
    AS $$BEGIN
	RETURN ARRAY(
		WITH RECURSIVE ParentCTE AS (
		  -- Start from the child node
		  SELECT id, sectorname, parent_id
		  FROM sector
		  WHERE id = param_sector_id

		  UNION ALL

		  -- Recursively find parents
		  SELECT s.id, s.sectorname, s.parent_id
		  FROM sector s
		  INNER JOIN ParentCTE p ON s.id = p.parent_id
		)
		SELECT id FROM ParentCTE
	);
END;
$$;


--
-- Name: dts_system_info_singleton(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dts_system_info_singleton() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.id != '73f0defb-4eba-4398-84b3-5e6737fec2b7' THEN
    RAISE EXCEPTION 'Only one row with id = 73f0defb-4eba-4398-84b3-5e6737fec2b7 is allowed';
  END IF;
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: __drizzle_migrations__; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.__drizzle_migrations__ (
    id integer NOT NULL,
    hash text NOT NULL,
    created_at bigint
);


--
-- Name: __drizzle_migrations___id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.__drizzle_migrations___id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: __drizzle_migrations___id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.__drizzle_migrations___id_seq OWNED BY public.__drizzle_migrations__.id;


--
-- Name: affected; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.affected (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    dsg_id uuid NOT NULL,
    direct integer,
    indirect integer
);


--
-- Name: api_key; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.api_key (
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    secret text NOT NULL,
    name text DEFAULT ''::text NOT NULL,
    user_id uuid NOT NULL,
    country_accounts_id uuid
);


--
-- Name: asset; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.asset (
    api_import_id text,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sector_ids text NOT NULL,
    is_built_in boolean NOT NULL,
    name text NOT NULL,
    category text,
    national_id text,
    notes text,
    country_accounts_id uuid
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    table_name text NOT NULL,
    record_id text NOT NULL,
    user_id uuid NOT NULL,
    action text NOT NULL,
    old_values jsonb,
    new_values jsonb,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
    country_accounts_id uuid
);


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    parent_id uuid,
    level bigint DEFAULT 1 NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: countries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.countries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    iso3 character varying(3),
    flag_url character varying(255) DEFAULT 'https://example.com/default-flag.png'::character varying NOT NULL
);


--
-- Name: country_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.country_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    short_description character varying(20) NOT NULL,
    country_id uuid NOT NULL,
    status integer DEFAULT 1 NOT NULL,
    type character varying(20) DEFAULT 'Official'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone
);


--
-- Name: damages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.damages (
    api_import_id text,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    record_id uuid NOT NULL,
    sector_id uuid NOT NULL,
    asset_id uuid NOT NULL,
    unit text,
    total_damage_amount bigint,
    total_damage_amount_override boolean DEFAULT false NOT NULL,
    total_repair_replacement numeric,
    total_repair_replacement_override boolean DEFAULT false NOT NULL,
    total_recovery numeric,
    total_recovery_override boolean DEFAULT false NOT NULL,
    pd_damage_amount bigint,
    pd_repair_cost_unit numeric,
    pd_repair_cost_unit_currency text,
    pd_repair_cost_total numeric,
    pd_repair_cost_total_override boolean DEFAULT false NOT NULL,
    pd_recovery_cost_unit numeric,
    pd_recovery_cost_unit_currency text,
    pd_recovery_cost_total numeric,
    pd_recovery_cost_total_override boolean DEFAULT false NOT NULL,
    pd_disruption_duration_days bigint,
    pd_disruption_duration_hours bigint,
    pd_disruption_users_affected bigint,
    pd_disruption_people_affected bigint,
    pd_disruption_description text,
    td_damage_amount bigint,
    td_replacement_cost_unit numeric,
    td_replacement_cost_unit_currency text,
    td_replacement_cost_total numeric,
    td_replacement_cost_total_override boolean DEFAULT false NOT NULL,
    td_recovery_cost_unit numeric,
    td_recovery_cost_unit_currency text,
    td_recovery_cost_total numeric,
    td_recovery_cost_total_override boolean DEFAULT false NOT NULL,
    td_disruption_duration_days bigint,
    td_disruption_duration_hours bigint,
    td_disruption_users_affected bigint,
    td_disruption_people_affected bigint,
    td_disruption_description text,
    spatial_footprint jsonb,
    attachments jsonb
);


--
-- Name: deaths; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deaths (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    dsg_id uuid NOT NULL,
    deaths integer
);


--
-- Name: dev_example1; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dev_example1 (
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
    country_accounts_id uuid
);


--
-- Name: disaster_event; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.disaster_event (
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "approvalStatus" text DEFAULT 'draft'::text NOT NULL,
    api_import_id text,
    hip_hazard_id text,
    hip_cluster_id text,
    hip_type_id text,
    country_accounts_id uuid,
    id uuid NOT NULL,
    hazardous_event_id uuid,
    disaster_event_id uuid,
    national_disaster_id text DEFAULT ''::text NOT NULL,
    other_id1 text DEFAULT ''::text NOT NULL,
    other_id2 text DEFAULT ''::text NOT NULL,
    other_id3 text DEFAULT ''::text NOT NULL,
    name_national text DEFAULT ''::text NOT NULL,
    glide text DEFAULT ''::text NOT NULL,
    name_global_or_regional text DEFAULT ''::text NOT NULL,
    start_date text DEFAULT ''::text NOT NULL,
    end_date text DEFAULT ''::text NOT NULL,
    start_date_local text,
    end_date_local text,
    duration_days bigint,
    disaster_declaration text DEFAULT 'unknown'::text NOT NULL,
    disaster_declaration_type_and_effect1 text DEFAULT ''::text NOT NULL,
    disaster_declaration_date1 timestamp without time zone,
    disaster_declaration_type_and_effect2 text DEFAULT ''::text NOT NULL,
    disaster_declaration_date2 timestamp without time zone,
    disaster_declaration_type_and_effect3 text DEFAULT ''::text NOT NULL,
    disaster_declaration_date3 timestamp without time zone,
    disaster_declaration_type_and_effect4 text DEFAULT ''::text NOT NULL,
    disaster_declaration_date4 timestamp without time zone,
    disaster_declaration_type_and_effect5 text DEFAULT ''::text NOT NULL,
    disaster_declaration_date5 timestamp without time zone,
    had_official_warning_or_weather_advisory boolean DEFAULT false NOT NULL,
    official_warning_affected_areas text DEFAULT ''::text NOT NULL,
    early_action_description1 text DEFAULT ''::text NOT NULL,
    early_action_date1 timestamp without time zone,
    early_action_description2 text DEFAULT ''::text NOT NULL,
    early_action_date2 timestamp without time zone,
    early_action_description3 text DEFAULT ''::text NOT NULL,
    early_action_date3 timestamp without time zone,
    early_action_description4 text DEFAULT ''::text NOT NULL,
    early_action_date4 timestamp without time zone,
    early_action_description5 text DEFAULT ''::text NOT NULL,
    early_action_date5 timestamp without time zone,
    rapid_or_preliminary_assesment_description1 text,
    rapid_or_preliminary_assessment_date1 timestamp without time zone,
    rapid_or_preliminary_assesment_description2 text,
    rapid_or_preliminary_assessment_date2 timestamp without time zone,
    rapid_or_preliminary_assesment_description3 text,
    rapid_or_preliminary_assessment_date3 timestamp without time zone,
    rapid_or_preliminary_assesment_description4 text,
    rapid_or_preliminary_assessment_date4 timestamp without time zone,
    rapid_or_preliminary_assesment_description5 text,
    rapid_or_preliminary_assessment_date5 timestamp without time zone,
    response_oprations text DEFAULT ''::text NOT NULL,
    post_disaster_assessment_description1 text,
    post_disaster_assessment_date1 timestamp without time zone,
    post_disaster_assessment_description2 text,
    post_disaster_assessment_date2 timestamp without time zone,
    post_disaster_assessment_description3 text,
    post_disaster_assessment_date3 timestamp without time zone,
    post_disaster_assessment_description4 text,
    post_disaster_assessment_date4 timestamp without time zone,
    post_disaster_assessment_description5 text,
    post_disaster_assessment_date5 timestamp without time zone,
    other_assessment_description1 text,
    other_assessment_date1 timestamp without time zone,
    other_assessment_description2 text,
    other_assessment_date2 timestamp without time zone,
    other_assessment_description3 text,
    other_assessment_date3 timestamp without time zone,
    other_assessment_description4 text,
    other_assessment_date4 timestamp without time zone,
    other_assessment_description5 text,
    other_assessment_date5 timestamp without time zone,
    data_source text DEFAULT ''::text NOT NULL,
    recording_institution text DEFAULT ''::text NOT NULL,
    effects_total_usd numeric,
    non_economic_losses text DEFAULT ''::text NOT NULL,
    damages_subtotal_local_currency numeric,
    losses_subtotal_usd numeric,
    response_operations_description text DEFAULT ''::text NOT NULL,
    response_operations_costs_local_currency numeric,
    response_cost_total_local_currency numeric,
    response_cost_total_usd numeric,
    humanitarian_needs_description text DEFAULT ''::text NOT NULL,
    humanitarian_needs_local_currency numeric,
    humanitarian_needs_usd numeric,
    rehabilitation_costs_local_currency_calc numeric,
    rehabilitation_costs_local_currency_override numeric,
    repair_costs_local_currency_calc numeric,
    repair_costs_local_currency_override numeric,
    replacement_costs_local_currency_calc numeric,
    replacement_costs_local_currency_override numeric,
    recovery_needs_local_currency_calc numeric,
    recovery_needs_local_currency_override numeric,
    attachments jsonb,
    spatial_footprint jsonb,
    legacy_data jsonb
);


--
-- Name: disaster_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.disaster_records (
    api_import_id text,
    hip_hazard_id text,
    hip_cluster_id text,
    hip_type_id text,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    country_accounts_id uuid,
    disaster_event_id uuid,
    location_desc text,
    start_date text,
    end_date text,
    local_warn_inst text,
    primary_data_source text,
    other_data_source text,
    field_assess_date timestamp without time zone,
    assessment_modes text,
    originator_recorder_inst text DEFAULT ''::text NOT NULL,
    validated_by text DEFAULT ''::text NOT NULL,
    checked_by text,
    data_collector text,
    legacy_data jsonb,
    spatial_footprint jsonb,
    attachments jsonb,
    "approvalStatus" text DEFAULT 'draft'::text NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: displaced; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.displaced (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    dsg_id uuid NOT NULL,
    assisted text,
    timing text,
    duration text,
    as_of timestamp without time zone,
    displaced integer
);


--
-- Name: disruption; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.disruption (
    api_import_id text,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    record_id uuid NOT NULL,
    sector_id uuid NOT NULL,
    duration_days bigint,
    duration_hours bigint,
    users_affected bigint,
    people_affected bigint,
    comment text,
    response_operation text,
    response_cost numeric,
    response_currency text,
    spatial_footprint jsonb,
    attachments jsonb
);


--
-- Name: division; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.division (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    import_id text,
    national_id text,
    parent_id uuid,
    country_accounts_id uuid,
    name jsonb DEFAULT '{}'::jsonb NOT NULL,
    geojson jsonb,
    level bigint,
    geom public.geometry(Geometry,4326),
    bbox public.geometry(Geometry,4326),
    spatial_index text,
    CONSTRAINT valid_geom_check CHECK (public.st_isvalid(geom))
);


--
-- Name: dts_system_info; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dts_system_info (
    id uuid DEFAULT '73f0defb-4eba-4398-84b3-5e6737fec2b7'::uuid NOT NULL,
    installed_at timestamp without time zone,
    updated_at timestamp without time zone,
    version_no character varying(50) NOT NULL
);


--
-- Name: event; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text DEFAULT ''::text NOT NULL,
    description text DEFAULT ''::text NOT NULL
);


--
-- Name: event_relationship; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_relationship (
    parent_id uuid NOT NULL,
    child_id uuid NOT NULL,
    type text DEFAULT ''::text NOT NULL
);


--
-- Name: hazardous_event; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hazardous_event (
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "approvalStatus" text DEFAULT 'draft'::text NOT NULL,
    api_import_id text,
    hip_hazard_id text,
    hip_cluster_id text,
    hip_type_id text NOT NULL,
    id uuid NOT NULL,
    country_accounts_id uuid,
    status text DEFAULT 'pending'::text NOT NULL,
    national_specification text DEFAULT ''::text NOT NULL,
    start_date text DEFAULT ''::text NOT NULL,
    end_date text DEFAULT ''::text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    chains_explanation text DEFAULT ''::text NOT NULL,
    magniture text DEFAULT ''::text NOT NULL,
    spatial_footprint jsonb,
    attachments jsonb,
    record_originator text DEFAULT ''::text NOT NULL,
    hazardous_event_status text,
    data_source text DEFAULT ''::text NOT NULL
);


--
-- Name: hip_class; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hip_class (
    id text NOT NULL,
    name_en text DEFAULT ''::text NOT NULL,
    CONSTRAINT name_en_not_empty CHECK ((name_en <> ''::text))
);


--
-- Name: hip_cluster; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hip_cluster (
    id text NOT NULL,
    type_id text NOT NULL,
    name_en text DEFAULT ''::text NOT NULL,
    CONSTRAINT name_en_not_empty CHECK ((name_en <> ''::text))
);


--
-- Name: hip_hazard; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hip_hazard (
    id text NOT NULL,
    code text DEFAULT ''::text NOT NULL,
    cluster_id text NOT NULL,
    name_en text DEFAULT ''::text NOT NULL,
    description_en text DEFAULT ''::text NOT NULL,
    CONSTRAINT description_en_not_empty CHECK ((description_en <> ''::text)),
    CONSTRAINT name_en_not_empty CHECK ((name_en <> ''::text))
);


--
-- Name: human_category_presence; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.human_category_presence (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    record_id uuid NOT NULL,
    deaths boolean,
    injured boolean,
    missing boolean,
    affected_direct boolean,
    affected_indirect boolean,
    displaced boolean,
    deaths_total_group_column_names jsonb,
    injured_total_group_column_names jsonb,
    missing_total_group_column_names jsonb,
    affected_total_group_column_names jsonb,
    displaced_total_group_column_names jsonb,
    deaths_total bigint,
    injured_total bigint,
    missing_total bigint,
    affected_direct_total bigint,
    affected_indirect_total bigint,
    displaced_total bigint
);


--
-- Name: human_dsg; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.human_dsg (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    record_id uuid NOT NULL,
    sex text,
    age text,
    disability text,
    global_poverty_line text,
    national_poverty_line text,
    custom jsonb
);


--
-- Name: human_dsg_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.human_dsg_config (
    hidden jsonb,
    custom jsonb
);


--
-- Name: injured; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.injured (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    dsg_id uuid NOT NULL,
    injured integer
);


--
-- Name: instance_system_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.instance_system_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    footer_url_privacy_policy character varying,
    footer_url_terms_conditions character varying,
    admin_setup_complete boolean DEFAULT false NOT NULL,
    website_logo character varying DEFAULT '/assets/country-instance-logo.png'::character varying NOT NULL,
    website_name character varying(250) DEFAULT 'DELTA Resilience'::character varying NOT NULL,
    "approvedRecordsArePublic" boolean DEFAULT false NOT NULL,
    totp_issuer character varying(250) DEFAULT 'example-app'::character varying NOT NULL,
    dts_instance_type character varying DEFAULT 'country'::character varying NOT NULL,
    dts_instance_ctry_iso3 character varying DEFAULT ''::character varying NOT NULL,
    currency_code character varying DEFAULT 'USD'::character varying NOT NULL,
    country_name character varying DEFAULT 'United State of America'::character varying NOT NULL,
    country_accounts_id uuid
);


--
-- Name: losses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.losses (
    api_import_id text,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    record_id uuid NOT NULL,
    sector_id uuid NOT NULL,
    sector_is_agriculture boolean NOT NULL,
    type_not_agriculture text,
    type_agriculture text,
    related_to_not_agriculture text,
    related_to_agriculture text,
    description text,
    public_value_unit text,
    public_units bigint,
    public_cost_unit numeric,
    public_cost_unit_currency text,
    public_cost_total numeric,
    public_cost_total_override boolean DEFAULT false NOT NULL,
    private_value_unit text,
    private_units bigint,
    private_cost_unit numeric,
    private_cost_unit_currency text,
    private_cost_total numeric,
    private_cost_total_override boolean DEFAULT false NOT NULL,
    spatial_footprint jsonb,
    attachments jsonb
);


--
-- Name: missing; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.missing (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    dsg_id uuid NOT NULL,
    as_of timestamp without time zone,
    missing integer
);


--
-- Name: noneco_losses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.noneco_losses (
    api_import_id text,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    disaster_record_id uuid NOT NULL,
    category_id uuid NOT NULL,
    description text NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: sector; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sector (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    parent_id uuid,
    sectorname text NOT NULL,
    description text,
    level bigint DEFAULT 1 NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: sector_disaster_records_relation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sector_disaster_records_relation (
    api_import_id text,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sector_id uuid NOT NULL,
    disaster_record_id uuid NOT NULL,
    with_damage boolean,
    damage_cost numeric,
    damage_cost_currency text,
    damage_recovery_cost numeric,
    damage_recovery_cost_currency text,
    with_disruption boolean,
    with_losses boolean,
    losses_cost numeric,
    losses_cost_currency text
);


--
-- Name: session; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.session (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    last_active_at timestamp without time zone DEFAULT '2000-01-01 00:00:00'::timestamp without time zone NOT NULL,
    totp_authed boolean DEFAULT false NOT NULL
);


--
-- Name: super_admin_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.super_admin_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    first_name character varying(150),
    last_name character varying(150),
    email character varying(254) NOT NULL,
    password character varying(100) NOT NULL
);


--
-- Name: user; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."user" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    first_name text DEFAULT ''::text NOT NULL,
    last_name text DEFAULT ''::text NOT NULL,
    email text NOT NULL,
    password text DEFAULT ''::text NOT NULL,
    email_verified boolean DEFAULT false NOT NULL,
    email_verification_code text DEFAULT ''::text NOT NULL,
    email_verification_sent_at timestamp without time zone,
    email_verification_expires_at timestamp without time zone DEFAULT '2000-01-01 00:00:00'::timestamp without time zone NOT NULL,
    invite_code text DEFAULT ''::text NOT NULL,
    invite_sent_at timestamp without time zone,
    invite_expires_at timestamp without time zone DEFAULT '2000-01-01 00:00:00'::timestamp without time zone NOT NULL,
    reset_password_token text DEFAULT ''::text NOT NULL,
    reset_password_expires_at timestamp without time zone DEFAULT '2000-01-01 00:00:00'::timestamp without time zone NOT NULL,
    totp_enabled boolean DEFAULT false NOT NULL,
    totp_secret text DEFAULT ''::text NOT NULL,
    totp_secret_url text DEFAULT ''::text NOT NULL,
    organization text DEFAULT ''::text NOT NULL,
    hydromet_che_user boolean DEFAULT false NOT NULL,
    auth_type text DEFAULT 'form'::text NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: user_country_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_country_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    country_accounts_id uuid NOT NULL,
    role character varying(100) NOT NULL,
    is_primary_admin boolean DEFAULT false NOT NULL,
    added_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: __drizzle_migrations__ id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.__drizzle_migrations__ ALTER COLUMN id SET DEFAULT nextval('public.__drizzle_migrations___id_seq'::regclass);


--
-- Name: __drizzle_migrations__ __drizzle_migrations___pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.__drizzle_migrations__
    ADD CONSTRAINT __drizzle_migrations___pkey PRIMARY KEY (id);


--
-- Name: affected affected_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.affected
    ADD CONSTRAINT affected_pkey PRIMARY KEY (id);


--
-- Name: api_key api_key_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_key
    ADD CONSTRAINT api_key_pkey PRIMARY KEY (id);


--
-- Name: api_key api_key_secret_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_key
    ADD CONSTRAINT api_key_secret_unique UNIQUE (secret);


--
-- Name: asset asset_api_import_id_tenant_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset
    ADD CONSTRAINT asset_api_import_id_tenant_unique UNIQUE (api_import_id, country_accounts_id);


--
-- Name: asset asset_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset
    ADD CONSTRAINT asset_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: countries countries_iso3_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.countries
    ADD CONSTRAINT countries_iso3_unique UNIQUE (iso3);


--
-- Name: countries countries_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.countries
    ADD CONSTRAINT countries_name_unique UNIQUE (name);


--
-- Name: countries countries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.countries
    ADD CONSTRAINT countries_pkey PRIMARY KEY (id);


--
-- Name: country_accounts country_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.country_accounts
    ADD CONSTRAINT country_accounts_pkey PRIMARY KEY (id);


--
-- Name: damages damages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.damages
    ADD CONSTRAINT damages_pkey PRIMARY KEY (id);


--
-- Name: deaths deaths_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deaths
    ADD CONSTRAINT deaths_pkey PRIMARY KEY (id);


--
-- Name: dev_example1 dev_example1_api_import_id_tenant_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dev_example1
    ADD CONSTRAINT dev_example1_api_import_id_tenant_unique UNIQUE (api_import_id, country_accounts_id);


--
-- Name: dev_example1 dev_example1_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dev_example1
    ADD CONSTRAINT dev_example1_pkey PRIMARY KEY (id);


--
-- Name: disaster_event disaster_event_api_import_id_tenant_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disaster_event
    ADD CONSTRAINT disaster_event_api_import_id_tenant_unique UNIQUE (api_import_id, country_accounts_id);


--
-- Name: disaster_event disaster_event_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disaster_event
    ADD CONSTRAINT disaster_event_pkey PRIMARY KEY (id);


--
-- Name: disaster_records disaster_records_api_import_id_tenant_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disaster_records
    ADD CONSTRAINT disaster_records_api_import_id_tenant_unique UNIQUE (api_import_id, country_accounts_id);


--
-- Name: disaster_records disaster_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disaster_records
    ADD CONSTRAINT disaster_records_pkey PRIMARY KEY (id);


--
-- Name: displaced displaced_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.displaced
    ADD CONSTRAINT displaced_pkey PRIMARY KEY (id);


--
-- Name: disruption disruption_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disruption
    ADD CONSTRAINT disruption_pkey PRIMARY KEY (id);


--
-- Name: division division_national_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.division
    ADD CONSTRAINT division_national_id_unique UNIQUE (national_id);


--
-- Name: division division_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.division
    ADD CONSTRAINT division_pkey PRIMARY KEY (id);


--
-- Name: dts_system_info dts_system_info_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dts_system_info
    ADD CONSTRAINT dts_system_info_pkey PRIMARY KEY (id);


--
-- Name: event event_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event
    ADD CONSTRAINT event_pkey PRIMARY KEY (id);


--
-- Name: hazardous_event hazardous_event_api_import_id_tenant_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hazardous_event
    ADD CONSTRAINT hazardous_event_api_import_id_tenant_unique UNIQUE (api_import_id, country_accounts_id);


--
-- Name: hazardous_event hazardous_event_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hazardous_event
    ADD CONSTRAINT hazardous_event_pkey PRIMARY KEY (id);


--
-- Name: hip_class hip_class_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hip_class
    ADD CONSTRAINT hip_class_pkey PRIMARY KEY (id);


--
-- Name: hip_cluster hip_cluster_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hip_cluster
    ADD CONSTRAINT hip_cluster_pkey PRIMARY KEY (id);


--
-- Name: hip_hazard hip_hazard_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hip_hazard
    ADD CONSTRAINT hip_hazard_pkey PRIMARY KEY (id);


--
-- Name: human_category_presence human_category_presence_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.human_category_presence
    ADD CONSTRAINT human_category_presence_pkey PRIMARY KEY (id);


--
-- Name: human_dsg human_dsg_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.human_dsg
    ADD CONSTRAINT human_dsg_pkey PRIMARY KEY (id);


--
-- Name: injured injured_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.injured
    ADD CONSTRAINT injured_pkey PRIMARY KEY (id);


--
-- Name: instance_system_settings instance_system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instance_system_settings
    ADD CONSTRAINT instance_system_settings_pkey PRIMARY KEY (id);


--
-- Name: losses losses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.losses
    ADD CONSTRAINT losses_pkey PRIMARY KEY (id);


--
-- Name: missing missing_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.missing
    ADD CONSTRAINT missing_pkey PRIMARY KEY (id);


--
-- Name: noneco_losses noneco_losses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.noneco_losses
    ADD CONSTRAINT noneco_losses_pkey PRIMARY KEY (id);


--
-- Name: noneco_losses nonecolosses_sectorIdx; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.noneco_losses
    ADD CONSTRAINT "nonecolosses_sectorIdx" UNIQUE (disaster_record_id, category_id);


--
-- Name: sector_disaster_records_relation sector_disaster_records_relation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sector_disaster_records_relation
    ADD CONSTRAINT sector_disaster_records_relation_pkey PRIMARY KEY (id);


--
-- Name: sector_disaster_records_relation sector_disaster_records_relation_sector_id_disaster_record_id; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sector_disaster_records_relation
    ADD CONSTRAINT sector_disaster_records_relation_sector_id_disaster_record_id UNIQUE (sector_id, disaster_record_id);


--
-- Name: sector sector_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sector
    ADD CONSTRAINT sector_pkey PRIMARY KEY (id);


--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (id);


--
-- Name: super_admin_users super_admin_users_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.super_admin_users
    ADD CONSTRAINT super_admin_users_email_unique UNIQUE (email);


--
-- Name: super_admin_users super_admin_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.super_admin_users
    ADD CONSTRAINT super_admin_users_pkey PRIMARY KEY (id);


--
-- Name: user_country_accounts user_country_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_country_accounts
    ADD CONSTRAINT user_country_accounts_pkey PRIMARY KEY (id);


--
-- Name: user user_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_email_unique UNIQUE (email);


--
-- Name: user user_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (id);


--
-- Name: division_level_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX division_level_idx ON public.division USING btree (level);


--
-- Name: parent_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX parent_idx ON public.division USING btree (parent_id);


--
-- Name: tenant_import_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX tenant_import_id_idx ON public.division USING btree (country_accounts_id, import_id);


--
-- Name: tenant_national_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX tenant_national_id_idx ON public.division USING btree (country_accounts_id, national_id);


--
-- Name: dts_system_info dts_system_info_singleton_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER dts_system_info_singleton_guard BEFORE INSERT OR UPDATE ON public.dts_system_info FOR EACH ROW EXECUTE FUNCTION public.dts_system_info_singleton();


--
-- Name: affected affected_dsg_id_human_dsg_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.affected
    ADD CONSTRAINT affected_dsg_id_human_dsg_id_fk FOREIGN KEY (dsg_id) REFERENCES public.human_dsg(id);


--
-- Name: api_key api_key_country_accounts_id_country_accounts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_key
    ADD CONSTRAINT api_key_country_accounts_id_country_accounts_id_fk FOREIGN KEY (country_accounts_id) REFERENCES public.country_accounts(id) ON DELETE CASCADE;


--
-- Name: api_key api_key_user_id_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_key
    ADD CONSTRAINT api_key_user_id_user_id_fk FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: asset asset_country_accounts_id_country_accounts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset
    ADD CONSTRAINT asset_country_accounts_id_country_accounts_id_fk FOREIGN KEY (country_accounts_id) REFERENCES public.country_accounts(id) ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_country_accounts_id_country_accounts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_country_accounts_id_country_accounts_id_fk FOREIGN KEY (country_accounts_id) REFERENCES public.country_accounts(id) ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_user_id_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_user_id_fk FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: categories categories_parent_id_categories_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_parent_id_categories_id_fk FOREIGN KEY (parent_id) REFERENCES public.categories(id);


--
-- Name: country_accounts country_accounts_country_id_countries_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.country_accounts
    ADD CONSTRAINT country_accounts_country_id_countries_id_fk FOREIGN KEY (country_id) REFERENCES public.countries(id);


--
-- Name: damages damages_asset_id_asset_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.damages
    ADD CONSTRAINT damages_asset_id_asset_id_fk FOREIGN KEY (asset_id) REFERENCES public.asset(id);


--
-- Name: damages damages_record_id_disaster_records_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.damages
    ADD CONSTRAINT damages_record_id_disaster_records_id_fk FOREIGN KEY (record_id) REFERENCES public.disaster_records(id);


--
-- Name: damages damages_sector_id_sector_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.damages
    ADD CONSTRAINT damages_sector_id_sector_id_fk FOREIGN KEY (sector_id) REFERENCES public.sector(id);


--
-- Name: deaths deaths_dsg_id_human_dsg_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deaths
    ADD CONSTRAINT deaths_dsg_id_human_dsg_id_fk FOREIGN KEY (dsg_id) REFERENCES public.human_dsg(id);


--
-- Name: dev_example1 dev_example1_country_accounts_id_country_accounts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dev_example1
    ADD CONSTRAINT dev_example1_country_accounts_id_country_accounts_id_fk FOREIGN KEY (country_accounts_id) REFERENCES public.country_accounts(id) ON DELETE CASCADE;


--
-- Name: disaster_event disaster_event_country_accounts_id_country_accounts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disaster_event
    ADD CONSTRAINT disaster_event_country_accounts_id_country_accounts_id_fk FOREIGN KEY (country_accounts_id) REFERENCES public.country_accounts(id) ON DELETE CASCADE;


--
-- Name: disaster_event disaster_event_disaster_event_id_disaster_event_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disaster_event
    ADD CONSTRAINT disaster_event_disaster_event_id_disaster_event_id_fk FOREIGN KEY (disaster_event_id) REFERENCES public.disaster_event(id);


--
-- Name: disaster_event disaster_event_hazardous_event_id_hazardous_event_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disaster_event
    ADD CONSTRAINT disaster_event_hazardous_event_id_hazardous_event_id_fk FOREIGN KEY (hazardous_event_id) REFERENCES public.hazardous_event(id);


--
-- Name: disaster_event disaster_event_hip_cluster_id_hip_cluster_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disaster_event
    ADD CONSTRAINT disaster_event_hip_cluster_id_hip_cluster_id_fk FOREIGN KEY (hip_cluster_id) REFERENCES public.hip_cluster(id);


--
-- Name: disaster_event disaster_event_hip_hazard_id_hip_hazard_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disaster_event
    ADD CONSTRAINT disaster_event_hip_hazard_id_hip_hazard_id_fk FOREIGN KEY (hip_hazard_id) REFERENCES public.hip_hazard(id);


--
-- Name: disaster_event disaster_event_hip_type_id_hip_class_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disaster_event
    ADD CONSTRAINT disaster_event_hip_type_id_hip_class_id_fk FOREIGN KEY (hip_type_id) REFERENCES public.hip_class(id);


--
-- Name: disaster_event disaster_event_id_event_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disaster_event
    ADD CONSTRAINT disaster_event_id_event_id_fk FOREIGN KEY (id) REFERENCES public.event(id);


--
-- Name: disaster_records disaster_records_country_accounts_id_country_accounts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disaster_records
    ADD CONSTRAINT disaster_records_country_accounts_id_country_accounts_id_fk FOREIGN KEY (country_accounts_id) REFERENCES public.country_accounts(id) ON DELETE CASCADE;


--
-- Name: disaster_records disaster_records_disaster_event_id_disaster_event_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disaster_records
    ADD CONSTRAINT disaster_records_disaster_event_id_disaster_event_id_fk FOREIGN KEY (disaster_event_id) REFERENCES public.disaster_event(id);


--
-- Name: disaster_records disaster_records_hip_cluster_id_hip_cluster_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disaster_records
    ADD CONSTRAINT disaster_records_hip_cluster_id_hip_cluster_id_fk FOREIGN KEY (hip_cluster_id) REFERENCES public.hip_cluster(id);


--
-- Name: disaster_records disaster_records_hip_hazard_id_hip_hazard_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disaster_records
    ADD CONSTRAINT disaster_records_hip_hazard_id_hip_hazard_id_fk FOREIGN KEY (hip_hazard_id) REFERENCES public.hip_hazard(id);


--
-- Name: disaster_records disaster_records_hip_type_id_hip_class_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disaster_records
    ADD CONSTRAINT disaster_records_hip_type_id_hip_class_id_fk FOREIGN KEY (hip_type_id) REFERENCES public.hip_class(id);


--
-- Name: displaced displaced_dsg_id_human_dsg_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.displaced
    ADD CONSTRAINT displaced_dsg_id_human_dsg_id_fk FOREIGN KEY (dsg_id) REFERENCES public.human_dsg(id);


--
-- Name: disruption disruption_record_id_disaster_records_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disruption
    ADD CONSTRAINT disruption_record_id_disaster_records_id_fk FOREIGN KEY (record_id) REFERENCES public.disaster_records(id);


--
-- Name: disruption disruption_sector_id_sector_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disruption
    ADD CONSTRAINT disruption_sector_id_sector_id_fk FOREIGN KEY (sector_id) REFERENCES public.sector(id);


--
-- Name: division division_country_accounts_id_country_accounts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.division
    ADD CONSTRAINT division_country_accounts_id_country_accounts_id_fk FOREIGN KEY (country_accounts_id) REFERENCES public.country_accounts(id);


--
-- Name: division division_parent_id_division_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.division
    ADD CONSTRAINT division_parent_id_division_id_fk FOREIGN KEY (parent_id) REFERENCES public.division(id);


--
-- Name: event_relationship event_relationship_child_id_event_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_relationship
    ADD CONSTRAINT event_relationship_child_id_event_id_fk FOREIGN KEY (child_id) REFERENCES public.event(id);


--
-- Name: event_relationship event_relationship_parent_id_event_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_relationship
    ADD CONSTRAINT event_relationship_parent_id_event_id_fk FOREIGN KEY (parent_id) REFERENCES public.event(id);


--
-- Name: hazardous_event hazardous_event_country_accounts_id_country_accounts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hazardous_event
    ADD CONSTRAINT hazardous_event_country_accounts_id_country_accounts_id_fk FOREIGN KEY (country_accounts_id) REFERENCES public.country_accounts(id);


--
-- Name: hazardous_event hazardous_event_hip_cluster_id_hip_cluster_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hazardous_event
    ADD CONSTRAINT hazardous_event_hip_cluster_id_hip_cluster_id_fk FOREIGN KEY (hip_cluster_id) REFERENCES public.hip_cluster(id);


--
-- Name: hazardous_event hazardous_event_hip_hazard_id_hip_hazard_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hazardous_event
    ADD CONSTRAINT hazardous_event_hip_hazard_id_hip_hazard_id_fk FOREIGN KEY (hip_hazard_id) REFERENCES public.hip_hazard(id);


--
-- Name: hazardous_event hazardous_event_hip_type_id_hip_class_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hazardous_event
    ADD CONSTRAINT hazardous_event_hip_type_id_hip_class_id_fk FOREIGN KEY (hip_type_id) REFERENCES public.hip_class(id);


--
-- Name: hazardous_event hazardous_event_id_event_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hazardous_event
    ADD CONSTRAINT hazardous_event_id_event_id_fk FOREIGN KEY (id) REFERENCES public.event(id);


--
-- Name: hip_cluster hip_cluster_type_id_hip_class_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hip_cluster
    ADD CONSTRAINT hip_cluster_type_id_hip_class_id_fk FOREIGN KEY (type_id) REFERENCES public.hip_class(id);


--
-- Name: hip_hazard hip_hazard_cluster_id_hip_cluster_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hip_hazard
    ADD CONSTRAINT hip_hazard_cluster_id_hip_cluster_id_fk FOREIGN KEY (cluster_id) REFERENCES public.hip_cluster(id);


--
-- Name: human_category_presence human_category_presence_record_id_disaster_records_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.human_category_presence
    ADD CONSTRAINT human_category_presence_record_id_disaster_records_id_fk FOREIGN KEY (record_id) REFERENCES public.disaster_records(id);


--
-- Name: human_dsg human_dsg_record_id_disaster_records_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.human_dsg
    ADD CONSTRAINT human_dsg_record_id_disaster_records_id_fk FOREIGN KEY (record_id) REFERENCES public.disaster_records(id);


--
-- Name: injured injured_dsg_id_human_dsg_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.injured
    ADD CONSTRAINT injured_dsg_id_human_dsg_id_fk FOREIGN KEY (dsg_id) REFERENCES public.human_dsg(id);


--
-- Name: instance_system_settings instance_system_settings_country_accounts_id_country_accounts_i; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instance_system_settings
    ADD CONSTRAINT instance_system_settings_country_accounts_id_country_accounts_i FOREIGN KEY (country_accounts_id) REFERENCES public.country_accounts(id) ON DELETE CASCADE;


--
-- Name: losses losses_record_id_disaster_records_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.losses
    ADD CONSTRAINT losses_record_id_disaster_records_id_fk FOREIGN KEY (record_id) REFERENCES public.disaster_records(id);


--
-- Name: losses losses_sector_id_sector_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.losses
    ADD CONSTRAINT losses_sector_id_sector_id_fk FOREIGN KEY (sector_id) REFERENCES public.sector(id);


--
-- Name: missing missing_dsg_id_human_dsg_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.missing
    ADD CONSTRAINT missing_dsg_id_human_dsg_id_fk FOREIGN KEY (dsg_id) REFERENCES public.human_dsg(id);


--
-- Name: noneco_losses noneco_losses_category_id_categories_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.noneco_losses
    ADD CONSTRAINT noneco_losses_category_id_categories_id_fk FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- Name: noneco_losses noneco_losses_disaster_record_id_disaster_records_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.noneco_losses
    ADD CONSTRAINT noneco_losses_disaster_record_id_disaster_records_id_fk FOREIGN KEY (disaster_record_id) REFERENCES public.disaster_records(id);


--
-- Name: sector_disaster_records_relation sector_disaster_records_relation_disaster_record_id_disaster_re; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sector_disaster_records_relation
    ADD CONSTRAINT sector_disaster_records_relation_disaster_record_id_disaster_re FOREIGN KEY (disaster_record_id) REFERENCES public.disaster_records(id);


--
-- Name: sector_disaster_records_relation sector_disaster_records_relation_sector_id_sector_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sector_disaster_records_relation
    ADD CONSTRAINT sector_disaster_records_relation_sector_id_sector_id_fk FOREIGN KEY (sector_id) REFERENCES public.sector(id);


--
-- Name: sector sector_parent_id_sector_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sector
    ADD CONSTRAINT sector_parent_id_sector_id_fk FOREIGN KEY (parent_id) REFERENCES public.sector(id);


--
-- Name: session session_user_id_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_user_id_user_id_fk FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: user_country_accounts user_country_accounts_country_accounts_id_country_accounts_id_f; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_country_accounts
    ADD CONSTRAINT user_country_accounts_country_accounts_id_country_accounts_id_f FOREIGN KEY (country_accounts_id) REFERENCES public.country_accounts(id) ON DELETE CASCADE;


--
-- Name: user_country_accounts user_country_accounts_user_id_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_country_accounts
    ADD CONSTRAINT user_country_accounts_user_id_user_id_fk FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

-- Adding Initial Data

-- Populating 224 county list based on preventionweb: https://data.undrr.org/api/json/preventionweb/countries-territories/1.0.0/
INSERT INTO public.countries (id, name, iso3, flag_url)
VALUES
('704e8850-d5e2-422c-956c-bce5312ab266', 'Afghanistan', 'AFG', 'https://www.preventionweb.net/assets/shared/images/flags/afg.jpg'),
('e34ef71f-0a72-40c4-a6e0-dd19fb26f391', 'Albania', 'ALB', 'https://www.preventionweb.net/assets/shared/images/flags/alb.jpg'),
('4af50751-bfb0-4ca3-a4b3-d8c2ad6ec62d', 'Algeria', 'DZA', 'https://www.preventionweb.net/assets/shared/images/flags/dza.jpg'),
('11750269-2ff2-449f-b10e-c3bd88487298', 'American Samoa', 'ASM', 'https://www.preventionweb.net/assets/shared/images/flags/asm.jpg'),
('1b641fce-aca9-4522-ba15-f620fa0f309b', 'Andorra', 'AND', 'https://www.preventionweb.net/assets/shared/images/flags/and.jpg'),
('73de5df3-592a-45cd-8e18-254af7dc7b8e', 'Angola', 'AGO', 'https://www.preventionweb.net/assets/shared/images/flags/ago.jpg'),
('79725a26-9fa4-4b1a-8a5b-ea2c9d3a9ded', 'Anguilla', 'AIA', 'https://www.preventionweb.net/assets/shared/images/flags/aia.jpg'),
('41b0d20a-0d98-46df-b389-710ac0c96427', 'Antigua and Barbuda', 'ATG', 'https://www.preventionweb.net/assets/shared/images/flags/atg.jpg'),
('525434cb-f24b-4f47-8bda-4ba50754a129', 'Argentina', 'ARG', 'https://www.preventionweb.net/assets/shared/images/flags/arg.jpg'),
('eef26331-4334-4951-b990-8cee438e9fb5', 'Armenia', 'ARM', 'https://www.preventionweb.net/assets/shared/images/flags/arm.jpg'),
('0e7a6922-7f98-4496-9864-534322b8aead', 'Aruba', 'ABW', 'https://www.preventionweb.net/assets/shared/images/flags/abw.jpg'),
('b16ec05d-7dac-4c99-b0ba-ac3e7d4cabee', 'Australia', 'AUS', 'https://www.preventionweb.net/assets/shared/images/flags/aus.jpg'),
('82f05a87-4bbd-49ef-85b3-cb54deff0234', 'Austria', 'AUT', 'https://www.preventionweb.net/assets/shared/images/flags/aut.jpg'),
('1804c265-07cd-4226-8bd2-437b94577fb8', 'Azerbaijan', 'AZE', 'https://www.preventionweb.net/assets/shared/images/flags/aze.jpg'),
('0098f8c0-0b0d-4823-986d-bea7b6c48705', 'Bahamas', 'BHS', 'https://www.preventionweb.net/assets/shared/images/flags/bhs.jpg'),
('02c66fc5-c640-43b4-95ea-37b4d047f9a7', 'Bahrain', 'BHR', 'https://www.preventionweb.net/assets/shared/images/flags/bhr.jpg'),
('a0f72f40-4f17-4c96-99ad-5fbfd2847035', 'Bangladesh', 'BGD', 'https://www.preventionweb.net/assets/shared/images/flags/bgd.jpg'),
('9314d619-344f-431c-9ea2-4970bbbf174a', 'Barbados', 'BRB', 'https://www.preventionweb.net/assets/shared/images/flags/brb.jpg'),
('d78ea2e2-cde2-416b-b95e-855b81fdaa9b', 'Belarus', 'BLR', 'https://www.preventionweb.net/assets/shared/images/flags/blr.jpg'),
('b1a8f7b4-c21e-4885-afd2-076551fbc0c0', 'Belgium', 'BEL', 'https://www.preventionweb.net/assets/shared/images/flags/bel.jpg'),
('7e129d0f-8c45-45cd-bf91-a3c0551cef02', 'Belize', 'BLZ', 'https://www.preventionweb.net/assets/shared/images/flags/blz.jpg'),
('8a6c4b24-b4df-407a-8d75-aae50859be7b', 'Benin', 'BEN', 'https://www.preventionweb.net/assets/shared/images/flags/ben.jpg'),
('2ccafa00-33e6-4faf-b519-9e02ba28a02f', 'Bermuda', 'BMU', 'https://www.preventionweb.net/assets/shared/images/flags/bmu.jpg'),
('863228a9-e58b-46a2-8f9e-26f080c84fe5', 'Bhutan', 'BTN', 'https://www.preventionweb.net/assets/shared/images/flags/btn.jpg'),
('0a9a548f-6a1b-4b40-9525-385367d72a20', 'Bolivia, Plurinational State of', 'BOL', 'https://www.preventionweb.net/assets/shared/images/flags/bol.jpg'),
('c71424c6-cc7a-4a0a-bfd4-04ff99e2bb89', 'Bosnia and Herzegovina', 'BIH', 'https://www.preventionweb.net/assets/shared/images/flags/bih.jpg'),
('b8ff3d2b-05de-43cb-8576-5b158d6231bb', 'Botswana', 'BWA', 'https://www.preventionweb.net/assets/shared/images/flags/bwa.jpg'),
('0ecbd87d-aaaf-47ac-a60a-fa674765aef6', 'Brazil', 'BRA', 'https://www.preventionweb.net/assets/shared/images/flags/bra.jpg'),
('b5fc1969-6154-4fbf-ba66-1d92e0aae3bf', 'British Virgin Islands', 'VGB', 'https://www.preventionweb.net/assets/shared/images/flags/vgb.jpg'),
('a9d19d4c-febe-4f78-8abe-fbffe066d4fd', 'Brunei Darussalam', 'BRN', 'https://www.preventionweb.net/assets/shared/images/flags/brn.jpg'),
('624484cc-ae6b-4840-a821-fbb92241d52f', 'Bulgaria', 'BGR', 'https://www.preventionweb.net/assets/shared/images/flags/bgr.jpg'),
('05d675c7-3470-43b5-b980-f5351c3ad5af', 'Burkina Faso', 'BFA', 'https://www.preventionweb.net/assets/shared/images/flags/bfa.jpg'),
('243fd43c-b48b-4a04-adce-27218d08b1b8', 'Burundi', 'BDI', 'https://www.preventionweb.net/assets/shared/images/flags/bdi.jpg'),
('362fdfac-8cc9-4cd4-8681-b4466fd90723', 'Cabo Verde', 'CPV', 'https://www.preventionweb.net/assets/shared/images/flags/cpv.jpg'),
('fd5329fe-8c60-4d39-9ecb-d104478be2f9', 'Cambodia', 'KHM', 'https://www.preventionweb.net/assets/shared/images/flags/khm.jpg'),
('a06d7bdf-5701-461a-ba79-f412bce04697', 'Cameroon', 'CMR', 'https://www.preventionweb.net/assets/shared/images/flags/cmr.jpg'),
('5834ea4e-e957-4ee8-bcee-6da279082297', 'Canada', 'CAN', 'https://www.preventionweb.net/assets/shared/images/flags/can.jpg'),
('da7576aa-dde4-4ddb-b068-0ce17dc66f60', 'Cayman Islands', 'CYM', 'https://www.preventionweb.net/assets/shared/images/flags/cym.jpg'),
('07f25a89-5f8f-4c23-80e7-0ea090b93c4e', 'Central African Republic', 'CAF', 'https://www.preventionweb.net/assets/shared/images/flags/caf.jpg'),
('596cd94b-4946-4611-9f12-3ab8ccf99738', 'Chad', 'TCD', 'https://www.preventionweb.net/assets/shared/images/flags/tcd.jpg'),
('ef03d376-4822-4170-9f5e-883ff29c7339', 'Chile', 'CHL', 'https://www.preventionweb.net/assets/shared/images/flags/chl.jpg'),
('0874fc23-f2b0-4fab-bfba-5bb49694b36a', 'China', 'CHN', 'https://www.preventionweb.net/assets/shared/images/flags/chn.jpg'),
('9022dd46-8bd5-4040-b7da-368662f404f9', 'Colombia', 'COL', 'https://www.preventionweb.net/assets/shared/images/flags/col.jpg'),
('7be1ad90-410c-40c7-824d-fecf25210b18', 'Comoros', 'COM', 'https://www.preventionweb.net/assets/shared/images/flags/com.jpg'),
('4df6f7ed-795e-4566-ab05-b9992bba1028', 'Democratic Republic of the Congo', 'COD', 'https://www.preventionweb.net/assets/shared/images/flags/cod.jpg'),
('bb380c1d-380b-4da4-a80c-06e4b0f1f29c', 'Republic of the Congo', 'COG', 'https://www.preventionweb.net/assets/shared/images/flags/cog.jpg'),
('f05e985a-002e-40e6-9606-f2a5c61df76d', 'Cook Islands', 'COK', 'https://www.preventionweb.net/assets/shared/images/flags/cok.jpg'),
('198840e9-051f-45ae-a3e8-f625e76c403f', 'Costa Rica', 'CRI', 'https://www.preventionweb.net/assets/shared/images/flags/cri.jpg'),
('643d576d-d4e0-473e-b3b7-b0c5c0852817', 'Côte d''Ivoire', 'CIV', 'https://www.preventionweb.net/assets/shared/images/flags/civ.jpg'),
('9e06c44b-3f0f-4408-8e2c-c7ef63b00ef0', 'Croatia', 'HRV', 'https://www.preventionweb.net/assets/shared/images/flags/hrv.jpg'),
('c014465d-8134-4d74-92cc-783eec7e2cf2', 'Cuba', 'CUB', 'https://www.preventionweb.net/assets/shared/images/flags/cub.jpg'),
('f3cb925b-e831-46b8-8650-7faeab52ed9e', 'Cyprus', 'CYP', 'https://www.preventionweb.net/assets/shared/images/flags/cyp.jpg'),
('c4539af0-327c-4815-add9-3c50947da988', 'Czech Republic', 'CZE', 'https://www.preventionweb.net/assets/shared/images/flags/cze.jpg'),
('2c91b114-af80-42b0-ba1b-f9dd3b7803c6', 'Denmark', 'DNK', 'https://www.preventionweb.net/assets/shared/images/flags/dnk.jpg'),
('3db53449-8e33-43b8-8735-013147400d70', 'Djibouti', 'DJI', 'https://www.preventionweb.net/assets/shared/images/flags/dji.jpg'),
('63305a07-314a-442a-a623-fa3df20dc056', 'Dominica', 'DMA', 'https://www.preventionweb.net/assets/shared/images/flags/dma.jpg'),
('5deaedca-f182-47f6-8e78-462241780bf9', 'Dominican Republic', 'DOM', 'https://www.preventionweb.net/assets/shared/images/flags/dom.jpg'),
('3ef546c0-b52c-4240-bcbc-beac2d28bc1d', 'Ecuador', 'ECU', 'https://www.preventionweb.net/assets/shared/images/flags/ecu.jpg'),
('89d14089-cf2c-40b5-ae92-84221166f578', 'Egypt', 'EGY', 'https://www.preventionweb.net/assets/shared/images/flags/egy.jpg'),
('ea935731-1ece-4bf0-88f2-1bf6cecd297f', 'El Salvador', 'SLV', 'https://www.preventionweb.net/assets/shared/images/flags/slv.jpg'),
('e4cc9a9b-f397-4f41-807b-49599e82f8e4', 'Equatorial Guinea', 'GNQ', 'https://www.preventionweb.net/assets/shared/images/flags/gnq.jpg'),
('a82fcf7f-00eb-423f-89ca-38cde379c632', 'Eritrea', 'ERI', 'https://www.preventionweb.net/assets/shared/images/flags/eri.jpg'),
('ebb06aec-0d1b-4f13-8649-575eae42ce9a', 'Estonia', 'EST', 'https://www.preventionweb.net/assets/shared/images/flags/est.jpg'),
('daf7a178-9cb6-493f-9845-85392bd5fdd4', 'Eswatini', 'SWZ', 'https://www.preventionweb.net/assets/shared/images/flags/swz.jpg'),
('3a6d1f31-2446-4621-9dee-61c9bc40f91b', 'Ethiopia', 'ETH', 'https://www.preventionweb.net/assets/shared/images/flags/eth.jpg'),
('9333c4ca-60e1-488a-bebe-d64ca42c8c35', 'Fiji', 'FJI', 'https://www.preventionweb.net/assets/shared/images/flags/fji.jpg'),
('292c8b18-483c-4c4f-92f3-f5b13fc7886b', 'Finland', 'FIN', 'https://www.preventionweb.net/assets/shared/images/flags/fin.jpg'),
('7a1f7289-2a39-4000-b101-577f3607eddb', 'France', 'FRA', 'https://www.preventionweb.net/assets/shared/images/flags/fra.jpg'),
('ee8389a0-6b2d-42ae-b6bf-86ceba3dc595', 'French Guiana', 'GUF', 'https://www.preventionweb.net/assets/shared/images/flags/guf.jpg'),
('dd270ac5-5902-4330-88f4-1f228edc1d51', 'French Polynesia', 'PYF', 'https://www.preventionweb.net/assets/shared/images/flags/pyf.jpg'),
('dec4eae0-e403-4fae-885c-db5a4d1156b8', 'Gabon', 'GAB', 'https://www.preventionweb.net/assets/shared/images/flags/gab.jpg'),
('197fa126-1dba-49f7-bab4-4392d709d7bc', 'Gambia, Republic of The', 'GMB', 'https://www.preventionweb.net/assets/shared/images/flags/gmb.jpg'),
('56656064-6337-4148-bbf2-9fcbfc275cda', 'Georgia', 'GEO', 'https://www.preventionweb.net/assets/shared/images/flags/geo.jpg'),
('81980191-e681-4f80-b16f-38d172a5a3ad', 'Germany', 'DEU', 'https://www.preventionweb.net/assets/shared/images/flags/deu.jpg'),
('7dbd4afd-e659-477f-ab3b-52cde6bd24b0', 'Ghana', 'GHA', 'https://www.preventionweb.net/assets/shared/images/flags/gha.jpg'),
('fe2aa99e-812a-4314-9475-52590e4ee16f', 'Greece', 'GRC', 'https://www.preventionweb.net/assets/shared/images/flags/grc.jpg'),
('cbd759f6-4359-4a6a-80ed-4eef3a1649cc', 'Grenada', 'GRD', 'https://www.preventionweb.net/assets/shared/images/flags/grd.jpg'),
('d7a3b52b-6e84-4912-a87d-6d3659e2a275', 'Guadeloupe', 'GLP', 'https://www.preventionweb.net/assets/shared/images/flags/glp.jpg'),
('c5ae8ae2-1925-4471-a24e-fc0fe88bae97', 'Guam', 'GUM', 'https://www.preventionweb.net/assets/shared/images/flags/gum.jpg'),
('73c26e32-cbba-47c0-be12-de9f13926fac', 'Guatemala', 'GTM', 'https://www.preventionweb.net/assets/shared/images/flags/gtm.jpg'),
('0901e1ab-4cd8-4d11-a102-3d99c45b7cfe', 'Guinea', 'GIN', 'https://www.preventionweb.net/assets/shared/images/flags/gin.jpg'),
('3cc0150d-c354-4652-a27d-9bfa9bb54aa1', 'Guinea-Bissau', 'GNB', 'https://www.preventionweb.net/assets/shared/images/flags/gnb.jpg'),
('9ec6e95c-9199-4bcd-a20b-2eebd39b0441', 'Guyana', 'GUY', 'https://www.preventionweb.net/assets/shared/images/flags/guy.jpg'),
('800c08a7-5ac9-47c1-ac16-ec9e25a04d16', 'Haiti', 'HTI', 'https://www.preventionweb.net/assets/shared/images/flags/hti.jpg'),
('ab157e21-72c8-4a2d-939c-3af1a7f3b7b3', 'Holy See', 'VAT', 'https://www.preventionweb.net/assets/shared/images/flags/vat.jpg'),
('01b197a3-2495-4682-acd6-d48853d6fcc7', 'Honduras', 'HND', 'https://www.preventionweb.net/assets/shared/images/flags/hnd.jpg'),
('b94090f8-475e-4499-aa3b-bd48b6a5d4ae', 'Hong Kong (China)', 'HKG', 'https://www.preventionweb.net/assets/shared/images/flags/hkg.jpg'),
('535e4882-c1ba-4306-969b-cc0141abd0df', 'Hungary', 'HUN', 'https://www.preventionweb.net/assets/shared/images/flags/hun.jpg'),
('cc917261-52de-4c73-b88b-4cc0550f868d', 'Iceland', 'ISL', 'https://www.preventionweb.net/assets/shared/images/flags/isl.jpg'),
('4a8caa07-6de5-4845-8b8e-94aad6498e58', 'India', 'IND', 'https://www.preventionweb.net/assets/shared/images/flags/ind.jpg'),
('c665d957-50f7-4c4f-9c81-e2285db927b4', 'Indonesia', 'IDN', 'https://www.preventionweb.net/assets/shared/images/flags/idn.jpg'),
('692cc30e-2bbd-4825-9fd4-6ab0f207e1f7', 'Iran, Islamic Rep of', 'IRN', 'https://www.preventionweb.net/assets/shared/images/flags/irn.jpg'),
('43af24f4-f135-40f4-b24f-6cd6217ce5ab', 'Iraq', 'IRQ', 'https://www.preventionweb.net/assets/shared/images/flags/irq.jpg'),
('47990480-65b0-435b-9357-1b611022dc42', 'Ireland', 'IRL', 'https://www.preventionweb.net/assets/shared/images/flags/irl.jpg'),
('b79f5c91-4eb0-42aa-b0dd-8c58b7ce6438', 'Israel', 'ISR', 'https://www.preventionweb.net/assets/shared/images/flags/isr.jpg'),
('20ab9b75-512e-45c6-b420-2da5c749c601', 'Italy', 'ITA', 'https://www.preventionweb.net/assets/shared/images/flags/ita.jpg'),
('1928f61f-feb2-404e-b061-e688ede1b9fc', 'Jamaica', 'JAM', 'https://www.preventionweb.net/assets/shared/images/flags/jam.jpg'),
('3ab7da78-6340-422a-948b-c2f71e399a49', 'Japan', 'JPN', 'https://www.preventionweb.net/assets/shared/images/flags/jpn.jpg'),
('9fdd65ac-f763-457a-9441-e5a952ccc986', 'Jordan', 'JOR', 'https://www.preventionweb.net/assets/shared/images/flags/jor.jpg'),
('651f17c8-7a1b-4d8b-a876-676882237cd6', 'Kazakhstan', 'KAZ', 'https://www.preventionweb.net/assets/shared/images/flags/kaz.jpg'),
('6896f1e9-72b7-49f0-af38-7b4984110553', 'Kenya', 'KEN', 'https://www.preventionweb.net/assets/shared/images/flags/ken.jpg'),
('2b95c384-2f75-4803-ac24-69f8985b1323', 'Kiribati', 'KIR', 'https://www.preventionweb.net/assets/shared/images/flags/kir.jpg'),
('48e63eb9-1c57-4141-8692-b799b22c7600', 'Korea, Dem People''s Rep of', 'PRK', 'https://www.preventionweb.net/assets/shared/images/flags/prk.jpg'),
('57cebaf1-7fc8-4619-9092-1eaeaf3e5976', 'Korea, Rep of', 'KOR', 'https://www.preventionweb.net/assets/shared/images/flags/kor.jpg'),
('7255a212-5689-476e-9fb1-d43f384bcf34', 'Kuwait', 'KWT', 'https://www.preventionweb.net/assets/shared/images/flags/kwt.jpg'),
('39ade2f0-5bc8-4c20-a62e-60b8010a9dec', 'Kyrgyzstan', 'KGZ', 'https://www.preventionweb.net/assets/shared/images/flags/kgz.jpg'),
('9ea3ab13-f196-4d3f-b953-6e0a78c484be', 'Lao People''s Democratic Republic', 'LAO', 'https://www.preventionweb.net/assets/shared/images/flags/lao.jpg'),
('f8f36a65-4201-47b6-8013-06d3b2aedd6c', 'Latvia', 'LVA', 'https://www.preventionweb.net/assets/shared/images/flags/lva.jpg'),
('ca5015cf-f87f-458c-8d90-7f7416ce9f5c', 'Lebanon', 'LBN', 'https://www.preventionweb.net/assets/shared/images/flags/lbn.jpg'),
('fea9fe4a-7fd9-4239-9631-df8b5aaf2492', 'Lesotho', 'LSO', 'https://www.preventionweb.net/assets/shared/images/flags/lso.jpg'),
('70a25a1a-6192-4b19-8f92-3b5f90ce29d7', 'Liberia', 'LBR', 'https://www.preventionweb.net/assets/shared/images/flags/lbr.jpg'),
('3e0dd05c-5412-4572-b5ef-3af0e0bb3e35', 'Libya', 'LBY', 'https://www.preventionweb.net/assets/shared/images/flags/lby.jpg'),
('1912cf48-447d-49cb-bc45-960681e2a6c8', 'Liechtenstein', 'LIE', 'https://www.preventionweb.net/assets/shared/images/flags/lie.jpg'),
('ac55fda9-5666-4d66-9bd4-290e73df4c7f', 'Lithuania', 'LTU', 'https://www.preventionweb.net/assets/shared/images/flags/ltu.jpg'),
('65b1a1fd-0c75-499a-a950-9a66e47960eb', 'Luxembourg', 'LUX', 'https://www.preventionweb.net/assets/shared/images/flags/lux.jpg'),
('83781cef-2824-45a3-bcde-dc570af94d8f', 'Macao (China)', 'MAC', 'https://www.preventionweb.net/assets/shared/images/flags/mac.jpg'),
('6c0c91f7-7ac2-40c2-82f7-db6235c4972a', 'Madagascar', 'MDG', 'https://www.preventionweb.net/assets/shared/images/flags/mdg.jpg'),
('be0a753b-79a2-48cd-bfe5-2b72dd707f22', 'Malawi', 'MWI', 'https://www.preventionweb.net/assets/shared/images/flags/mwi.jpg'),
('8bb41959-c612-443a-850f-3c310abe7aba', 'Malaysia', 'MYS', 'https://www.preventionweb.net/assets/shared/images/flags/mys.jpg'),
('b048dc8c-ee8d-4605-9772-3f9e65e76481', 'Maldives', 'MDV', 'https://www.preventionweb.net/assets/shared/images/flags/mdv.jpg'),
('0265aa2d-bceb-44b2-ab42-9e825ff245f2', 'Mali', 'MLI', 'https://www.preventionweb.net/assets/shared/images/flags/mli.jpg'),
('8124cb0e-c931-446b-8a63-f36bc0d2e048', 'Malta', 'MLT', 'https://www.preventionweb.net/assets/shared/images/flags/mlt.jpg'),
('44f2b86a-895f-475d-bfc9-c76edff05a91', 'Marshall Islands', 'MHL', 'https://www.preventionweb.net/assets/shared/images/flags/mhl.jpg'),
('789dd216-44df-40f3-b62c-289a19c69057', 'Martinique', 'MTQ', 'https://www.preventionweb.net/assets/shared/images/flags/mtq.jpg'),
('471cba90-5cc9-40df-80f7-3f73501c8121', 'Mauritania', 'MRT', 'https://www.preventionweb.net/assets/shared/images/flags/mrt.jpg'),
('d57db03e-bee6-4eae-92eb-61dc3b2c3417', 'Mauritius', 'MUS', 'https://www.preventionweb.net/assets/shared/images/flags/mus.jpg'),
('d5f9dbdf-4f9d-452e-8bc6-aed703d04ab8', 'Mayotte', 'MYT', 'https://www.preventionweb.net/assets/shared/images/flags/myt.jpg'),
('d88f37fd-b81d-4bdc-803e-04d2897dd74e', 'Mexico', 'MEX', 'https://www.preventionweb.net/assets/shared/images/flags/mex.jpg'),
('c3f1ae3d-722a-4f8b-b662-9ec77521550c', 'Micronesia, Fed States of', 'FSM', 'https://www.preventionweb.net/assets/shared/images/flags/fsm.jpg'),
('e46c8127-9ecd-4bf1-b111-ca33e233cf5a', 'Republic of Moldova', 'MDA', 'https://www.preventionweb.net/assets/shared/images/flags/mda.jpg'),
('0d7a3350-17ad-4649-91f6-5cfec11a168e', 'Monaco', 'MCO', 'https://www.preventionweb.net/assets/shared/images/flags/mco.jpg'),
('20d23aa9-3f7f-4b60-9bed-488c6953cb80', 'Mongolia', 'MNG', 'https://www.preventionweb.net/assets/shared/images/flags/mng.jpg'),
('ecc11593-3f2c-4c39-be05-407e315b2075', 'Montenegro', 'MNE', 'https://www.preventionweb.net/assets/shared/images/flags/mne.jpg'),
('7ef013c9-a1aa-495f-9cd2-9e10ed23a91d', 'Montserrat', 'MSR', 'https://www.preventionweb.net/assets/shared/images/flags/msr.jpg'),
('4f08750e-e38b-4c33-956f-d9199e310ba7', 'Morocco', 'MAR', 'https://www.preventionweb.net/assets/shared/images/flags/mar.jpg'),
('c3824b7d-c951-48fa-ac35-b3f386b3549b', 'Mozambique', 'MOZ', 'https://www.preventionweb.net/assets/shared/images/flags/moz.jpg'),
('c2b997cd-af4f-44c3-a76d-d9376bcdf4cc', 'Myanmar', 'MMR', 'https://www.preventionweb.net/assets/shared/images/flags/mmr.jpg'),
('04ae3fbb-1f43-40ec-8eb2-799f9687bebb', 'Namibia', 'NAM', 'https://www.preventionweb.net/assets/shared/images/flags/nam.jpg'),
('6605c4e5-2da3-411f-bfd4-745ba710a7a3', 'Nauru', 'NRU', 'https://www.preventionweb.net/assets/shared/images/flags/nru.jpg'),
('15972f49-7299-4fa6-a0ca-5a82116a8a50', 'Nepal', 'NPL', 'https://www.preventionweb.net/assets/shared/images/flags/npl.jpg'),
('62a9ea2a-8709-4d9b-ade9-fe9e2a4b3014', 'Netherlands, the', 'NLD', 'https://www.preventionweb.net/assets/shared/images/flags/nld.jpg'),
('f161c63f-32f8-4ac5-853c-23673dec62ea', 'New Caledonia', 'NCL', 'https://www.preventionweb.net/assets/shared/images/flags/ncl.jpg'),
('df5eea6d-f1b1-461e-be75-90eae37b4acc', 'New Zealand', 'NZL', 'https://www.preventionweb.net/assets/shared/images/flags/nzl.jpg'),
('d017da25-6138-4344-a0cb-b6d97a4ec12c', 'Nicaragua', 'NIC', 'https://www.preventionweb.net/assets/shared/images/flags/nic.jpg'),
('a1f2f162-ca24-457e-8033-986dc0d79c85', 'Niger', 'NER', 'https://www.preventionweb.net/assets/shared/images/flags/ner.jpg'),
('df80997b-f0f2-4454-8940-efc48048cf53', 'Nigeria', 'NGA', 'https://www.preventionweb.net/assets/shared/images/flags/nga.jpg'),
('46667076-f1c1-4da4-a19b-03839742dfe8', 'Niue', 'NIU', 'https://www.preventionweb.net/assets/shared/images/flags/niu.jpg'),
('3ba6cfab-a26e-4510-b0ba-e499ad97f101', 'Norfolk Island', 'NFK', 'https://www.preventionweb.net/assets/shared/images/flags/nfk.jpg'),
('3aa3fbfe-b9a7-4eb9-a155-a18f94c03c1c', 'North Macedonia', 'MKD', 'https://www.preventionweb.net/assets/shared/images/flags/mkd.jpg'),
('744be52e-df58-4bfb-84dc-8ae832e8db31', 'Northern Mariana Islands', 'MNP', 'https://www.preventionweb.net/assets/shared/images/flags/mnp.jpg'),
('4e0f8155-982a-43bb-b7e2-b3030fa7bfc1', 'Norway', 'NOR', 'https://www.preventionweb.net/assets/shared/images/flags/nor.jpg'),
('e471f20a-fd05-478e-8bdf-0509fa79de7b', 'Oman', 'OMN', 'https://www.preventionweb.net/assets/shared/images/flags/omn.jpg'),
('3fb6627b-7b5b-4611-9882-578ab82ddf9a', 'Pakistan', 'PAK', 'https://www.preventionweb.net/assets/shared/images/flags/pak.jpg'),
('9784ab8a-99db-49fa-8a97-ae87c8c4512c', 'Palau', 'PLW', 'https://www.preventionweb.net/assets/shared/images/flags/plw.jpg'),
('1f370a8e-f42f-425f-ae70-75925107ca10', 'Palestine, State of', 'PSE', 'https://www.preventionweb.net/assets/shared/images/flags/pse.jpg'),
('c667542f-554f-405f-928d-9ef4e410af2c', 'Panama', 'PAN', 'https://www.preventionweb.net/assets/shared/images/flags/pan.jpg'),
('8ab7f277-2134-4bf9-b4be-6f6f75f036a3', 'Papua New Guinea', 'PNG', 'https://www.preventionweb.net/assets/shared/images/flags/png.jpg'),
('a9969c88-1b18-4602-9ef7-1def74b3a41f', 'Paraguay', 'PRY', 'https://www.preventionweb.net/assets/shared/images/flags/pry.jpg'),
('34b36990-dcc3-422c-8d0e-6420499cb5a0', 'Peru', 'PER', 'https://www.preventionweb.net/assets/shared/images/flags/per.jpg'),
('0bf26858-9765-4789-999a-e43d25dcd482', 'Philippines', 'PHL', 'https://www.preventionweb.net/assets/shared/images/flags/phl.jpg'),
('fc28ae57-fccc-4355-bec7-5d5153b7937d', 'Poland', 'POL', 'https://www.preventionweb.net/assets/shared/images/flags/pol.jpg'),
('e1569bf2-88bf-4be1-bc09-63227f4fc817', 'Portugal', 'PRT', 'https://www.preventionweb.net/assets/shared/images/flags/prt.jpg'),
('e6474541-c35a-4141-8143-595e23f04db6', 'Puerto Rico', 'PRI', 'https://www.preventionweb.net/assets/shared/images/flags/pri.jpg'),
('fa23b430-4de0-4359-bd8a-448b35fadd8a', 'Qatar', 'QAT', 'https://www.preventionweb.net/assets/shared/images/flags/qat.jpg'),
('47ba785c-ef56-4547-8301-3b0e26591cd7', 'Reunion', 'REU', 'https://www.preventionweb.net/assets/shared/images/flags/reu.jpg'),
('26036c8d-703c-4ef2-9c0b-916a789085c6', 'Romania', 'ROU', 'https://www.preventionweb.net/assets/shared/images/flags/rou.jpg'),
('eea79fd8-511b-4549-8f09-929814122590', 'Russian Federation', 'RUS', 'https://www.preventionweb.net/assets/shared/images/flags/rus.jpg'),
('bf4413b1-3bbe-4c52-b6c2-a9fa22e11c74', 'Rwanda', 'RWA', 'https://www.preventionweb.net/assets/shared/images/flags/rwa.jpg'),
('470b89f0-48a5-421d-ab93-898dd2b0de28', 'Saint Kitts and Nevis', 'KNA', 'https://www.preventionweb.net/assets/shared/images/flags/kna.jpg'),
('9a22fe25-86c2-42bd-9553-d3ccaaa0b873', 'Saint Lucia', 'LCA', 'https://www.preventionweb.net/assets/shared/images/flags/lca.jpg'),
('625047e9-1ccd-4712-9557-212fca234737', 'Saint Pierre and Miquelon', 'SPM', 'https://www.preventionweb.net/assets/shared/images/flags/spm.jpg'),
('c5435851-9874-4946-acde-7a4eb4f69d9c', 'Saint Vincent and the Grenadines', 'VCT', 'https://www.preventionweb.net/assets/shared/images/flags/vct.jpg'),
('db98298d-1864-49c1-97d3-86801c1456dc', 'Samoa', 'WSM', 'https://www.preventionweb.net/assets/shared/images/flags/wsm.jpg'),
('d100cbc8-a076-489c-832a-d6851bc54825', 'San Marino', 'SMR', 'https://www.preventionweb.net/assets/shared/images/flags/smr.jpg'),
('ea632d47-e10a-4d57-93ee-dab8c8f839bc', 'Sao Tome and Principe', 'STP', 'https://www.preventionweb.net/assets/shared/images/flags/stp.jpg'),
('f7473922-38fe-4993-b71e-b16dd1360f6a', 'Saudi Arabia', 'SAU', 'https://www.preventionweb.net/assets/shared/images/flags/sau.jpg'),
('d2b068c0-3a05-4611-af72-782b830a47ab', 'Senegal', 'SEN', 'https://www.preventionweb.net/assets/shared/images/flags/sen.jpg'),
('0add34b0-4f70-4c6b-b71d-45abcdcb1411', 'Serbia', 'SRB', 'https://www.preventionweb.net/assets/shared/images/flags/srb.jpg'),
('b33209ee-e0cf-4020-863a-e165b643cf35', 'Seychelles', 'SYC', 'https://www.preventionweb.net/assets/shared/images/flags/syc.jpg'),
('d5f4b6a1-283d-4467-adef-4ebf0ce4fb82', 'Sierra Leone', 'SLE', 'https://www.preventionweb.net/assets/shared/images/flags/sle.jpg'),
('c07bc2c1-a278-4857-9fb9-1b12fc4e5e43', 'Singapore', 'SGP', 'https://www.preventionweb.net/assets/shared/images/flags/sgp.jpg'),
('78ccfb77-8a84-43c9-b688-f1c46e506011', 'Slovakia', 'SVK', 'https://www.preventionweb.net/assets/shared/images/flags/svk.jpg'),
('5d50d75e-a687-4923-9e56-83303f5b577c', 'Slovenia', 'SVN', 'https://www.preventionweb.net/assets/shared/images/flags/svn.jpg'),
('a6eea0b5-ae70-42d3-9a86-baaf0cf4dba1', 'Solomon Islands', 'SLB', 'https://www.preventionweb.net/assets/shared/images/flags/slb.jpg'),
('25adca6d-ceb1-40ff-9b86-257141b05e27', 'Somalia', 'SOM', 'https://www.preventionweb.net/assets/shared/images/flags/som.jpg'),
('60f9f4e7-55d0-492a-910e-fd5d5716bdb6', 'South Africa', 'ZAF', 'https://www.preventionweb.net/assets/shared/images/flags/zaf.jpg'),
('aba391aa-d920-44f8-8a4b-a724e463e68d', 'South Sudan', 'SSD', 'https://www.preventionweb.net/assets/shared/images/flags/ssd.jpg'),
('56fb06a9-5326-4678-92b1-9b7b86b43aa6', 'Spain', 'ESP', 'https://www.preventionweb.net/assets/shared/images/flags/esp.jpg'),
('ce86428f-04ba-4ee1-98b1-fa02a367e17a', 'Sri Lanka', 'LKA', 'https://www.preventionweb.net/assets/shared/images/flags/lka.jpg'),
('5e09dd8d-4595-4c89-a1fe-bff7e6968b06', 'Sudan', 'SDN', 'https://www.preventionweb.net/assets/shared/images/flags/sdn.jpg'),
('7508df7c-9ffb-4f43-b084-d8954ea94885', 'Suriname', 'SUR', 'https://www.preventionweb.net/assets/shared/images/flags/sur.jpg'),
('8334c696-f4ed-40c4-a046-6194ffd75e8b', 'Sweden', 'SWE', 'https://www.preventionweb.net/assets/shared/images/flags/swe.jpg'),
('22af78c6-b700-4bb1-9823-4bcac2890816', 'Switzerland', 'CHE', 'https://www.preventionweb.net/assets/shared/images/flags/che.jpg'),
('73d53899-2fe6-441c-8eb7-6823dfe6ba70', 'Syrian Arab Republic', 'SYR', 'https://www.preventionweb.net/assets/shared/images/flags/syr.jpg'),
('d60237fe-d48d-4c4c-a6c4-3f7e56ea163e', 'Tajikistan', 'TJK', 'https://www.preventionweb.net/assets/shared/images/flags/tjk.jpg'),
('e370afaf-1826-4aca-a179-bc22666151f4', 'Tanzania, United Rep of', 'TZA', 'https://www.preventionweb.net/assets/shared/images/flags/tza.jpg'),
('f59cc61e-8ee9-4fb5-a86e-4f7ee418c408', 'Thailand', 'THA', 'https://www.preventionweb.net/assets/shared/images/flags/tha.jpg'),
('b52ef707-97a8-4f7f-b9dd-cc0d6aa06f8e', 'Timor-Leste', 'TLS', 'https://www.preventionweb.net/assets/shared/images/flags/tls.jpg'),
('4000f991-19b2-443d-aeb8-0d647c41c2a2', 'Togo', 'TGO', 'https://www.preventionweb.net/assets/shared/images/flags/tgo.jpg'),
('74f1c170-c0bd-451b-9aef-44e3f6c502db', 'Tokelau', 'TKL', 'https://www.preventionweb.net/assets/shared/images/flags/tkl.jpg'),
('12af80b5-839c-46ae-b8fd-b4c2580dd8a5', 'Tonga', 'TON', 'https://www.preventionweb.net/assets/shared/images/flags/ton.jpg'),
('7e825b50-ffe4-4e75-b760-d90b31451c8e', 'Trinidad and Tobago', 'TTO', 'https://www.preventionweb.net/assets/shared/images/flags/tto.jpg'),
('2ad58f41-eed6-49bb-93e3-85a92559a44e', 'Tunisia', 'TUN', 'https://www.preventionweb.net/assets/shared/images/flags/tun.jpg'),
('fdc1ed69-3b06-4d75-b605-aa4a7f9dba46', 'Türkiye', 'TUR', 'https://www.preventionweb.net/assets/shared/images/flags/tur.jpg'),
('f4ef536b-ea6c-45a8-a3de-195473fd0835', 'Turkmenistan', 'TKM', 'https://www.preventionweb.net/assets/shared/images/flags/tkm.jpg'),
('7dd388b8-2658-4e1c-966c-f7deab5e484a', 'Turks and Caicos Islands', 'TCA', 'https://www.preventionweb.net/assets/shared/images/flags/tca.jpg'),
('fb607843-e3f0-42f8-b00e-42a00f917281', 'Tuvalu', 'TUV', 'https://www.preventionweb.net/assets/shared/images/flags/tuv.jpg'),
('a9464f99-a3fb-4327-ba9b-8b6d6d780690', 'Uganda', 'UGA', 'https://www.preventionweb.net/assets/shared/images/flags/uga.jpg'),
('38432b5f-700f-432a-9165-fd2055a8c4cf', 'Ukraine', 'UKR', 'https://www.preventionweb.net/assets/shared/images/flags/ukr.jpg'),
('c645762b-301b-4ecb-ad5c-9212a9ec208f', 'United Arab Emirates', 'ARE', 'https://www.preventionweb.net/assets/shared/images/flags/are.jpg'),
('1120f73e-f98a-4cd3-86c9-ad4a2a93cc11', 'United Kingdom of Great Britain and Northern Ireland', 'GBR', 'https://www.preventionweb.net/assets/shared/images/flags/gbr.jpg'),
('0e1a5089-2111-4fa0-a8dc-403164c29d57', 'United States of America', 'USA', 'https://www.preventionweb.net/assets/shared/images/flags/usa.jpg'),
('4cc3a385-5396-4fcf-8f5a-72855625f45d', 'United States Virgin Islands', 'VIR', 'https://www.preventionweb.net/assets/shared/images/flags/vir.jpg'),
('02221e73-c758-433f-b519-616e631d0dac', 'Uruguay', 'URY', 'https://www.preventionweb.net/assets/shared/images/flags/ury.jpg'),
('3daba758-e061-42d9-9465-ef61cc5bb0dc', 'Uzbekistan', 'UZB', 'https://www.preventionweb.net/assets/shared/images/flags/uzb.jpg'),
('db022d4b-ecf5-4386-9868-34583ce40819', 'Vanuatu', 'VUT', 'https://www.preventionweb.net/assets/shared/images/flags/vut.jpg'),
('483bbd4c-b675-43d2-a461-84759b6efaf6', 'Venezuela, Bolivarian Rep of', 'VEN', 'https://www.preventionweb.net/assets/shared/images/flags/ven.jpg'),
('0dff578e-34d2-47b9-abc1-25cef1d7ffb4', 'Viet Nam', 'VNM', 'https://www.preventionweb.net/assets/shared/images/flags/vnm.jpg'),
('dc92b5cc-713e-4d2b-8e27-84d5acc84bc0', 'Wallis and Futuna Islands', 'WLF', 'https://www.preventionweb.net/assets/shared/images/flags/wlf.jpg'),
('5c26a1f7-cc69-4066-b0df-2cfd42b5a52a', 'Yemen', 'YEM', 'https://www.preventionweb.net/assets/shared/images/flags/yem.jpg'),
('7835a1ef-10ea-4035-bdc9-c05911677a54', 'Zambia', 'ZMB', 'https://www.preventionweb.net/assets/shared/images/flags/zmb.jpg'),
('c6ed5c81-62d4-4ba4-a9d7-73ba4f9a420a', 'Zimbabwe', 'ZWE', 'https://www.preventionweb.net/assets/shared/images/flags/zwe.jpg'),
('0eabbdb7-927f-4c5f-96bb-d661b4a85e97', 'Sint Maarten', 'SXM', 'https://www.preventionweb.net/assets/shared/images/flags/vir.jpg'),
('4a3e51d7-1f92-4a80-94a4-eeadf1f05d6c', 'Saint Martin', 'MAF', ' https://www.preventionweb.net/assets/shared/images/flags/ury.jpg');

-- Populate categories data
INSERT INTO public.categories(id, name, parent_id, level) VALUES ('01308f4d-a94e-41c9-8410-0321f7032d7c','Human Life - health and livelihoods', null, 1);
INSERT INTO public.categories(id, name, parent_id, level) VALUES ('d7a7e57c-4e94-42b4-87ef-d946f100af9c','Meaningful Places', null, 1);
INSERT INTO public.categories(id, name, parent_id, level) VALUES ('fffef50e-59f6-4454-bb1c-2aef2a570d46','Cultural heritage', null, 1);
INSERT INTO public.categories(id, name, parent_id, level) VALUES ('4b7a1cde-6526-4263-8a94-404079bcff63','Social and Intrinsic values', null, 1);
INSERT INTO public.categories(id, name, parent_id, level) VALUES ('5eeb43f7-e754-471f-9495-5abc30fc5c87','Biodiversity', null, 1);
INSERT INTO public.categories(id, name, parent_id, level) VALUES ('5872c33c-08cf-431e-95a1-2032a000f889','Ecosystem services', null, 1);
INSERT INTO public.categories(id, name, parent_id, level) VALUES ('b7ce061a-2979-48fc-aa20-d50891179573','Lives', '01308f4d-a94e-41c9-8410-0321f7032d7c', 2);
INSERT INTO public.categories(id, name, parent_id, level) VALUES ('40a7e116-44c0-41d0-a467-d5e0950c80c1','Health', '01308f4d-a94e-41c9-8410-0321f7032d7c', 2);
INSERT INTO public.categories(id, name, parent_id, level) VALUES ('57782008-1844-4e50-9aa3-08e5bc149a82','Wellbeing', '01308f4d-a94e-41c9-8410-0321f7032d7c', 2);
INSERT INTO public.categories(id, name, parent_id, level) VALUES ('17ceb8cf-e5bb-4528-84b7-882c1531b1ff','Livelihoods', '01308f4d-a94e-41c9-8410-0321f7032d7c', 2);
INSERT INTO public.categories(id, name, parent_id, level) VALUES ('45448808-6ddc-43b8-bf7e-cef82da80985','Food security', '01308f4d-a94e-41c9-8410-0321f7032d7c', 2);
INSERT INTO public.categories(id, name, parent_id, level) VALUES ('032b71d2-e78b-4f44-b8f6-0c18f9ab35d8','Territory', 'd7a7e57c-4e94-42b4-87ef-d946f100af9c', 2);
INSERT INTO public.categories(id, name, parent_id, level) VALUES ('b36ef1fb-a0c6-40b4-a097-25eb46ca0390','Homes - sense of place', 'd7a7e57c-4e94-42b4-87ef-d946f100af9c', 2);
INSERT INTO public.categories(id, name, parent_id, level) VALUES ('dc2c47b7-5f52-4aea-a8bd-b44f384f7fcd','Places', 'd7a7e57c-4e94-42b4-87ef-d946f100af9c', 2);
INSERT INTO public.categories(id, name, parent_id, level) VALUES ('9c252ad4-acdb-452f-b3a2-ad195f0e2c18','Sacred sites', 'd7a7e57c-4e94-42b4-87ef-d946f100af9c', 2);
INSERT INTO public.categories(id, name, parent_id, level) VALUES ('66d771cf-e07e-44cb-972e-eda18b0699a1','Heritage', 'fffef50e-59f6-4454-bb1c-2aef2a570d46', 2);
INSERT INTO public.categories(id, name, parent_id, level) VALUES ('74f0b67a-3118-4a14-9a2a-ccd3a1f91cb8','Historical monuments', 'fffef50e-59f6-4454-bb1c-2aef2a570d46', 2);
INSERT INTO public.categories(id, name, parent_id, level) VALUES ('7dd75a3d-09bd-44dd-ad99-9bfb46387b9f','Artefacts', 'fffef50e-59f6-4454-bb1c-2aef2a570d46', 2);
INSERT INTO public.categories(id, name, parent_id, level) VALUES ('30115738-9421-449c-bb90-4220ca6f8e97','Rituals', 'fffef50e-59f6-4454-bb1c-2aef2a570d46', 2);
INSERT INTO public.categories(id, name, parent_id, level) VALUES ('2a76bb27-fdba-4030-8241-e6246295628e','Traditions - ways of life', 'fffef50e-59f6-4454-bb1c-2aef2a570d46', 2);
INSERT INTO public.categories(id, name, parent_id, level) VALUES ('e1ede461-4f11-4aa3-b4b3-310ee69e791f','Customs', 'fffef50e-59f6-4454-bb1c-2aef2a570d46', 2);
INSERT INTO public.categories(id, name, parent_id, level) VALUES ('513701c4-faf0-40f8-9a39-9155cf2291c4','Culture', 'fffef50e-59f6-4454-bb1c-2aef2a570d46', 2);
INSERT INTO public.categories(id, name, parent_id, level) VALUES ('cdca0b31-f99b-48a0-83be-b0793064bc0e','Language', 'fffef50e-59f6-4454-bb1c-2aef2a570d46', 2);
INSERT INTO public.categories(id, name, parent_id, level) VALUES ('cff98629-ca72-498e-a024-6a8220a425ac','Indigenous knowledge', 'fffef50e-59f6-4454-bb1c-2aef2a570d46', 2);
INSERT INTO public.categories(id, name, parent_id, level) VALUES ('f584344a-360d-4a4d-8bc2-74bf2993a244','Dignity', '4b7a1cde-6526-4263-8a94-404079bcff63', 2);
INSERT INTO public.categories(id, name, parent_id, level) VALUES ('8b509335-b6a7-4a19-9f99-f0eda995e5c9','Agency', '4b7a1cde-6526-4263-8a94-404079bcff63', 2);
INSERT INTO public.categories(id, name, parent_id, level) VALUES ('b7e06380-dc6d-4268-93d4-ffb896cfd7db','Identity', '4b7a1cde-6526-4263-8a94-404079bcff63', 2);
INSERT INTO public.categories(id, name, parent_id, level) VALUES ('35ee7ebd-de96-45aa-8da7-6d3846f4dae5','Security', '4b7a1cde-6526-4263-8a94-404079bcff63', 2);
INSERT INTO public.categories(id, name, parent_id, level) VALUES ('ea665425-c7b9-474e-be88-c7ff4462cd8f','Social cohesion', '4b7a1cde-6526-4263-8a94-404079bcff63', 2);
INSERT INTO public.categories(id, name, parent_id, level) VALUES ('574f13bd-bba4-4447-a330-7f38e719ca8d','Social capital', '4b7a1cde-6526-4263-8a94-404079bcff63', 2);
INSERT INTO public.categories(id, name, parent_id, level) VALUES ('ae1bd1c3-d247-4bee-9bc5-91ed77640323','Social fabric', '4b7a1cde-6526-4263-8a94-404079bcff63', 2);
INSERT INTO public.categories(id, name, parent_id, level) VALUES ('7ae2ffe9-a8dd-4eda-a360-759dc6f61194','Community ( sense of)', '4b7a1cde-6526-4263-8a94-404079bcff63', 2);
INSERT INTO public.categories(id, name, parent_id, level) VALUES ('a1dc3899-d829-4026-a35a-381d0399bf9d','Sovereignty', '4b7a1cde-6526-4263-8a94-404079bcff63', 2);
INSERT INTO public.categories(id, name, parent_id, level) VALUES ('9342c507-d13a-4ece-8e56-5a66f5c32082','Education', '4b7a1cde-6526-4263-8a94-404079bcff63', 2);
INSERT INTO public.categories(id, name, parent_id, level) VALUES ('6bf52130-05a9-4b71-82fa-8fd3a78652c4','(Human) Mobility', '4b7a1cde-6526-4263-8a94-404079bcff63', 2);
INSERT INTO public.categories(id, name, parent_id, level) VALUES ('aca6190c-7cf1-4a83-8baa-59405d4db286','Genetic diversity', '5eeb43f7-e754-471f-9495-5abc30fc5c87', 2);
INSERT INTO public.categories(id, name, parent_id, level) VALUES ('bd4d59c8-6efb-44f2-b7c2-fb710dad7f89','Species diversity', '5eeb43f7-e754-471f-9495-5abc30fc5c87', 2);
INSERT INTO public.categories(id, name, parent_id, level) VALUES ('5f4356a5-d386-48ea-abc9-9399466d28f0','Ecosystems diversity', '5eeb43f7-e754-471f-9495-5abc30fc5c87', 2);
INSERT INTO public.categories(id, name, parent_id, level) VALUES ('5c043650-60b9-45b6-9944-8f13c5177279','Habitats', '5eeb43f7-e754-471f-9495-5abc30fc5c87', 2);
INSERT INTO public.categories(id, name, parent_id, level) VALUES ('462ce870-1c04-4a65-b512-038b54f98ec3','Landscapes', '5eeb43f7-e754-471f-9495-5abc30fc5c87', 2);
INSERT INTO public.categories(id, name, parent_id, level) VALUES ('292bdb90-4c34-4828-b4a9-63768e25972a','Regulation and maintenance services', '5872c33c-08cf-431e-95a1-2032a000f889', 2);
INSERT INTO public.categories(id, name, parent_id, level) VALUES ('81e84cf2-7ab2-469e-a7e2-9e47bea94d2d','Provisioning services', '5872c33c-08cf-431e-95a1-2032a000f889', 2);
INSERT INTO public.categories(id, name, parent_id, level) VALUES ('99c46eda-c7d3-4db7-8e12-85c0a8ef5e7f','Cultural services', '5872c33c-08cf-431e-95a1-2032a000f889', 2);
INSERT INTO public.categories(id, name, parent_id, level) VALUES ('c61e8fc8-4567-4fb6-9386-5f70175a6e51','Biotic (living components of an ecosystem)', '292bdb90-4c34-4828-b4a9-63768e25972a', 3);
INSERT INTO public.categories(id, name, parent_id, level) VALUES ('4a47d526-b792-42d1-8224-709273829617','Abiotic (non-living physical and chemical components of an ecosystem)', '292bdb90-4c34-4828-b4a9-63768e25972a', 3);
INSERT INTO public.categories(id, name, parent_id, level) VALUES ('27c30866-9f90-4a92-b5cb-784d045afe1b','Biotic (living components of an ecosystem)', '81e84cf2-7ab2-469e-a7e2-9e47bea94d2d', 3);
INSERT INTO public.categories(id, name, parent_id, level) VALUES ('ad01932c-6dfc-48b1-a6eb-6495b64391c3','Abiotic (non-living physical and chemical components of an ecosystem)', '81e84cf2-7ab2-469e-a7e2-9e47bea94d2d', 3);
INSERT INTO public.categories(id, name, parent_id, level) VALUES ('042d97f6-e791-4461-8f7e-e495ffcee020','Biotic (living components of an ecosystem)', '99c46eda-c7d3-4db7-8e12-85c0a8ef5e7f', 3);
INSERT INTO public.categories(id, name, parent_id, level) VALUES ('d83571b2-16b8-4dba-89ae-a0a73bd6ca02','Abiotic (non-living physical and chemical components of an ecosystem)', '99c46eda-c7d3-4db7-8e12-85c0a8ef5e7f', 3);


-- Populate Sector table data
INSERT INTO public.sector(id, parent_id, sectorname, level)VALUES 
('7d5c9d4f-2e3d-45a1-b8f7-9d31a5f4c82a',null, 'Productive', 1),
('fa1b8e2c-8c43-4a18-9d24-5dbd1e4a6e9c',null, 'Social', 1),
('c53f7189-4fcb-4f32-bb15-2ae88269a0b2',null, 'Infrastructures', 1),
('0eaf22dd-5f77-4b86-a0b6-faa5106d4821',null, 'Cross-cutting', 1),
('8cf24ec3-3567-4c40-a5fd-bff9e9a27d87','7d5c9d4f-2e3d-45a1-b8f7-9d31a5f4c82a', 'Agriculture', 2),
('3e2bdf02-4f7a-4898-a9a5-bd98a8d1e370','7d5c9d4f-2e3d-45a1-b8f7-9d31a5f4c82a', 'Industry', 2),
('ed2b7a44-fd4b-46b4-9c86-98d1a4a1d15f','7d5c9d4f-2e3d-45a1-b8f7-9d31a5f4c82a', 'Tourism', 2),
('5f00c4d2-12e0-4a89-9f35-5bbda1c3d904','7d5c9d4f-2e3d-45a1-b8f7-9d31a5f4c82a', 'Commerce and Trade', 2),
('ba8e2cf9-0d9a-49c1-814e-0a4d45d0726b','7d5c9d4f-2e3d-45a1-b8f7-9d31a5f4c82a', 'Services', 2),
('4a39d053-a4cf-41f8-93c0-7c30e60f3b42','fa1b8e2c-8c43-4a18-9d24-5dbd1e4a6e9c', 'Health', 2),
('fd53c0da-5ad6-4a7d-943b-089c7726a2bb','fa1b8e2c-8c43-4a18-9d24-5dbd1e4a6e9c', 'Education', 2),
('6ac0b833-6218-49d0-9882-827c1b748d7a','fa1b8e2c-8c43-4a18-9d24-5dbd1e4a6e9c', 'Housing', 2),
('a48d6f2e-16e4-4976-8c25-5c8b1788232f','fa1b8e2c-8c43-4a18-9d24-5dbd1e4a6e9c', 'Culture', 2),
('2b01b68b-bf42-4a72-83b8-e272b0af90b5','c53f7189-4fcb-4f32-bb15-2ae88269a0b2', 'Transportation', 2),
('c83a021f-5861-4f2c-932b-07decb1fa9d2','c53f7189-4fcb-4f32-bb15-2ae88269a0b2', 'Energy and Electricity', 2),
('e9f80a3c-84b4-4fa6-92a0-324ae34f81fd','c53f7189-4fcb-4f32-bb15-2ae88269a0b2', 'Information and Communication', 2),
('0f260f9c-c8b8-4a71-94c3-883158f540ad','c53f7189-4fcb-4f32-bb15-2ae88269a0b2', 'Water', 2),
('adcd0b72-1c9f-40ec-9267-d91a2ff2b08a','c53f7189-4fcb-4f32-bb15-2ae88269a0b2', 'Sanitation', 2),
('5c91ad51-b152-4ed0-a7f1-0d3e23e3253e','c53f7189-4fcb-4f32-bb15-2ae88269a0b2', 'Community infrastructure', 2),
('7780d3d4-5f64-4d77-8e45-ff924d47bbdf','0eaf22dd-5f77-4b86-a0b6-faa5106d4821', 'Environment', 2),
('e7d2a20c-381c-42f8-99a5-3db2d8c71b86','0eaf22dd-5f77-4b86-a0b6-faa5106d4821', 'Gender', 2),
('3910f40d-b1a1-4ac0-bfa6-52064d7d4e9f','0eaf22dd-5f77-4b86-a0b6-faa5106d4821', 'Governance', 2),
('6f03a917-ec56-4a4b-bf48-16485f6a8ad4','0eaf22dd-5f77-4b86-a0b6-faa5106d4821', 'Employment, Livelihoods and social protection', 2),
('d7a01519-19c4-4fbb-9c66-64d4a002ebf8','0eaf22dd-5f77-4b86-a0b6-faa5106d4821', 'Disaster Risk Management', 2),
('c70618ee-f1be-438f-8c40-14fc5dfb05fb','8cf24ec3-3567-4c40-a5fd-bff9e9a27d87', 'Crops', 3),
('a4039693-5b26-4653-acac-c70e7e8322eb','8cf24ec3-3567-4c40-a5fd-bff9e9a27d87', 'Livestock', 3),
('729c96be-d16b-4410-8dd5-bf775b15f5bc','8cf24ec3-3567-4c40-a5fd-bff9e9a27d87', 'Forestry and logging', 3),
('cb6f79ed-4342-41e4-b744-245f8c2f48d8','8cf24ec3-3567-4c40-a5fd-bff9e9a27d87', 'Aquaculture', 3),
('da0331e9-1d96-44ac-a498-206418bf6a50','8cf24ec3-3567-4c40-a5fd-bff9e9a27d87', 'Fisheries', 3),
('c5208da2-284f-46f7-9d16-e399b754073f','3e2bdf02-4f7a-4898-a9a5-bd98a8d1e370', 'Mining and quarrying', 3),
('9a427e48-9c4f-4b54-b65d-f6fca389a79f','3e2bdf02-4f7a-4898-a9a5-bd98a8d1e370', 'Manufacturing', 3),
('38342a23-fb47-4182-a2b4-58b1c3606043','3e2bdf02-4f7a-4898-a9a5-bd98a8d1e370', 'Construction', 3),
('1e7d14bb-0b56-4edb-8205-fb6bc2ca9d40','ed2b7a44-fd4b-46b4-9c86-98d1a4a1d15f', 'Accommodation services for visitors', 3),
('5c073efd-936f-40a9-8e29-52340c4c1af7','ed2b7a44-fd4b-46b4-9c86-98d1a4a1d15f', 'Food and beverage services', 3),
('6473fe1a-096c-420a-b807-11d21f2d4761','ed2b7a44-fd4b-46b4-9c86-98d1a4a1d15f', 'Travel agency and reservation services', 3),
('92b69a99-1512-4142-9257-3da487c12596','ed2b7a44-fd4b-46b4-9c86-98d1a4a1d15f', 'Recreation and other entertainment', 3),
('dfc09fc9-088b-4643-9649-0ffc4bb4db0a','ed2b7a44-fd4b-46b4-9c86-98d1a4a1d15f', 'Passenger transport', 3),
('7903db62-6d91-47cf-94b1-d1ec129c4f80','5f00c4d2-12e0-4a89-9f35-5bbda1c3d904', 'Wholesale trade', 3),
('a906b6a2-6bf0-49c0-9553-e62f93123b23','5f00c4d2-12e0-4a89-9f35-5bbda1c3d904', 'Retail trade', 3),
('d472189c-06ff-4a43-96df-bd22cfc31b8e','5f00c4d2-12e0-4a89-9f35-5bbda1c3d904', 'Sales and maintenance of vehicles', 3),
('268a8fa2-0ab0-446a-9f2a-8f2a8fcb87a0','ba8e2cf9-0d9a-49c1-814e-0a4d45d0726b', 'Administrative and support services', 3),
('57d8f07f-da85-4b98-bece-21628c06b41b','ba8e2cf9-0d9a-49c1-814e-0a4d45d0726b', 'Professional, scientific and technical activities', 3),
('9f89df69-ae73-4b72-92e2-f6377a054fb1','ba8e2cf9-0d9a-49c1-814e-0a4d45d0726b', 'Real estate', 3),
('bd2705b8-556e-4aa2-98d0-6bd197c5b75d','ba8e2cf9-0d9a-49c1-814e-0a4d45d0726b', 'Finance and insurance services', 3),
('2087f7b3-d75b-49a6-86e5-0038611877fa','4a39d053-a4cf-41f8-93c0-7c30e60f3b42', 'Health care network', 3),
('42a6cc9e-ac57-4adb-ad22-ce3bdfba2d59','4a39d053-a4cf-41f8-93c0-7c30e60f3b42', 'Health programs and other services', 3),
('a92df837-2005-4fc0-9084-45a39649715e','4a39d053-a4cf-41f8-93c0-7c30e60f3b42', 'Health care systems'' management', 3),
('890039b4-3fae-4fa5-ae95-85d47714045a','fd53c0da-5ad6-4a7d-943b-089c7726a2bb', '0-Early childhood', 3),
('7fb35894-ff2a-48ce-bc13-18d8119a757e','fd53c0da-5ad6-4a7d-943b-089c7726a2bb', '1-Primary education', 3),
('ccbfb4dd-cd8a-489f-876c-e20fea0f22e3','fd53c0da-5ad6-4a7d-943b-089c7726a2bb', '2-3- Secondary', 3),
('bc363efd-051b-402c-ae67-bdf14a122364','fd53c0da-5ad6-4a7d-943b-089c7726a2bb', '4- Post secondary', 3),
('073072a3-7142-4fbb-a4c2-07c8934a356e','fd53c0da-5ad6-4a7d-943b-089c7726a2bb', '5-8 Tertiary', 3),
('0c2cc3f5-2780-4d16-8663-76c7315f1f94','fd53c0da-5ad6-4a7d-943b-089c7726a2bb', 'Others -Non-formal education', 3),
('e25331d6-dca9-40da-bdd7-9f63979b353b','6ac0b833-6218-49d0-9882-827c1b748d7a', 'Housing units', 3),
('13864003-2c42-454b-b723-f25eb0ae307d','6ac0b833-6218-49d0-9882-827c1b748d7a', 'Collective living quarters', 3),
('ca435a93-65bd-4d9e-b231-05d2f0107a75','a48d6f2e-16e4-4976-8c25-5c8b1788232f', 'Tangible Cultural heritage', 3),
('52d0089f-d097-457d-82f9-a693561974f6','a48d6f2e-16e4-4976-8c25-5c8b1788232f', 'Intangible cultural heritage', 3),
('48b5facd-f99e-4051-bca9-8c02f683ae78','2b01b68b-bf42-4a72-83b8-e272b0af90b5', 'Land Transportation', 3),
('3cf24f5d-5ecb-4d62-b0cf-77db213da02b','2b01b68b-bf42-4a72-83b8-e272b0af90b5', 'Air Transportation', 3),
('84af0959-7f53-45db-888b-3eeeb897b405','2b01b68b-bf42-4a72-83b8-e272b0af90b5', 'Water transportation', 3),
('deffe5ac-8e53-44ad-a9f3-0d1a03f4b0c8','2b01b68b-bf42-4a72-83b8-e272b0af90b5', 'Transportation supppor services', 3),
('a14fce6f-fae4-4f63-80c5-785d6c60298f','2b01b68b-bf42-4a72-83b8-e272b0af90b5', 'Postal and courier services', 3),
('9090ef1f-2abe-4623-8917-5b30cb6d0b5b','c83a021f-5861-4f2c-932b-07decb1fa9d2', 'Electricity', 3),
('f0dc660e-3b3a-4de2-83ac-3cb481ab9b33','c83a021f-5861-4f2c-932b-07decb1fa9d2', 'Consumable fuels', 3),
('4bda4671-3f59-4d0a-be9f-e067c4868aba','e9f80a3c-84b4-4fa6-92a0-324ae34f81fd', 'Publishing', 3),
('cb93fa53-3dbb-4125-8a3c-26e77dbad725','e9f80a3c-84b4-4fa6-92a0-324ae34f81fd', 'Telecommunications,', 3),
('1a9ed881-e6dc-463f-836c-8f096c60df4c','e9f80a3c-84b4-4fa6-92a0-324ae34f81fd', 'Computer programming, consultancy and related', 3),
('5ec89056-2b9b-472e-8436-ce5cac6e09b1','e9f80a3c-84b4-4fa6-92a0-324ae34f81fd', 'Information services', 3),
('74e0f62a-e9c7-48b6-8882-6988bb474899','e9f80a3c-84b4-4fa6-92a0-324ae34f81fd', 'Others', 3),
('b08b5ffc-26c5-4aa5-88ac-2baa217a4d7a','0f260f9c-c8b8-4a71-94c3-883158f540ad', 'Water sources- generation', 3),
('1e4cc659-c250-4f90-a107-294a85034790','0f260f9c-c8b8-4a71-94c3-883158f540ad', 'Water treatment', 3),
('f57c9597-420a-4df4-94a2-bd12345b7584','0f260f9c-c8b8-4a71-94c3-883158f540ad', 'Water distribution', 3),
('17e8b94c-2362-4dd9-89e0-4240df53110a','adcd0b72-1c9f-40ec-9267-d91a2ff2b08a', 'Large scale sanitation', 3),
('a5b4edee-54d8-426a-aee3-3ca0fd5e3161','adcd0b72-1c9f-40ec-9267-d91a2ff2b08a', 'Small scale sanitation', 3),
('7aad3cff-acee-4aaa-a2df-8e7ae9a135ce','adcd0b72-1c9f-40ec-9267-d91a2ff2b08a', 'Urban solid waste', 3),
('d1af9066-f0c1-43e0-bca6-0ecfd0835a92','adcd0b72-1c9f-40ec-9267-d91a2ff2b08a', 'Hazardous waste', 3),
('4a87040e-6b84-4732-a62a-02e4f93f2568','5c91ad51-b152-4ed0-a7f1-0d3e23e3253e', 'Connective infrastructure', 3),
('ab79b47d-6ffc-47f6-9e77-ccb68bf3194a','5c91ad51-b152-4ed0-a7f1-0d3e23e3253e', 'Protective infrastructure', 3),
('cf275ef1-313b-4ea5-b02f-2100603b1c24','5c91ad51-b152-4ed0-a7f1-0d3e23e3253e', 'Socio-economic structures', 3),
('dfac8640-ba70-4c9a-bf63-061866f11778','5c91ad51-b152-4ed0-a7f1-0d3e23e3253e', 'Community Water and sanitation lifelines', 3),
('4fb9060c-965f-4cdc-a304-8ef574794eb8','5c91ad51-b152-4ed0-a7f1-0d3e23e3253e', 'Community energy lifelines off-grid', 3),
('b3d6e1a8-6e92-4650-8a9c-2cf1bbf321dc','5c91ad51-b152-4ed0-a7f1-0d3e23e3253e', 'Commnications community lifelines', 3),
('0dca6942-2007-489f-9c7a-5f0a182837ab','7780d3d4-5f64-4d77-8e45-ff924d47bbdf', 'Biodiversity', 3),
('3cda0cd2-ee4a-489a-9eb9-6f97c68a6ea1','7780d3d4-5f64-4d77-8e45-ff924d47bbdf', 'Natural Ressources', 3),
('d051628b-9012-4e35-9f82-78d977b7acf1','7780d3d4-5f64-4d77-8e45-ff924d47bbdf', 'Ecosystem services', 3),
('36b90c7d-743f-4ff3-8136-896b3e82c64d','e7d2a20c-381c-42f8-99a5-3db2d8c71b86', 'Gender inequalities', 3),
('2d127594-6cd6-4c36-a867-96fae56d42c8','e7d2a20c-381c-42f8-99a5-3db2d8c71b86', 'Gender-based violence', 3),
('66186b25-80bf-4a54-8c3e-35cdb2782e26','e7d2a20c-381c-42f8-99a5-3db2d8c71b86', 'Public administration', 3),
('fa57c7e9-865d-44a0-af80-bc7740775077','e7d2a20c-381c-42f8-99a5-3db2d8c71b86', 'Executive power', 3),
('4c21449f-ae8f-47c2-845a-77ffcd84c6ab','e7d2a20c-381c-42f8-99a5-3db2d8c71b86', 'Legislative power', 3),
('04d3c630-ed60-4b25-86da-681b14a9ad75','e7d2a20c-381c-42f8-99a5-3db2d8c71b86', 'Judiciary power', 3),
('f4782b71-e4fc-4b42-8625-e07ef89391c0','6f03a917-ec56-4a4b-bf48-16485f6a8ad4', 'Employment', 3),
('d4771446-1514-449f-b38a-fb69530513a8','6f03a917-ec56-4a4b-bf48-16485f6a8ad4', 'Livelihoods', 3),
('2bfec1c6-2d3c-4216-a3f1-3aff25a49bf4','6f03a917-ec56-4a4b-bf48-16485f6a8ad4', 'Social protection', 3),
('5b8d5c0a-63ba-4adf-a54f-86268c187180','d7a01519-19c4-4fbb-9c66-64d4a002ebf8', 'Disaster management', 3),
('87b4a6b8-ffbb-448d-b1db-aedd6eff87c1','d7a01519-19c4-4fbb-9c66-64d4a002ebf8', 'Disaster Recovery', 3),
('caf3cc98-6395-427a-b785-983ab9a2124b','d7a01519-19c4-4fbb-9c66-64d4a002ebf8', 'Disaster mitigation', 3),
('dd16548d-4087-4bef-8861-7069624859e3','c70618ee-f1be-438f-8c40-14fc5dfb05fb', 'Temporary - annual crops', 4),
('5a525ef1-592d-4808-977c-1e2cc2d2de8f','c70618ee-f1be-438f-8c40-14fc5dfb05fb', 'Permanent- perennial crops', 4),
('f26df827-9956-4f39-98e8-4597dd5c1b35','a4039693-5b26-4653-acac-c70e7e8322eb', 'Animal production', 4),
('ce23b2a5-506a-4b99-88d9-6ef1ff3e4a45','a4039693-5b26-4653-acac-c70e7e8322eb', 'Hunting and trapping', 4),
('a6ebba03-506c-49c2-92ca-eb219f680cc2','729c96be-d16b-4410-8dd5-bf775b15f5bc', 'Silviculture', 4),
('3b5ef14c-bc6e-4fca-b158-62f35e0c6820','729c96be-d16b-4410-8dd5-bf775b15f5bc', 'Logging', 4),
('101135ba-66c7-4cf2-8db4-67322f136dc2','729c96be-d16b-4410-8dd5-bf775b15f5bc', 'Gathering forest products', 4),
('db591f94-9a08-4dd8-95dd-39118e847ff4','cb6f79ed-4342-41e4-b744-245f8c2f48d8', 'Marine aquaculture', 4),
('29729176-a8f1-4772-bccf-2e8850bb4879','cb6f79ed-4342-41e4-b744-245f8c2f48d8', 'Freshwater aquaculture', 4),
('5c3c8996-146a-41ab-bf5c-bbb816baff1e','da0331e9-1d96-44ac-a498-206418bf6a50', 'Marine fishing', 4),
('f0d975e0-662e-4135-a3dd-6d273a2e8369','da0331e9-1d96-44ac-a498-206418bf6a50', 'Freshwater fishing', 4),
('7891381c-b7a9-4fe8-bbfa-bb8fcc3d9c26','c5208da2-284f-46f7-9d16-e399b754073f', 'Mining of coal and lignite ', 4),
('7dc1b459-d76c-45e4-aa13-e3abc4b2f21d','c5208da2-284f-46f7-9d16-e399b754073f', ' Extraction of crude petroleum and natural gas ', 4),
('7c29f01a-f0f2-425e-b076-9cf981a5768d','c5208da2-284f-46f7-9d16-e399b754073f', ' Mining of metal ores ', 4),
('439012c1-d097-4a80-b2fd-41e973a5aa70','c5208da2-284f-46f7-9d16-e399b754073f', 'Mining of  iron ores', 4),
('ca3709b9-e04c-4b56-9454-dd17994cf137','c5208da2-284f-46f7-9d16-e399b754073f', 'Other mining and quarrying  ', 4),
('a54887da-b58d-44be-90fa-91849e9856cb','c5208da2-284f-46f7-9d16-e399b754073f', 'Mining support service activities', 4),
('750b090b-b564-4da9-a176-b7d041a0e0d0','9a427e48-9c4f-4b54-b65d-f6fca389a79f', 'Manufacture of food products ', 4),
('91fba313-7f2e-41f7-9ab9-dcfe7f8e01ae','9a427e48-9c4f-4b54-b65d-f6fca389a79f', ' Manufacture of beverages ', 4),
('3a4c1654-df0a-47a2-a8a5-4b3eca984482','9a427e48-9c4f-4b54-b65d-f6fca389a79f', 'Manufacture of tobacco products', 4),
('a2597dc0-2032-421e-9848-7034e715dbc4','9a427e48-9c4f-4b54-b65d-f6fca389a79f', 'Manufacture of textiles ', 4),
('fe1fa6b5-4736-47e6-8e23-42bedf2c8a36','9a427e48-9c4f-4b54-b65d-f6fca389a79f', 'Manufacture of wearing apparel', 4),
('1e3bc7ec-a023-4a1f-aadd-d77b3cc12ab4','9a427e48-9c4f-4b54-b65d-f6fca389a79f', 'Manufacture of leather and related products ', 4),
('32f349cc-a884-477a-a9cb-a3dbd82a6396','9a427e48-9c4f-4b54-b65d-f6fca389a79f', 'Manufacture of wood and of products of wood and cork, except furniture, manufacture of articles of straw and plaiting materials ', 4),
('fe1f1b30-ebe6-4589-8c73-1e318100d9a3','9a427e48-9c4f-4b54-b65d-f6fca389a79f', ' Manufacture of paper and paper products', 4),
('4a451baf-9bb7-4b95-9044-eb82bbc46623','9a427e48-9c4f-4b54-b65d-f6fca389a79f', 'Printing and reproduction of recorded media', 4),
('12d508f2-6d48-4df0-8a06-65d18afc185a','9a427e48-9c4f-4b54-b65d-f6fca389a79f', 'Manufacture of coke and refined petroleum products', 4),
('3ff29932-17dc-401c-ab1d-ee84f682f228','9a427e48-9c4f-4b54-b65d-f6fca389a79f', 'Manufacture of chemicals and chemical products ', 4),
('8b4e9bac-6b73-4781-8318-7abc35516cf1','9a427e48-9c4f-4b54-b65d-f6fca389a79f', ' Manufacture of basic pharmaceutical products and pharmaceutical preparations ', 4),
('893f398a-37e6-4934-8112-d7d8989cf537','9a427e48-9c4f-4b54-b65d-f6fca389a79f', 'Manufacture of rubber and plastics products ', 4),
('764f625c-314f-4609-ae0c-9dadf73ad135','9a427e48-9c4f-4b54-b65d-f6fca389a79f', 'Manufacture of other non metallic mineral products', 4),
('a8cbcde6-38a5-4aa8-bede-1f56b5ca0148','9a427e48-9c4f-4b54-b65d-f6fca389a79f', '  Manufacture of basic metals', 4),
('32461210-5890-419d-afcd-00750614e5e3','9a427e48-9c4f-4b54-b65d-f6fca389a79f', 'Manufacture of fabricated metal products', 4),
('27a3a37b-c0ca-422c-b62c-b6cb48d2eeb3','9a427e48-9c4f-4b54-b65d-f6fca389a79f', 'Manufacture of computer, electronic and optical products ', 4),
('e4375f70-3fa0-48ec-b127-9618fc59535a','9a427e48-9c4f-4b54-b65d-f6fca389a79f', ' Manufacture of electrical equipment ', 4),
('6c05c5c3-321c-42b4-beef-c89d4d04f9a0','9a427e48-9c4f-4b54-b65d-f6fca389a79f', ' Manufacture of machinery and equipment ', 4),
('613c270d-1f39-4c69-869d-7f0d0b2c567f','9a427e48-9c4f-4b54-b65d-f6fca389a79f', 'Manufacture of motor vehicles, trailers and semi trailers ', 4),
('a04acdb4-f30f-4f2e-911c-17352f4cc940','9a427e48-9c4f-4b54-b65d-f6fca389a79f', 'Manufacture of other transport equipment ', 4),
('8ebd270d-05ce-4239-83bf-5390d62626b6','9a427e48-9c4f-4b54-b65d-f6fca389a79f', ' Manufacture of furniture ', 4),
('65620f29-48ae-4d9e-966b-4bb228d96e81','9a427e48-9c4f-4b54-b65d-f6fca389a79f', ' Other manufacturing', 4),
('0c0f796e-805c-4d83-a816-4a77455ef4b7','9a427e48-9c4f-4b54-b65d-f6fca389a79f', 'Repair and installation of machinery and equipment', 4),
('86e24b8d-4c49-4fd1-8b73-b84271623041','38342a23-fb47-4182-a2b4-58b1c3606043', 'Construction of buildings', 4),
('d95559cc-7b6b-49f2-badb-18e976e888de','38342a23-fb47-4182-a2b4-58b1c3606043', 'Civil engineering', 4),
('e315defa-a100-4569-a6c6-f338d268dc2d','38342a23-fb47-4182-a2b4-58b1c3606043', 'Specialized construction activities', 4),
('dd2600ca-5cf1-41a7-a9e7-3a1671e7b8e9','1e7d14bb-0b56-4edb-8205-fb6bc2ca9d40', 'Short-term accommodation in hotels, resort hotels, suite/apartment hotels, motels, motor hotels, guest houses, pensions, bed-and-breakfast units, visitor flats and bungalows, time-share units, holiday homes, chalets, housekeeping cottages and cabins, and youth hostel and mountain refuges,', 4),
('ce1d178d-96ea-43d9-88e2-469d01f0d600','1e7d14bb-0b56-4edb-8205-fb6bc2ca9d40', 'Accommodation in camping grounds, recreational vehicle parks and trailer parks, ', 4),
('1ad22b33-a0aa-408f-96f0-5fcc5bb6794b','1e7d14bb-0b56-4edb-8205-fb6bc2ca9d40', 'Accommodation in student residences, school dormitories, workers’ hostels, rooming and boarding houses', 4),
('e1232c0d-54d9-4ad6-b5fa-bcfe82dce554','1e7d14bb-0b56-4edb-8205-fb6bc2ca9d40', 'Other accomodation services', 4),
('ac4ecb39-34c1-4fb3-8240-2ae6b213ecf1','5c073efd-936f-40a9-8e29-52340c4c1af7', 'Provision of food service to customers in restaurants, cafeterias, fast food restaurants, pizza delivery, take out eating places, ice-cream truck vendors, mobile food carts, food preparation in market stalls,', 4),
('920e07c3-d109-4ea8-b3df-4e9d76fe794e','5c073efd-936f-40a9-8e29-52340c4c1af7', 'Event catering and other food-service activities, ', 4),
('e5b25acf-d490-407c-8f0a-490b96c5f627','5c073efd-936f-40a9-8e29-52340c4c1af7', 'Beverage serving activities in bars, taverns, cocktail lounges, discotheques, beer parlors and pubs, coffee shops, fruit juice bars, and mobile beverage vendors. ', 4),
('105b91f0-040b-4c5b-9be7-530434c27b87','5c073efd-936f-40a9-8e29-52340c4c1af7', 'Other food and beverage services', 4),
('a1da8e3b-1336-4476-9422-28f0be7a78ff','6473fe1a-096c-420a-b807-11d21f2d4761', 'Retail travel agencies', 4),
('4ddf8c01-c4bd-401b-8a03-fee727fc3435','6473fe1a-096c-420a-b807-11d21f2d4761', 'Wholesale travel agencies', 4),
('65bfcde8-5402-41cc-bf87-3370fca47477','6473fe1a-096c-420a-b807-11d21f2d4761', 'Online travel agencies', 4),
('89dd8b08-fd75-4ea7-84d1-fccafb71daa2','6473fe1a-096c-420a-b807-11d21f2d4761', 'Tour operators', 4),
('86662c0f-a378-4640-ba14-ca4b7cc9dffe','92b69a99-1512-4142-9257-3da487c12596', 'Sport and recreational activities', 4),
('dfdea11e-f480-4a9e-90cc-be0aad7d281d','92b69a99-1512-4142-9257-3da487c12596', 'Cultural activities', 4),
('4cb2721a-ca5d-4305-b308-ef570538d64a','dfc09fc9-088b-4643-9649-0ffc4bb4db0a', 'Road passenger transport', 4),
('8adc7986-3254-4483-b2ad-657acf2fd567','dfc09fc9-088b-4643-9649-0ffc4bb4db0a', 'Air passenger transport', 4),
('8b6b1396-8cd6-4e1d-9959-b24e7c1e120c','dfc09fc9-088b-4643-9649-0ffc4bb4db0a', 'water passenger transport', 4),
('19428870-335f-4002-ac48-51f60a0d186c','dfc09fc9-088b-4643-9649-0ffc4bb4db0a', 'railway passenger transport', 4),
('9895aa28-2974-4d8a-a3ea-a5d1a31572f9','7903db62-6d91-47cf-94b1-d1ec129c4f80', 'Wholesale on a fee or contract basis', 4),
('1dd27d0e-f5f0-489e-8016-6c0458defd94','7903db62-6d91-47cf-94b1-d1ec129c4f80', 'Wholesale of agricultural raw materials and live animals', 4),
('729638b3-0f11-45b1-9a0d-4b807952f98b','7903db62-6d91-47cf-94b1-d1ec129c4f80', 'Wholesale of food, beverages and tobacco', 4),
('4d155378-0fdb-4001-b17d-704634803c86','7903db62-6d91-47cf-94b1-d1ec129c4f80', 'Wholesale of household goods', 4),
('96df845f-1f10-4781-b346-29842df3f97d','7903db62-6d91-47cf-94b1-d1ec129c4f80', 'Wholesale of machinery, equipment and supplies', 4),
('96d956cf-a193-4409-8729-ae57f1148abd','7903db62-6d91-47cf-94b1-d1ec129c4f80', 'Other specialized wholesale', 4),
('8756d857-ec69-4d54-9d7d-ead4587d91aa','7903db62-6d91-47cf-94b1-d1ec129c4f80', 'Non-specialized wholesale trade', 4),
('2ed45da7-4b7a-4b78-84d8-28601638dff2','7903db62-6d91-47cf-94b1-d1ec129c4f80', 'Other wholesade trade', 4),
('f4a4c184-fd3d-495a-a63a-976acecd3a62','a906b6a2-6bf0-49c0-9553-e62f93123b23', 'Retail trade in stores', 4),
('b1e8e81e-4ad6-42f6-9c68-4aba2eaad68e','a906b6a2-6bf0-49c0-9553-e62f93123b23', 'Retail trade non in stores', 4),
('2d4522a8-7796-4879-b4f6-d9add84b5c2b','a906b6a2-6bf0-49c0-9553-e62f93123b23', 'Other retail trade', 4),
('8f48c5d3-b8c7-4972-a874-101709f28868','d472189c-06ff-4a43-96df-bd22cfc31b8e', 'Sale of motor vehicles', 4),
('b419469f-9ec3-44d8-b448-6aac504e5ff3','d472189c-06ff-4a43-96df-bd22cfc31b8e', 'Maintenance and repair of motor vehicles', 4),
('b3726d40-58fc-4474-ae52-703523a90f83','d472189c-06ff-4a43-96df-bd22cfc31b8e', 'Sale of motor vehicle parts and accessories', 4),
('dd135916-91d6-4e15-96c3-262d8a9825da','d472189c-06ff-4a43-96df-bd22cfc31b8e', 'Sale, maintenance and repair of motorcycles and related parts and accessories', 4),
('fff57b30-1492-4328-9691-224009442017','d472189c-06ff-4a43-96df-bd22cfc31b8e', 'Others', 4),
('0b2ce8f7-5e4d-42b5-8d3e-f3323931d601','268a8fa2-0ab0-446a-9f2a-8f2a8fcb87a0', 'Rental and leasing activities', 4),
('25ea9ae9-ac92-4c58-8af7-dc0a51837cdc','268a8fa2-0ab0-446a-9f2a-8f2a8fcb87a0', 'Employment activities', 4),
('6443ee09-b5de-419c-910d-669b6e96a6d5','268a8fa2-0ab0-446a-9f2a-8f2a8fcb87a0', 'Security and investigation activities', 4),
('56506c13-ad53-4115-ab47-03a942e7ac29','268a8fa2-0ab0-446a-9f2a-8f2a8fcb87a0', 'Services to buildings and landscape activities', 4),
('54cc223d-7cfd-4218-a85c-b26bdf74a763','268a8fa2-0ab0-446a-9f2a-8f2a8fcb87a0', 'Office administrative, office support and other business support activities', 4),
('e03d35db-ef39-45a2-aa7b-e87110794294','57d8f07f-da85-4b98-bece-21628c06b41b', 'legal and accounting activities', 4),
('dc5377b6-8371-4b50-a0e4-3d13f4581625','57d8f07f-da85-4b98-bece-21628c06b41b', 'Activities of head offices, management consultancy activities', 4),
('55a75d0c-362a-46b7-a45c-a6ee920c0eba','57d8f07f-da85-4b98-bece-21628c06b41b', 'Architectural and engineering activities, technical testing and analysis', 4),
('741e8e37-b981-4fe7-8ee2-aab6002edbb9','57d8f07f-da85-4b98-bece-21628c06b41b', 'Scientific research and development', 4),
('18a71ba6-7ce6-46ec-a109-b22e55c96742','57d8f07f-da85-4b98-bece-21628c06b41b', 'Other professional, scientific and technical activities', 4),
('246ece37-06d6-4756-a664-d7befb77ac8a','57d8f07f-da85-4b98-bece-21628c06b41b', 'Veterinary activities', 4),
('15c3ab0e-39ab-4128-951c-8984a8680369','9f89df69-ae73-4b72-92e2-f6377a054fb1', 'real estate with own or leased property', 4),
('dc66cc14-d6da-4817-9674-0c10248e5ae4','9f89df69-ae73-4b72-92e2-f6377a054fb1', 'Real estate activities on a fee or contract basis', 4),
('e419da28-4837-4592-b8bc-3df3a889600d','bd2705b8-556e-4aa2-98d0-6bd197c5b75d', 'Monetary intermediation', 4),
('0fc457a4-2c64-4784-a656-c011589b685c','bd2705b8-556e-4aa2-98d0-6bd197c5b75d', 'Holding companies', 4),
('db0c8841-bf65-4f77-bfd2-ff66927d05f6','bd2705b8-556e-4aa2-98d0-6bd197c5b75d', 'Trusts, funds and similar financial entities', 4),
('579f3c48-b5f2-4e4a-9469-1e7112aab10a','bd2705b8-556e-4aa2-98d0-6bd197c5b75d', 'Other financing services', 4),
('b344b04c-8ff2-4a9b-b2d3-83d32f55bfeb','bd2705b8-556e-4aa2-98d0-6bd197c5b75d', 'Insurance', 4),
('1b2a88d0-13b6-4c24-82b7-c7b9faf899ea','bd2705b8-556e-4aa2-98d0-6bd197c5b75d', 'Reinsurance', 4),
('790a64e1-fa61-41ca-88cd-3ee75463872c','bd2705b8-556e-4aa2-98d0-6bd197c5b75d', 'Pension funding', 4),
('e1ef450c-5e31-4adc-9ce9-2ce1187a0e17','bd2705b8-556e-4aa2-98d0-6bd197c5b75d', 'Activities auxiliary to financial service and insurance activities', 4),
('c3e75c3d-7b0f-48f8-973e-a7cb1338e78a','bd2705b8-556e-4aa2-98d0-6bd197c5b75d', 'Fund management activities', 4),
('c82d7874-ab80-497f-8bdb-52e0e885c11b','2087f7b3-d75b-49a6-86e5-0038611877fa', 'community-based', 4),
('4e938f32-722f-4d92-8ce7-d3bc3cf26d2b','2087f7b3-d75b-49a6-86e5-0038611877fa', 'primary health care', 4),
('c61cfa1e-0ebe-4362-8e1a-07b1f72f0716','2087f7b3-d75b-49a6-86e5-0038611877fa', 'secondary ', 4),
('c09d7a13-e3bc-4f93-a2df-e3078cdd798b','2087f7b3-d75b-49a6-86e5-0038611877fa', 'tertiary levels', 4),
('14c98341-1bce-472e-8b10-de1613c8f48c','2087f7b3-d75b-49a6-86e5-0038611877fa', 'Other-non categorized', 4),
('ba2a1997-ecaa-4e83-a43b-7de3a5ed286a','42a6cc9e-ac57-4adb-ad22-ce3bdfba2d59', 'Telemedicine', 4),
('007c1471-41db-40d7-8dcc-259f0120131d','42a6cc9e-ac57-4adb-ad22-ce3bdfba2d59', 'Sexual and reproductive health', 4),
('f9979538-c012-4b72-9c72-0dce64859799','42a6cc9e-ac57-4adb-ad22-ce3bdfba2d59', 'Health education', 4),
('86d0106b-2049-42e2-bb9b-9bc05fd737c9','42a6cc9e-ac57-4adb-ad22-ce3bdfba2d59', 'Emergency medical services', 4),
('b1707b56-615c-4681-9a1e-91ea164dc5d4','42a6cc9e-ac57-4adb-ad22-ce3bdfba2d59', 'Environmental health', 4),
('04b9f8b5-bed9-4dc4-9e43-48232a6c3bfa','42a6cc9e-ac57-4adb-ad22-ce3bdfba2d59', 'One health', 4),
('79c190c8-5bfa-4879-aeab-7e209d6baf7e','42a6cc9e-ac57-4adb-ad22-ce3bdfba2d59', 'Immunization programs', 4),
('59a71915-9f2c-473e-b916-f432f053eee9','42a6cc9e-ac57-4adb-ad22-ce3bdfba2d59', 'Mental health', 4),
('6c9c7298-1808-46d6-bbfc-a6adca79bf30','42a6cc9e-ac57-4adb-ad22-ce3bdfba2d59', 'Communicable diseases programs', 4),
('cb3240d4-c6c4-4dc9-baec-0b9564eaec91','42a6cc9e-ac57-4adb-ad22-ce3bdfba2d59', 'Non-communicable diseases programs', 4),
('2635d93d-724b-48ae-b1f4-ff794334dfce','42a6cc9e-ac57-4adb-ad22-ce3bdfba2d59', 'Nutrition', 4),
('1302ba8f-51e6-4eb2-a214-79c775aedd3c','42a6cc9e-ac57-4adb-ad22-ce3bdfba2d59', 'Family planning', 4),
('fbf6956f-f71e-4055-bb28-fb59a6ca23ba','42a6cc9e-ac57-4adb-ad22-ce3bdfba2d59', 'Health surveillance and early warning', 4),
('2427e3e3-ac9f-4b27-90d6-dac29b4ba4bd','42a6cc9e-ac57-4adb-ad22-ce3bdfba2d59', 'Other health services', 4),
('488615b4-ea96-4e44-a34a-c0efa755429f','a92df837-2005-4fc0-9084-45a39649715e', 'Health information systems', 4),
('66700d83-d880-4d10-96ff-3d79743aef1d','890039b4-3fae-4fa5-ae95-85d47714045a', '01 Early childhood educational development ( below 3)', 4),
('3232642f-08a2-460d-bd66-3dfe6219a206','890039b4-3fae-4fa5-ae95-85d47714045a', 'Early childhood (02 Pre-primary - 3 to start primary)', 4),
('cbdd6c28-a679-4520-838d-e5c791d97358','7fb35894-ff2a-48ce-bc13-18d8119a757e', 'Primary education', 4),
('46abe55e-793f-445a-9556-cddc90e58695','ccbfb4dd-cd8a-489f-876c-e20fea0f22e3', '2- Lower secondary - middle school', 4),
('6dbb6d4d-b756-424b-91bc-c1dc723fd32b','ccbfb4dd-cd8a-489f-876c-e20fea0f22e3', '3 Upper secondary / High school', 4),
('503ad119-18f0-4d2d-b69a-80a5639e0cb8','bc363efd-051b-402c-ae67-bdf14a122364', 'General', 4),
('3d080097-312a-4bb7-b7cb-46347a1f5b03','bc363efd-051b-402c-ae67-bdf14a122364', 'Vocational', 4),
('6890a2a3-2ac2-412c-9aa2-033b1e17a4e1','073072a3-7142-4fbb-a4c2-07c8934a356e', '5 -Short-cycle tertiary education ( general or vocational)', 4),
('e13d689c-a7b0-4719-b210-705bbfe18bb4','073072a3-7142-4fbb-a4c2-07c8934a356e', '6,7,8-Bachelors, Master, Phd ( academic or professional)', 4),
('84441af0-7a3f-43c2-9c2c-321f87eec446','0c2cc3f5-2780-4d16-8663-76c7315f1f94', 'Adult education/ literacy programs', 4),
('4de62753-dbdd-4244-ba67-2428afefe2f7','0c2cc3f5-2780-4d16-8663-76c7315f1f94', 'Community education', 4),
('bf770f81-65dd-4d3e-bdda-78ec46c602ba','0c2cc3f5-2780-4d16-8663-76c7315f1f94', 'Continuing professional development programs', 4),
('ccc75fb7-874e-42a9-b345-1f36feb6c6d5','0c2cc3f5-2780-4d16-8663-76c7315f1f94', 'Others - Adult language centers', 4),
('c015376c-92db-427a-abca-a91a07b5eff5','0c2cc3f5-2780-4d16-8663-76c7315f1f94', 'Others -lifelong learning', 4),
('d55816d1-4e9b-4b3a-97e5-f5c096d7391a','0c2cc3f5-2780-4d16-8663-76c7315f1f94', 'Other non-formal education', 4),
('9d8b03b6-e37c-472b-9f2f-1b902f3fe567','e25331d6-dca9-40da-bdd7-9f63979b353b', 'With all basic facilities', 4),
('2064aa0c-d4a6-4564-88f3-9c9447189a1d','e25331d6-dca9-40da-bdd7-9f63979b353b', 'Conventional dwellings', 4),
('f0b6d9c7-7839-472c-a016-387d692b104e','e25331d6-dca9-40da-bdd7-9f63979b353b', 'Other housing units', 4),
('b2222a5b-849f-4cba-b185-3d9b40477376','13864003-2c42-454b-b723-f25eb0ae307d', 'Rooming houses and lodging', 4),
('dd3eaa67-41ff-49ef-a0b1-d3e2d3d98dd4','13864003-2c42-454b-b723-f25eb0ae307d', 'Institutions', 4),
('a606c3aa-d629-46e8-9c90-660b98a333e3','13864003-2c42-454b-b723-f25eb0ae307d', 'Camps and workers quarters', 4),
('cbcf0a61-96c4-450f-aa9c-76bbc39914f8','13864003-2c42-454b-b723-f25eb0ae307d', 'Other collectiving living quarters', 4),
('19b63b1e-4256-4fe0-8ab4-496182624d41','ca435a93-65bd-4d9e-b231-05d2f0107a75', 'Built heritage', 4),
('303f5e40-7d85-449a-866b-30bd65810a15','ca435a93-65bd-4d9e-b231-05d2f0107a75', 'Cultural sites', 4),
('2207291f-04e2-4779-b10b-57f921b59bbf','ca435a93-65bd-4d9e-b231-05d2f0107a75', 'Natural sites', 4),
('16424c99-ca8b-416c-ac7b-c1be41860df6','ca435a93-65bd-4d9e-b231-05d2f0107a75', 'Movable properties and collections', 4),
('469370c8-abff-42e1-99c3-c5f6801d5d09','ca435a93-65bd-4d9e-b231-05d2f0107a75', 'Repositories of heritage', 4),
('aca8ff5a-2da5-43f3-9111-ce1a98ae1263','ca435a93-65bd-4d9e-b231-05d2f0107a75', 'Urban heritage', 4),
('392f114b-6bc3-4df1-86bf-025aac84a08f','ca435a93-65bd-4d9e-b231-05d2f0107a75', 'Other tangible heritage designations', 4),
('a0a82c7e-8575-4218-950b-228bbc3cb31f','52d0089f-d097-457d-82f9-a693561974f6', 'landscapes,', 4),
('69e9e911-89ea-494a-ba94-d594d4ae7697','52d0089f-d097-457d-82f9-a693561974f6', 'traditional knowledge, ', 4),
('a722a6de-49bb-4d82-ba90-59bf2cda7fd0','52d0089f-d097-457d-82f9-a693561974f6', 'rituals, ', 4),
('41744964-bb4e-4da4-8547-340d3f6df50f','52d0089f-d097-457d-82f9-a693561974f6', 'festivals,  ', 4),
('f34e60af-384a-4045-8325-ddbdad75e67e','52d0089f-d097-457d-82f9-a693561974f6', 'language ', 4),
('da9f4174-6ffc-4a38-b307-7a49e8fc0f4c','52d0089f-d097-457d-82f9-a693561974f6', 'cultural practices', 4),
('cee4cc64-4490-4e18-a1ea-08f6acbd8193','48b5facd-f99e-4051-bca9-8c02f683ae78', 'Road transport infrastructure', 4),
('2620f256-b5fb-4da5-b7ca-c7fe9a0cbb2c','48b5facd-f99e-4051-bca9-8c02f683ae78', 'Railroad transport ', 4),
('ad895a04-068e-4cac-9fd1-aba6d3a154e2','48b5facd-f99e-4051-bca9-8c02f683ae78', 'Pipeline transport ', 4),
('66c9f601-3b56-4542-ba66-501afcbc8631','48b5facd-f99e-4051-bca9-8c02f683ae78', 'Other land transport', 4),
('4ce52ad0-3255-4b3a-865e-4c36e840d518','3cf24f5d-5ecb-4d62-b0cf-77db213da02b', 'Passenger air transport', 4),
('cfb5e514-017e-406e-8bb2-998f72417da1','3cf24f5d-5ecb-4d62-b0cf-77db213da02b', 'Freight air transport', 4),
('1279965a-ab82-4e3d-97ce-40c02ed58a5e','84af0959-7f53-45db-888b-3eeeb897b405', 'Sea and coastal ', 4),
('dd56589a-a51d-48ce-bc9b-dc24fe41c656','84af0959-7f53-45db-888b-3eeeb897b405', 'Inland water transport', 4),
('8a9ea73f-849a-4fff-ac04-6212af1b57c6','84af0959-7f53-45db-888b-3eeeb897b405', 'Other water transportation', 4),
('22514fe2-8feb-42ed-aa6f-15531cb9d902','deffe5ac-8e53-44ad-a9f3-0d1a03f4b0c8', 'Warehousing and storage', 4),
('807e0e07-cab5-4ec3-af02-6d957cc04671','deffe5ac-8e53-44ad-a9f3-0d1a03f4b0c8', 'Support activities for transportation', 4),
('bd89c05b-85c0-406b-a5fd-c541e1f9f248','deffe5ac-8e53-44ad-a9f3-0d1a03f4b0c8', 'Other transportation support activities', 4),
('630e9cad-91ad-4926-ba8e-b60371f5f4fd','a14fce6f-fae4-4f63-80c5-785d6c60298f', 'Postal activities', 4),
('dd4fc7fb-d632-4d5d-90db-d453c7efbede','a14fce6f-fae4-4f63-80c5-785d6c60298f', 'Courier activities', 4),
('23023918-1f01-42ec-ba23-fb70f7cce0e4','9090ef1f-2abe-4623-8917-5b30cb6d0b5b', 'Non Renewable', 4),
('10fddff2-721d-4858-9949-7de0eefa1575','9090ef1f-2abe-4623-8917-5b30cb6d0b5b', 'Renewable', 4),
('870c5468-2d47-434e-94fb-9fc3c3306b0e','9090ef1f-2abe-4623-8917-5b30cb6d0b5b', 'Electricity Storage', 4),
('62f75567-7770-460f-b418-1019480df190','9090ef1f-2abe-4623-8917-5b30cb6d0b5b', 'Extra/ultra/high voltage', 4),
('93267b28-7cd5-4b87-8bab-70bd72caab25','9090ef1f-2abe-4623-8917-5b30cb6d0b5b', 'Medium voltage', 4),
('a71c4a2e-ced0-4350-96cf-371fefb9aba2','9090ef1f-2abe-4623-8917-5b30cb6d0b5b', 'Low voltage', 4),
('d1de06ce-4033-4071-82df-c91da1cf1bb0','9090ef1f-2abe-4623-8917-5b30cb6d0b5b', 'Residential  and commercial network', 4),
('d115c081-ac1d-497a-a5e3-4a4420f8e91f','9090ef1f-2abe-4623-8917-5b30cb6d0b5b', 'Industrial network', 4),
('8e679607-2e01-4273-8b0a-04e9b6223b9e','9090ef1f-2abe-4623-8917-5b30cb6d0b5b', 'Other specials network', 4),
('dc0ae105-7763-4d82-bf41-99837730c503','f0dc660e-3b3a-4de2-83ac-3cb481ab9b33', 'Natural gas- upstream', 4),
('30c2090f-5751-4920-a01f-9c80b3f225bd','f0dc660e-3b3a-4de2-83ac-3cb481ab9b33', 'Natural Gas processing', 4),
('c19f025d-dcd4-4f14-bbd3-755cf2809eba','f0dc660e-3b3a-4de2-83ac-3cb481ab9b33', 'Natural Gas storage', 4),
('dfc398b4-ba68-4fcc-8dba-f14480ab9952','f0dc660e-3b3a-4de2-83ac-3cb481ab9b33', 'Gas Distribution ', 4),
('f88c345c-5085-4355-884a-168bad07108e','f0dc660e-3b3a-4de2-83ac-3cb481ab9b33', 'Oil Manufacture/ upstream', 4),
('e1fe4767-6a35-436e-acdf-ae943e490d5b','f0dc660e-3b3a-4de2-83ac-3cb481ab9b33', 'Oil refinery ', 4),
('d5937a3f-84c1-46bd-90b1-6e99be7cc040','f0dc660e-3b3a-4de2-83ac-3cb481ab9b33', 'Oil strorage', 4),
('26288798-deb9-46f9-95b7-fa9d925437ab','f0dc660e-3b3a-4de2-83ac-3cb481ab9b33', 'Oil Distribution through mains', 4),
('0bd04b6b-f095-4d32-b634-0ada48972a37','f0dc660e-3b3a-4de2-83ac-3cb481ab9b33', 'Coal Generation', 4),
('40fc83f2-18e1-493a-af2b-2499744e3416','f0dc660e-3b3a-4de2-83ac-3cb481ab9b33', 'Coal Distribution', 4),
('cdda5875-db4c-4c93-bbc6-838eb7e964d6','f0dc660e-3b3a-4de2-83ac-3cb481ab9b33', 'Steam Generation', 4),
('bf88f421-ead9-438a-9876-6b832acc805f','f0dc660e-3b3a-4de2-83ac-3cb481ab9b33', 'Steam Distribution', 4),
('561a33e9-a2e6-4f27-91a4-35a30b75d78d','f0dc660e-3b3a-4de2-83ac-3cb481ab9b33', 'Hot water Generation', 4),
('78ac5869-ccbf-44ee-a5f3-0abba19f887a','f0dc660e-3b3a-4de2-83ac-3cb481ab9b33', 'Hot water Distribution', 4),
('ca1045e2-046e-4d0b-954f-783d34faeb98','cb93fa53-3dbb-4125-8a3c-26e77dbad725', 'Wired telecommunication activities,', 4),
('61f64901-3ac8-48aa-b342-3494ad2134c2','cb93fa53-3dbb-4125-8a3c-26e77dbad725', 'Wireless telecommunication activities,', 4),
('e366836c-a373-4286-a312-71654fc4dbdf','cb93fa53-3dbb-4125-8a3c-26e77dbad725', 'Satellite telecommunication activities, ', 4),
('20b746cd-716f-464e-a3b2-c01f7a9a7beb','1a9ed881-e6dc-463f-836c-8f096c60df4c', 'Other telecommunications activities', 4),
('bdd093eb-66e1-45cd-bc9d-0752aa88f63a','b08b5ffc-26c5-4aa5-88ac-2baa217a4d7a', 'From  Surface water', 4),
('0651e48f-ad73-41f3-9afc-8943b5c63898','b08b5ffc-26c5-4aa5-88ac-2baa217a4d7a', 'From Ground water', 4),
('cbf45558-cddb-4957-8c97-876d98cc95ca','b08b5ffc-26c5-4aa5-88ac-2baa217a4d7a', 'From Soil water', 4),
('5e12e084-13b4-4b03-8f26-93d9c0cdea09','b08b5ffc-26c5-4aa5-88ac-2baa217a4d7a', 'Desalination', 4),
('30e02d66-4e97-41b6-97b8-609cbcf6f00a','b08b5ffc-26c5-4aa5-88ac-2baa217a4d7a', 'From Reclaimed', 4),
('406c3161-b30c-46c2-8270-a12149d30276','b08b5ffc-26c5-4aa5-88ac-2baa217a4d7a', 'From Rainwater harvested', 4),
('7714c4b6-d186-43cf-9fa2-81fade0b0262','b08b5ffc-26c5-4aa5-88ac-2baa217a4d7a', 'Other water sources', 4),
('853f7da3-df07-48da-b2b6-50ae0c4034a8','1e4cc659-c250-4f90-a107-294a85034790', 'Physical water treatment ', 4),
('e7249d26-c14a-4c8a-8b78-9fcb5aefc946','1e4cc659-c250-4f90-a107-294a85034790', 'Chemical water treatment', 4),
('d4c6ff01-027a-4cce-b4f0-7d1c4839722b','1e4cc659-c250-4f90-a107-294a85034790', 'Biological water treatment', 4),
('3f6ada77-cdb6-4205-a055-7877e1524ecb','1e4cc659-c250-4f90-a107-294a85034790', 'Thermal water treatment', 4),
('755cc4c7-e571-4123-b785-5ae5860de70d','1e4cc659-c250-4f90-a107-294a85034790', 'Other treatment system', 4),
('5089f10a-2674-4bc0-8c2f-c2d0077d0972','f57c9597-420a-4df4-94a2-bd12345b7584', 'Piped water distribution ', 4),
('f70c2b1a-8019-480a-aa2b-5625bfbdf68b','f57c9597-420a-4df4-94a2-bd12345b7584', 'Non-piped water distribution', 4),
('1cd88e57-acca-42e0-8c3b-8caef5f71910','17e8b94c-2362-4dd9-89e0-4240df53110a', 'Urban sewage system', 4),
('25c18e73-1de8-4a9e-ba2c-13a3be435993','17e8b94c-2362-4dd9-89e0-4240df53110a', 'Storm and runoff collection systems', 4),
('7bce6096-3025-47a6-9367-43116f46b815','17e8b94c-2362-4dd9-89e0-4240df53110a', 'Wastewater and sewage treatment facilities', 4),
('0e088892-de2d-46be-a77e-a06a4be7dd21','17e8b94c-2362-4dd9-89e0-4240df53110a', 'pumping systems', 4),
('c5d64ff0-3e4b-466a-af5b-251aa35b573f','7aad3cff-acee-4aaa-a2df-8e7ae9a135ce', 'Waste collection', 4),
('191a42a0-67c4-41de-bc20-4a770c30b384','7aad3cff-acee-4aaa-a2df-8e7ae9a135ce', 'Waste processing and treatment', 4),
('7f43540e-aa42-4f64-9e94-1b8441394a29','7aad3cff-acee-4aaa-a2df-8e7ae9a135ce', 'Waste transportation', 4),
('c3fdf641-18c2-44aa-aade-08a1d86a6123','7aad3cff-acee-4aaa-a2df-8e7ae9a135ce', 'Waste disposal', 4),
('a1f97f32-54c3-4c79-aabb-d9b557825cff','d1af9066-f0c1-43e0-bca6-0ecfd0835a92', 'Waste collection', 4),
('ed87ee80-1269-4c3b-aaed-8327dc58dfa8','d1af9066-f0c1-43e0-bca6-0ecfd0835a92', 'Waste processing and treatment', 4),
('7c468c3e-806c-4196-b17a-7d21dbca4d7b','d1af9066-f0c1-43e0-bca6-0ecfd0835a92', 'Waste transportation', 4),
('1bbfe971-fddf-45d7-bdde-99122d4aaede','d1af9066-f0c1-43e0-bca6-0ecfd0835a92', 'Waste disposal', 4),
('b4abfa88-397e-4bf4-8b67-35dcfeb1cf83','0dca6942-2007-489f-9c7a-5f0a182837ab', 'Species', 4),
('1d584d8e-5e14-47e6-887b-c773ece1d0fb','0dca6942-2007-489f-9c7a-5f0a182837ab', 'Habitats', 4),
('948d0024-f77c-444a-820c-9a0e9a2a1961','0dca6942-2007-489f-9c7a-5f0a182837ab', 'Ecosystems', 4),
('7d5ec14a-e56c-4c3f-b42c-ff7fab53479a','0dca6942-2007-489f-9c7a-5f0a182837ab', 'Landscapes', 4),
('f417b311-ef99-4b0b-9530-a05beea9f8fa','3cda0cd2-ee4a-489a-9eb9-6f97c68a6ea1', 'Land ( including soils)', 4),
('7982185b-6fea-4159-a4a1-2a302473ed55','3cda0cd2-ee4a-489a-9eb9-6f97c68a6ea1', 'Agricultural land', 4),
('5c034f2f-3d81-4605-b8fa-507e16881370','3cda0cd2-ee4a-489a-9eb9-6f97c68a6ea1', 'Primary forest', 4),
('a4c97a9f-2fb1-4210-a989-b8a9289d0610','3cda0cd2-ee4a-489a-9eb9-6f97c68a6ea1', 'Freshwater', 4),
('2eaa8056-45c0-49b7-b5f8-267de34f919f','3cda0cd2-ee4a-489a-9eb9-6f97c68a6ea1', 'Other natural resources', 4),
('aeb21813-7ffd-4a89-b046-2570b3ddb8ab','d051628b-9012-4e35-9f82-78d977b7acf1', 'Supporting services ', 4),
('603295fc-a0e4-47a4-a9d2-53f868b2a5dd','d051628b-9012-4e35-9f82-78d977b7acf1', 'Regulating Services', 4),
('049c8680-fe1d-4e3c-ac1e-7dfdda7a2bd8','d051628b-9012-4e35-9f82-78d977b7acf1', 'Provisioning services', 4),
('cfcb78d0-c53d-4a0a-bf6d-7158df6b1fb4','d051628b-9012-4e35-9f82-78d977b7acf1', 'Cultural services', 4),
('5fb2ef9c-bd59-449f-acfe-bcc67beed140','36b90c7d-743f-4ff3-8136-896b3e82c64d', 'Time-use', 4),
('4dfa5900-040f-4ba5-8b97-8869eca1e88d','36b90c7d-743f-4ff3-8136-896b3e82c64d', 'Access to ressources', 4),
('26a2eda9-01d7-4c2c-8912-da963bac6695','36b90c7d-743f-4ff3-8136-896b3e82c64d', 'Access to services', 4),
('c6106c3e-b79e-4d97-9cab-608ce9aaf83b','36b90c7d-743f-4ff3-8136-896b3e82c64d', 'Livelihoods - production', 4),
('d98d2f67-0573-44ad-9624-963d84460e1d','36b90c7d-743f-4ff3-8136-896b3e82c64d', 'Productive Asset ownership', 4),
('874c324c-3296-44fc-a2d4-d1de18a06ae9','36b90c7d-743f-4ff3-8136-896b3e82c64d', 'Human mobility', 4),
('226c2228-319d-471a-bb3b-b384c2b582e4','36b90c7d-743f-4ff3-8136-896b3e82c64d', 'Gender-based discrimination', 4),
('b634a681-cc71-4c9e-9596-a8f3035a3520','2d127594-6cd6-4c36-a867-96fae56d42c8', 'Physical violence', 4),
('033fa443-4b45-4755-9ac9-eef89703f598','2d127594-6cd6-4c36-a867-96fae56d42c8', 'Sexual violence', 4),
('adc919fb-f4b3-4314-87ae-42b13f85186e','2d127594-6cd6-4c36-a867-96fae56d42c8', 'Psychological abuse', 4),
('21c663e3-5ec3-4178-a860-192cbdde3207','2d127594-6cd6-4c36-a867-96fae56d42c8', 'Economic abuse', 4),
('fd6a89f6-98b4-436c-a210-a89f27a82fb4','2d127594-6cd6-4c36-a867-96fae56d42c8', 'Harmful traditional practices', 4),
('b6ecdda3-ed32-4364-8014-333cc65cfcd7','2d127594-6cd6-4c36-a867-96fae56d42c8', 'Cyber or online abuse', 4),
('f149b01e-930c-4209-a277-957013405d5d','66186b25-80bf-4a54-8c3e-35cdb2782e26', 'Administration of the state', 4),
('8577496e-8acd-44c7-97f1-e14237f6a9a5','66186b25-80bf-4a54-8c3e-35cdb2782e26', 'Regional - Decentralized Administration', 4),
('d169543f-0d85-4ad9-b3cd-e37d47a2b98c','66186b25-80bf-4a54-8c3e-35cdb2782e26', 'Local administration', 4),
('28a159d2-393b-41f6-bf49-ec06cb3fe962','fa57c7e9-865d-44a0-af80-bc7740775077', 'Government ', 4),
('27496414-13fa-451a-a9b1-1f826ffded4a','4c21449f-ae8f-47c2-845a-77ffcd84c6ab', 'Parlaments/ Congress/ Lower chamber', 4),
('6a6afe39-5f69-4388-a629-b6cb58d5d243','4c21449f-ae8f-47c2-845a-77ffcd84c6ab', 'Upper Chamber/Senate', 4),
('da8c1129-b486-4e19-8094-58c3bb2568d0','04d3c630-ed60-4b25-86da-681b14a9ad75', 'Courts ', 4),
('d5279f2c-a6cb-4849-b35d-7ead1309ff6b','04d3c630-ed60-4b25-86da-681b14a9ad75', 'Tribunals', 4),
('1c60b012-0bfd-4bdc-b4a7-8b4f41b71725','f4782b71-e4fc-4b42-8625-e07ef89391c0', 'Employees', 4),
('2896fa44-03e9-4d46-a764-2243d510afa5','f4782b71-e4fc-4b42-8625-e07ef89391c0', 'Self-employed', 4),
('7ad764b7-58de-4417-8f67-f7709091c30d','f4782b71-e4fc-4b42-8625-e07ef89391c0', 'Gig workers/ Dependent contractor', 4),
('1264a672-86d4-4bc1-8ab8-3c51cadd3e54','d4771446-1514-449f-b38a-fb69530513a8', 'Commerce livelihoods', 4),
('e41994f6-4b02-4b6f-acb1-9d451c5ecb46','d4771446-1514-449f-b38a-fb69530513a8', 'Agriculture livelihoods', 4),
('bd5defd8-4cd4-4870-a45c-73590a78f50e','d4771446-1514-449f-b38a-fb69530513a8', 'Service livelihoods', 4),
('e5f7dd46-ab53-4585-8fbe-08bc10ab1607','d4771446-1514-449f-b38a-fb69530513a8', 'Handicraft livelihoods', 4),
('0a921aa4-1d16-43ad-8dd1-29c92294bd5e','d4771446-1514-449f-b38a-fb69530513a8', 'Culture livelihoods', 4),
('3e65de57-f93b-49cd-8ac9-2c41397c23a1','d4771446-1514-449f-b38a-fb69530513a8', 'Tourism livelihoods', 4),
('e997c4f7-046b-43de-a8a7-4af43e5fceb1','d4771446-1514-449f-b38a-fb69530513a8', 'Industry livelihoods', 4),
('6bfb2641-330f-4c09-a242-6bb391c9e930','d4771446-1514-449f-b38a-fb69530513a8', 'Care livelihoods', 4),
('f0b28365-58e7-495f-87fb-2cbb45ef92fb','5b8d5c0a-63ba-4adf-a54f-86268c187180', 'Disaster response', 4),
('43b4c6f4-9d4d-4c71-8cc4-9557ee5272cf','5b8d5c0a-63ba-4adf-a54f-86268c187180', 'Aid coordination', 4),
('b1dfc9d3-9b54-4d02-81d3-637988b4d0a2','5b8d5c0a-63ba-4adf-a54f-86268c187180', 'Hazard monitoring', 4);


-- populating assets
INSERT INTO public.asset(id, sector_ids, is_built_in, name, category, national_id, notes)	VALUES 
('43e4bc48-7700-4d51-8e11-0fb3ace947af', 'dd16548d-4087-4bef-8861-7069624859e3', true, 'Wheat', '', '11', 'Temporary - annual crops - Agriculture'),
('857c0722-6ff0-4ab5-a709-a0f16080962a', 'dd16548d-4087-4bef-8861-7069624859e3', true, 'Maize', '', '12', 'Temporary - annual crops - Agriculture'),
('f82779c8-2a56-4bd1-bf9c-8328a6cb8350', 'dd16548d-4087-4bef-8861-7069624859e3', true, 'Rice', '', '13', 'Temporary - annual crops - Agriculture'),
('25184c88-2d13-4783-88f2-5d4cd45a045b', 'dd16548d-4087-4bef-8861-7069624859e3', true, 'Sorghum', '', '14', 'Temporary - annual crops - Agriculture'),
('cd7424d9-5317-4c03-99b1-dea9bf8d0037', 'dd16548d-4087-4bef-8861-7069624859e3', true, 'Barley', '', '15', 'Temporary - annual crops - Agriculture'),
('bb4136ec-6746-4fab-bf13-33cd53dad4c1', 'dd16548d-4087-4bef-8861-7069624859e3', true, 'Rye', '', '16', 'Temporary - annual crops - Agriculture'),
('85054c5a-e954-442c-998e-44ff510c26cf', 'dd16548d-4087-4bef-8861-7069624859e3', true, 'Oats', '', '17', 'Temporary - annual crops - Agriculture'),
('609feae0-20c1-473c-9548-2df54a505049', 'dd16548d-4087-4bef-8861-7069624859e3', true, 'Millets', '', '18', 'Temporary - annual crops - Agriculture'),
('50cb4070-bbff-47d0-8f49-f1624546d9d7', 'dd16548d-4087-4bef-8861-7069624859e3', true, 'Other cereals, n.e.c', '', '19', 'Temporary - annual crops - Agriculture'),
('74dadf1e-bc16-4994-80ba-ecdd244c84b4', 'dd16548d-4087-4bef-8861-7069624859e3', true, 'Beans', '', '71', 'Temporary - annual crops - Agriculture'),
('823e56bf-41a3-49ba-b628-e91cb59231d5', 'dd16548d-4087-4bef-8861-7069624859e3', true, 'Broad beans, dry', '', '72', 'Temporary - annual crops - Agriculture'),
('7ac8bbaf-99c2-4229-a99b-4614891703d7', 'dd16548d-4087-4bef-8861-7069624859e3', true, 'Chick peas, dry', '', '73', 'Temporary - annual crops - Agriculture'),
('71663046-0877-41bf-9d6a-6bfa8415b80d', 'dd16548d-4087-4bef-8861-7069624859e3', true, 'Cow peas', '', '74', 'Temporary - annual crops - Agriculture'),
('edb5c41f-c496-4a85-99ad-87c147537de2', 'dd16548d-4087-4bef-8861-7069624859e3', true, 'Lentils', '', '75', 'Temporary - annual crops - Agriculture'),
('27830a75-ab3b-4eb5-aab5-4c60f4e0f97c', 'dd16548d-4087-4bef-8861-7069624859e3', true, 'Lupins', '', '76', 'Temporary - annual crops - Agriculture'),
('787e27e6-ad48-4937-9e1b-0bb6a8b24ab0', 'dd16548d-4087-4bef-8861-7069624859e3', true, 'Peas', '', '77', 'Temporary - annual crops - Agriculture'),
('455cfd32-1e1f-404b-9e49-14b0afaac038', 'dd16548d-4087-4bef-8861-7069624859e3', true, 'Pigeno peas', '', '78', 'Temporary - annual crops - Agriculture'),
('4801e89e-374a-4772-a40e-f75543c3f668', 'dd16548d-4087-4bef-8861-7069624859e3', true, 'Leguminous crops n.e.c.', '', '79', 'Temporary - annual crops - Agriculture'),
('508ade0a-8088-415c-b019-2983da435218', 'dd16548d-4087-4bef-8861-7069624859e3', true, 'Potatoes', '', '51', 'Temporary - annual crops - Agriculture'),
('a4423845-5826-470f-87b8-e9434b0c24e5', 'dd16548d-4087-4bef-8861-7069624859e3', true, 'Sweet potatoes', '', '52', 'Temporary - annual crops - Agriculture'),
('391a09fb-ec94-42f7-b143-944aafc97ce3', 'dd16548d-4087-4bef-8861-7069624859e3', true, 'Cassava', '', '53', 'Temporary - annual crops - Agriculture'),
('46c3136b-49b0-49b0-b856-af9c310192d5', 'dd16548d-4087-4bef-8861-7069624859e3', true, 'Yams', '', '54', 'Temporary - annual crops - Agriculture'),
('00d1f0d9-38af-42c0-9c05-0a2854bfee68', 'dd16548d-4087-4bef-8861-7069624859e3', true, 'Other roots & tubers, n.e.c.', '', '59', 'Temporary - annual crops - Agriculture'),
('74953725-7742-4532-bd35-b0f5c709a488', 'dd16548d-4087-4bef-8861-7069624859e3', true, 'Sugar beet', '', '81', 'Temporary - annual crops - Agriculture'),
('7ee76a92-3a18-455b-af99-35b29fd7e1b5', 'dd16548d-4087-4bef-8861-7069624859e3', true, 'Sugar cane', '', '82', 'Temporary - annual crops - Agriculture'),
('a9fc7194-4263-4fb6-a22a-90eb0ba13762', 'dd16548d-4087-4bef-8861-7069624859e3', true, 'Sugar beet seeds', '', '83', 'Temporary - annual crops - Agriculture'),
('d8cd2674-d536-445d-9429-62f1d06527ac', 'dd16548d-4087-4bef-8861-7069624859e3', true, 'Other sugar crops ( sugar maple, sweet sorghum)', '', '89', 'Temporary - annual crops - Agriculture'),
('a2c122d0-f141-4d54-aa4e-26520011845a', 'dd16548d-4087-4bef-8861-7069624859e3', true, 'Castor bean', '', '431', 'Temporary - annual crops - Agriculture'),
('6b5a5df9-1402-4ee6-9aec-e47e54221bdb', 'dd16548d-4087-4bef-8861-7069624859e3', true, 'Linseed', '', '432', 'Temporary - annual crops - Agriculture'),
('8626d134-df4a-4af0-b264-458747478ec1', 'dd16548d-4087-4bef-8861-7069624859e3', true, 'Mustard', '', '433', 'Temporary - annual crops - Agriculture'),
('54e76c51-0276-4a5b-bc59-c91f1570a69b', 'dd16548d-4087-4bef-8861-7069624859e3', true, 'Niger seed', '', '434', 'Temporary - annual crops - Agriculture'),
('80012e57-edb3-4e74-9200-f6cbb171b725', 'dd16548d-4087-4bef-8861-7069624859e3', true, 'Rapeseed', '', '435', 'Temporary - annual crops - Agriculture'),
('dd96cc41-8603-4f22-9cf4-3020618b2c56', 'dd16548d-4087-4bef-8861-7069624859e3', true, 'Safflower', '', '436', 'Temporary - annual crops - Agriculture'),
('88a908c4-117b-4cc5-8b62-f71e61d0916e', 'dd16548d-4087-4bef-8861-7069624859e3', true, 'Sesame', '', '437', 'Temporary - annual crops - Agriculture'),
('8e854da4-418e-4ad9-98fc-833350c18efd', 'dd16548d-4087-4bef-8861-7069624859e3', true, 'Sunflower', '', '438', 'Temporary - annual crops - Agriculture'),
('c94da795-3f88-4ddf-b092-b7ac0b83d469', 'dd16548d-4087-4bef-8861-7069624859e3', true, 'Other temporary oilseed crops, n.e.c', '', '439', 'Temporary - annual crops - Agriculture'),
('be709642-776c-4170-97d3-b780bf73ba5d', 'dd16548d-4087-4bef-8861-7069624859e3', true, 'Cotton', '', '9211', 'Temporary - annual crops - Agriculture'),
('b136af9c-417e-4741-9a00-58ec57af083e', 'dd16548d-4087-4bef-8861-7069624859e3', true, 'Jute, kenaf, and other similar', '', '9212', 'Temporary - annual crops - Agriculture'),
('c40474c8-1487-4364-9261-018bbf54405a', 'dd16548d-4087-4bef-8861-7069624859e3', true, 'Other temporary fire crops', '', '9219', 'Temporary - annual crops - Agriculture'),
('313cd4af-4f1a-4065-8fe3-d03306d2853f', 'dd16548d-4087-4bef-8861-7069624859e3', true, 'Artichokes', '', '211', 'Temporary - annual crops - Agriculture'),
('2a8128c0-8637-4adb-95fe-03785e7dff4f', 'dd16548d-4087-4bef-8861-7069624859e3', true, 'Asparagus', '', '212', 'Temporary - annual crops - Agriculture'),
('e5d27d61-4d4d-49af-9ed9-09552f67c358', 'dd16548d-4087-4bef-8861-7069624859e3', true, 'Cabbages', '', '213', 'Temporary - annual crops - Agriculture'),
('a7eb06b3-e5f1-4f44-afeb-05d0d6cc12df', 'dd16548d-4087-4bef-8861-7069624859e3', true, 'Cauliflowers & broccoli', '', '214', 'Temporary - annual crops - Agriculture'),
('6e6032a0-9647-47f3-a10f-6cc8e242b0f0', 'dd16548d-4087-4bef-8861-7069624859e3', true, 'Lettuce', '', '215', 'Temporary - annual crops - Agriculture'),
('ff1e4f83-bd24-4bf5-bbf3-4e50eaee75a2', 'dd16548d-4087-4bef-8861-7069624859e3', true, 'Spinach', '', '216', 'Temporary - annual crops - Agriculture'),
('c2e55174-e66d-42a6-a57c-130f9a910453', 'dd16548d-4087-4bef-8861-7069624859e3', true, 'Chicory', '', '217', 'Temporary - annual crops - Agriculture'),
('1f0f97c2-adfc-4ea9-8d02-d4fc32c6f03f', 'dd16548d-4087-4bef-8861-7069624859e3', true, 'Other leafy or stem vegetables, n.e.c', '', '219', 'Temporary - annual crops - Agriculture'),
('0c70f0c1-1a04-4198-a027-6617c0de227e', 'dd16548d-4087-4bef-8861-7069624859e3', true, 'Cucumbers', '', '221', 'Temporary - annual crops - Agriculture'),
('c7578fd9-5639-4322-951e-23f73f6bc004', 'dd16548d-4087-4bef-8861-7069624859e3', true, 'Eggplants ( aubergines)', '', '222', 'Temporary - annual crops - Agriculture'),
('9ee3e6da-783c-45a8-9635-785c4c299e7e', 'dd16548d-4087-4bef-8861-7069624859e3', true, 'Tomatoes', '', '223', 'Temporary - annual crops - Agriculture'),
('37baa2fa-0fc2-4d71-bc93-28175ba0babf', 'dd16548d-4087-4bef-8861-7069624859e3', true, 'Watermelons', '', '224', 'Temporary - annual crops - Agriculture'),
('5f17cb11-f5cf-46a3-be54-885a2fcb7341', 'dd16548d-4087-4bef-8861-7069624859e3', true, 'Cantaloupes and other melons', '', '225', 'Temporary - annual crops - Agriculture'),
('89090ff2-e57d-4be8-bad2-671de871746b', 'dd16548d-4087-4bef-8861-7069624859e3', true, 'Pumpkin, squash and gourds', '', '226', 'Temporary - annual crops - Agriculture'),
('1a875652-53ab-4c79-b0f3-db16d599ab10', 'dd16548d-4087-4bef-8861-7069624859e3', true, 'Other fruit-bearing vegetables, n.e.c', '', '229', 'Temporary - annual crops - Agriculture'),
('61a2a82f-f852-4fc8-b45c-cfa745013db6', 'dd16548d-4087-4bef-8861-7069624859e3', true, 'Carrots', '', '231', 'Temporary - annual crops - Agriculture'),
('2dd927e8-3d6e-4122-91bc-0462c4e81508', 'dd16548d-4087-4bef-8861-7069624859e3', true, 'Turnips', '', '232', 'Temporary - annual crops - Agriculture'),
('b1b509c1-a654-47d1-a4eb-c134734fc035', 'dd16548d-4087-4bef-8861-7069624859e3', true, 'Garlic', '', '233', 'Temporary - annual crops - Agriculture'),
('2f0096a4-9e15-4ff2-bdbc-ef9aaba16db3', 'dd16548d-4087-4bef-8861-7069624859e3', true, 'Onions (incl. shallots)', '', '234', 'Temporary - annual crops - Agriculture'),
('c24a7f6e-a97c-47f1-8520-0d0a1fd539d3', 'dd16548d-4087-4bef-8861-7069624859e3', true, 'Leeks & other alliaceous vegetables', '', '235', 'Temporary - annual crops - Agriculture'),
('14b32c3f-07c1-49fa-81f2-89407b1921e2', 'dd16548d-4087-4bef-8861-7069624859e3', true, 'Other root, bulb, or tuberous vegetables, n.e.c', '', '239', 'Temporary - annual crops - Agriculture'),
('ec708bfb-3bcc-4ca9-9b98-1de17328614b', 'dd16548d-4087-4bef-8861-7069624859e3', true, 'Maize for forage and silage', '', '1911', 'Temporary - annual crops - Agriculture'),
('b242e5cd-4fbb-49a5-954f-d7be683a9d23', 'dd16548d-4087-4bef-8861-7069624859e3', true, 'Alfalfa for forage and silage', '', '1912', 'Temporary - annual crops - Agriculture'),
('fc0d6fb6-eb73-4c75-aa38-4ac6772eb774', 'dd16548d-4087-4bef-8861-7069624859e3', true, 'Cereal straw, husks, unprepared, ground, pressed, or in the form of pellets', '', '1913', 'Temporary - annual crops - Agriculture'),
('c5e6dddf-298d-48cc-a640-d540317bffdd', 'dd16548d-4087-4bef-8861-7069624859e3', true, 'Forage products, n.e.c.', '', '1919', 'Temporary - annual crops - Agriculture'),
('f78d4006-e941-4f89-81aa-55a649be1ab8', '5a525ef1-592d-4808-977c-1e2cc2d2de8f', true, 'Apples 2', '', '351', 'Permanent- perennial crops - Agriculture'),
('7d0c9b63-2f15-4d18-bec3-884cd34ea405', '5a525ef1-592d-4808-977c-1e2cc2d2de8f', true, 'Apricots', '', '352', 'Permanent- perennial crops - Agriculture'),
('ac4f6545-2cb8-404a-b855-a328228b1f5a', '5a525ef1-592d-4808-977c-1e2cc2d2de8f', true, 'Cherries & sour cherries', '', '353', 'Permanent- perennial crops - Agriculture'),
('30867e26-001e-4605-a50b-8578537476f4', '5a525ef1-592d-4808-977c-1e2cc2d2de8f', true, 'Peaches & nectarines', '', '354', 'Permanent- perennial crops - Agriculture'),
('59f5ed40-fb0a-40aa-ab19-ff20cfe312f8', '5a525ef1-592d-4808-977c-1e2cc2d2de8f', true, 'Pears & quinces', '', '355', 'Permanent- perennial crops - Agriculture'),
('33e739db-4cc1-4e52-86f2-de871be86af2', '5a525ef1-592d-4808-977c-1e2cc2d2de8f', true, 'Plums and sloes', '', '356', 'Permanent- perennial crops - Agriculture'),
('868cf501-7e0a-41ce-a8bf-559eb537d964', '5a525ef1-592d-4808-977c-1e2cc2d2de8f', true, 'Other pome fruits and stone fruits, n.e.c.', '', '359', 'Permanent- perennial crops - Agriculture'),
('49a3cc04-d4b7-46a5-8cf2-dea6d4d0abfb', '5a525ef1-592d-4808-977c-1e2cc2d2de8f', true, 'Currants 2', '', '341', 'Permanent- perennial crops - Agriculture'),
('bf731b86-f3da-4c98-901d-3d700d71b452', '5a525ef1-592d-4808-977c-1e2cc2d2de8f', true, 'Gooseberries', '', '342', 'Permanent- perennial crops - Agriculture'),
('cfbfd2fc-515a-4236-8eb8-0010fb2e9584', '5a525ef1-592d-4808-977c-1e2cc2d2de8f', true, 'Kiwi fruit', '', '343', 'Permanent- perennial crops - Agriculture'),
('de55925a-8022-4793-aece-4fbd8c962dc1', '5a525ef1-592d-4808-977c-1e2cc2d2de8f', true, 'Raspberries', '', '344', 'Permanent- perennial crops - Agriculture'),
('13a255b2-2b17-4a8d-b051-215877ecfa3c', '5a525ef1-592d-4808-977c-1e2cc2d2de8f', true, 'Strawberries', '', '345', 'Permanent- perennial crops - Agriculture'),
('3fd61e18-6f93-45cc-a44f-bb63cb7dc8f5', '5a525ef1-592d-4808-977c-1e2cc2d2de8f', true, 'Blueberries', '', '346', 'Permanent- perennial crops - Agriculture'),
('9e28e703-75cd-4460-80fb-dd462bb3e3d5', '5a525ef1-592d-4808-977c-1e2cc2d2de8f', true, 'Other berries', '', '349', 'Permanent- perennial crops - Agriculture'),
('0a45eb42-0617-4755-9dbf-010d07c3dca0', '5a525ef1-592d-4808-977c-1e2cc2d2de8f', true, 'Grapefruit & pomelo', '', '321', 'Permanent- perennial crops - Agriculture'),
('09d80ac1-fb83-4724-b44b-146193ba1fdb', '5a525ef1-592d-4808-977c-1e2cc2d2de8f', true, 'Lemons and Limes', '', '322', 'Permanent- perennial crops - Agriculture'),
('be9b7b2d-d0fc-45e0-8ece-198a853017dd', '5a525ef1-592d-4808-977c-1e2cc2d2de8f', true, 'Oranges', '', '323', 'Permanent- perennial crops - Agriculture'),
('75335dfb-5734-4be5-9bfe-7b2f1cfc50ce', '5a525ef1-592d-4808-977c-1e2cc2d2de8f', true, 'Tangerines, mandarins, clementines', '', '324', 'Permanent- perennial crops - Agriculture'),
('4d86fc05-949c-4086-b218-2f8d3d252a00', '5a525ef1-592d-4808-977c-1e2cc2d2de8f', true, 'Other citrus fruit, n.e.c.', '', '329', 'Permanent- perennial crops - Agriculture'),
('b4746a82-5565-453e-b719-075f308bdc92', '5a525ef1-592d-4808-977c-1e2cc2d2de8f', true, 'Almonds', '', '361', 'Permanent- perennial crops - Agriculture'),
('7dee4061-1ea9-4321-8369-c4cf3e9b8de4', '5a525ef1-592d-4808-977c-1e2cc2d2de8f', true, 'Cashew nuts', '', '362', 'Permanent- perennial crops - Agriculture'),
('c5637e46-cade-430c-91e0-364348126f85', '5a525ef1-592d-4808-977c-1e2cc2d2de8f', true, 'Chestnuts', '', '363', 'Permanent- perennial crops - Agriculture'),
('55e81bec-2bad-4fe7-bda8-8b0b2ef193e6', '5a525ef1-592d-4808-977c-1e2cc2d2de8f', true, 'Hazelnuts', '', '364', 'Permanent- perennial crops - Agriculture'),
('82a996ac-a578-4e67-a73e-f52db91b21d2', '5a525ef1-592d-4808-977c-1e2cc2d2de8f', true, 'Pistachios', '', '365', 'Permanent- perennial crops - Agriculture'),
('a420bf2a-a06f-40de-a852-1b95cffadcb7', '5a525ef1-592d-4808-977c-1e2cc2d2de8f', true, 'Walnuts', '', '366', 'Permanent- perennial crops - Agriculture'),
('51a9ce6f-a8c5-42fc-82c0-e173c721d612', '5a525ef1-592d-4808-977c-1e2cc2d2de8f', true, 'Other nuts n.e.c', '', '369', 'Permanent- perennial crops - Agriculture'),
('3515f327-9c2e-45ef-bf26-6a36d69c6b68', '5a525ef1-592d-4808-977c-1e2cc2d2de8f', true, 'Coconuts', '', '441', 'Permanent- perennial crops - Agriculture'),
('cabaf50d-ba89-40f9-8e9e-2e9c161b6244', '5a525ef1-592d-4808-977c-1e2cc2d2de8f', true, 'Olives', '', '442', 'Permanent- perennial crops - Agriculture'),
('1b46c86d-ce11-4b54-9a45-c0951b15cac6', '5a525ef1-592d-4808-977c-1e2cc2d2de8f', true, 'Oil palms', '', '443', 'Permanent- perennial crops - Agriculture'),
('f293e228-5f25-49b7-afa0-9834c4638b07', '5a525ef1-592d-4808-977c-1e2cc2d2de8f', true, 'Other oleaginous fruits, n.e.c.', '', '449', 'Permanent- perennial crops - Agriculture'),
('9e431b88-ba3c-4216-b6e0-5ed2627f3f32', '5a525ef1-592d-4808-977c-1e2cc2d2de8f', true, 'Pepper (piper spp.) 2', '', '6221', 'Permanent- perennial crops - Agriculture'),
('3d8bc735-3790-407b-8091-485368235bce', '5a525ef1-592d-4808-977c-1e2cc2d2de8f', true, 'Nutmeg, mace, cardamoms', '', '6222', 'Permanent- perennial crops - Agriculture'),
('4db2e26b-e21d-46eb-9f49-107a4af2c408', '5a525ef1-592d-4808-977c-1e2cc2d2de8f', true, 'Cinnamon (canella)', '', '6223', 'Permanent- perennial crops - Agriculture'),
('294bea44-ee31-4acd-8b4b-f3711b77a198', '5a525ef1-592d-4808-977c-1e2cc2d2de8f', true, 'Cloves', '', '6224', 'Permanent- perennial crops - Agriculture'),
('7b2733e5-136a-40ec-bbe0-01593965e210', '5a525ef1-592d-4808-977c-1e2cc2d2de8f', true, 'Ginger', '', '6225', 'Permanent- perennial crops - Agriculture'),
('eb99f131-b2dd-4c99-a0b3-554d98034eb2', '5a525ef1-592d-4808-977c-1e2cc2d2de8f', true, 'Vanilla', '', '6226', 'Permanent- perennial crops - Agriculture'),
('ddfe13e9-9d67-49fa-b706-0f8a49c2d45e', '5a525ef1-592d-4808-977c-1e2cc2d2de8f', true, 'Other permanent spice crops, n.e.c-', '', '6229', 'Permanent- perennial crops - Agriculture'),
('dd6cd1af-2626-4529-83c9-5d81834ea2c2', '5a525ef1-592d-4808-977c-1e2cc2d2de8f', true, 'Coffee', '', '611', 'Permanent- perennial crops - Agriculture'),
('9e6e1845-e778-4f8f-9834-6064c02684a9', '5a525ef1-592d-4808-977c-1e2cc2d2de8f', true, 'Tea', '', '612', 'Permanent- perennial crops - Agriculture'),
('527dbc0d-c2dd-4d5e-bd43-c773335e769e', '5a525ef1-592d-4808-977c-1e2cc2d2de8f', true, 'Mate', '', '613', 'Permanent- perennial crops - Agriculture'),
('be846dc3-3cc8-4b54-93e0-96f0f9698428', '5a525ef1-592d-4808-977c-1e2cc2d2de8f', true, 'Cocoa', '', '614', 'Permanent- perennial crops - Agriculture'),
('281fba40-fb97-4df4-a959-5731964f3b27', '5a525ef1-592d-4808-977c-1e2cc2d2de8f', true, 'Other beverage crops, n.e.c', '', '619', 'Permanent- perennial crops - Agriculture'),
('9bb969b9-219d-402c-9cbf-2bb0e2865dfb', '5a525ef1-592d-4808-977c-1e2cc2d2de8f', true, 'Pepper (piper spp.) 2', '', '6221', 'Permanent- perennial crops - Agriculture'),
('840c3fb0-6822-47e4-8dfc-1f153727120a', '5a525ef1-592d-4808-977c-1e2cc2d2de8f', true, 'Nutmeg, mace, cardamoms', '', '6222', 'Permanent- perennial crops - Agriculture'),
('8601a8b0-457d-4d50-b3c8-4017168c26ca', '5a525ef1-592d-4808-977c-1e2cc2d2de8f', true, 'Cinnamon (canella)', '', '6223', 'Permanent- perennial crops - Agriculture'),
('e6053cdc-e993-434c-9c6b-18fecbe836f3', '5a525ef1-592d-4808-977c-1e2cc2d2de8f', true, 'Cloves', '', '6224', 'Permanent- perennial crops - Agriculture'),
('e95d30a9-fe5f-4285-8d6c-f21ac943dfc0', '5a525ef1-592d-4808-977c-1e2cc2d2de8f', true, 'Ginger', '', '6225', 'Permanent- perennial crops - Agriculture'),
('58b35839-fdd0-4e61-b103-02effd461d8a', '5a525ef1-592d-4808-977c-1e2cc2d2de8f', true, 'Vanilla', '', '6226', 'Permanent- perennial crops - Agriculture'),
('674d2a6d-ef36-40c2-84b4-545192682372', '5a525ef1-592d-4808-977c-1e2cc2d2de8f', true, 'Other permanent spice crops, n.e.c', '', '6229', 'Permanent- perennial crops - Agriculture'),
('61099cf2-420e-4681-94ac-08bcf2ba61d6', 'cb6f79ed-4342-41e4-b744-245f8c2f48d8', true, 'hatcheries', '', '', 'Aquaculture - Agriculture'),
('aa50d51b-82c4-4dd8-94c4-0a1714589a29', 'cb6f79ed-4342-41e4-b744-245f8c2f48d8', true, 'pumps and aerators', '', '', 'Aquaculture - Agriculture'),
('b801d20c-fc58-4d5f-b9fd-e64b79e3a083', 'cb6f79ed-4342-41e4-b744-245f8c2f48d8', true, 'ponds, cages and pens', '', '', 'Aquaculture - Agriculture'),
('c4f8d57b-4140-4153-837b-5b2e35155f83', 'cb6f79ed-4342-41e4-b744-245f8c2f48d8,da0331e9-1d96-44ac-a498-206418bf6a50,3e2bdf02-4f7a-4898-a9a5-bd98a8d1e370,83a021f-5861-4f2c-932b-07decb1fa9d2,0f260f9c-c8b8-4a71-94c3-883158f540ad,3910f40d-b1a1-4ac0-bfa6-52064d7d4e9f', true, 'Storage facilities', '', '', 'Aquaculture - Agriculture'),
('61275f5c-aac0-4f7c-8dbf-2bd48a706933', 'cb6f79ed-4342-41e4-b744-245f8c2f48d8,da0331e9-1d96-44ac-a498-206418bf6a50', true, 'processing facilities', '', '', 'Aquaculture - Agriculture,Fisheries - Agriculture'),
('cdf24023-db56-4007-8682-1d37909ed607', 'cb6f79ed-4342-41e4-b744-245f8c2f48d8', true, 'marketing facilities', '', '', 'Aquaculture - Agriculture'),
('e7c90383-4843-47b3-a4fd-997337c1b46e', 'da0331e9-1d96-44ac-a498-206418bf6a50', true, 'Fishing vessels/boats', '', '', 'Fisheries - Agriculture'),
('e0275c4f-b096-4aeb-9a86-def8d62ba680', 'da0331e9-1d96-44ac-a498-206418bf6a50', true, 'Fishing gear', '', '', 'Fisheries - Agriculture'),
('d6be62c8-39ab-442a-af2d-293cebca2aea', 'da0331e9-1d96-44ac-a498-206418bf6a50', true, 'Fishing engines', '', '', 'Fisheries - Agriculture'),
('4ad83d00-5f32-47ee-97a3-2a7ee6635452', 'da0331e9-1d96-44ac-a498-206418bf6a50', true, 'Market facilities', '', '', 'Fisheries - Agriculture'),
('d5d6a76f-2f50-4e00-b37c-f001742d74c3', '3e2bdf02-4f7a-4898-a9a5-bd98a8d1e370', true, 'Manufacturing plant', '', '', 'Industry'),
('de5a74a9-f5a8-4979-bfcf-2ab813a90351', '3e2bdf02-4f7a-4898-a9a5-bd98a8d1e370', true, 'Industrial units', '', '', 'Industry'),
('ed626b59-2243-4d23-b2b6-26ade7335977', '3e2bdf02-4f7a-4898-a9a5-bd98a8d1e370', true, 'Distribution centers', '', '', 'Industry'),
('421e99c8-9e0e-4532-ae26-875809135302', '3e2bdf02-4f7a-4898-a9a5-bd98a8d1e370', true, 'Mine shafts', '', '', 'Industry'),
('f5dc46b2-6e89-471c-b9a2-dded3c0b911c', '3e2bdf02-4f7a-4898-a9a5-bd98a8d1e370', true, 'Tunnels', '', '', 'Industry'),
('7cf4f34a-7234-4031-8942-a6a967567304', '3e2bdf02-4f7a-4898-a9a5-bd98a8d1e370,c83a021f-5861-4f2c-932b-07decb1fa9d2', true, 'Processing plants', '', '', 'Industry'),
('811c4717-849f-45f7-b20f-e036e0dc954b', '3e2bdf02-4f7a-4898-a9a5-bd98a8d1e370', true, 'Workshops', '', '', 'Industry'),
('28ae9842-7bdb-4c36-934f-2a14e779a9d9', '3e2bdf02-4f7a-4898-a9a5-bd98a8d1e370,ed2b7a44-fd4b-46b4-9c86-98d1a4a1d15f', true, 'Vehicles', 'Machinery and equipments', '', 'Industry'),
('5fa6ac59-0087-4974-bf0a-b1f53bb989fc', '3e2bdf02-4f7a-4898-a9a5-bd98a8d1e370', true, 'Production machinery', 'Machinery and equipments', '', 'Industry'),
('a03bd5c1-c59e-43fb-ad26-e62221a45505', '3e2bdf02-4f7a-4898-a9a5-bd98a8d1e370', true, 'Assembly lines', 'Machinery and equipments', '', 'Industry'),
('0e75023a-b773-4543-b3ca-5b6284982bb2', '3e2bdf02-4f7a-4898-a9a5-bd98a8d1e370', true, 'Specialized equipment', 'Machinery and equipments', '', 'Industry'),
('78274c14-d0ec-4ff1-86c7-8e7819b5ad65', '3e2bdf02-4f7a-4898-a9a5-bd98a8d1e370,c83a021f-5861-4f2c-932b-07decb1fa9d2', true, 'Compressors', 'Machinery and equipments', '', 'Industry'),
('2693cdbb-ced9-4ee4-b7a4-dc47e78d126f', '3e2bdf02-4f7a-4898-a9a5-bd98a8d1e370', true, 'Control system', 'Machinery and equipments', '', 'Industry'),
('2a3f01c1-5e3d-4d8d-b701-6107eed88337', '3e2bdf02-4f7a-4898-a9a5-bd98a8d1e370', true, 'Drilling machinery', 'Machinery and equipments', '', 'Industry'),
('779562d9-347c-4be6-9a55-dc8344282877', '3e2bdf02-4f7a-4898-a9a5-bd98a8d1e370', true, 'Excavators', 'Machinery and equipments', '', 'Industry'),
('e3c55002-bcb6-4c5a-865d-172e5e03738e', '3e2bdf02-4f7a-4898-a9a5-bd98a8d1e370', true, 'Loaders', 'Machinery and equipments', '', 'Industry'),
('182260b6-37be-4ee8-a57d-ed45f2e5b038', '3e2bdf02-4f7a-4898-a9a5-bd98a8d1e370', true, 'Bulldozers', 'Machinery and equipments', '', 'Industry'),
('bca1eead-755d-45d5-b75f-5db45f8b792f', '3e2bdf02-4f7a-4898-a9a5-bd98a8d1e370', true, 'Haul tracks', 'Machinery and equipments', '', 'Industry'),
('36eb213e-709c-4ad0-ab6e-e3e9f7eff9a9', '3e2bdf02-4f7a-4898-a9a5-bd98a8d1e370', true, 'Crushing machinery', 'Machinery and equipments', '', 'Industry'),
('ee3659ac-cd8f-4c52-ae1b-be0161770cd2', '3e2bdf02-4f7a-4898-a9a5-bd98a8d1e370', true, 'Grinding machinery', 'Machinery and equipments', '', 'Industry'),
('e53e6f2c-f051-4597-a167-29662d4923dc', '3e2bdf02-4f7a-4898-a9a5-bd98a8d1e370', true, 'Separation equipment', 'Machinery and equipments', '', 'Industry'),
('2b0d2414-05de-48d4-beae-7307be24dea8', '3e2bdf02-4f7a-4898-a9a5-bd98a8d1e370', true, 'Conveyor system', 'Machinery and equipments', '', 'Industry'),
('2614814c-f51b-4a7d-9714-0da80b53cf85', '3e2bdf02-4f7a-4898-a9a5-bd98a8d1e370', true, 'Railcars', 'Machinery and equipments', '', 'Industry'),
('30e0356e-9238-4d67-9c2d-58cff39b3218', '3e2bdf02-4f7a-4898-a9a5-bd98a8d1e370,3910f40d-b1a1-4ac0-bfa6-52064d7d4e9f', true, 'Trucks', 'Machinery and equipments', '', 'Industry'),
('998b7c56-b9a3-421c-9b82-77100f4846e9', '3e2bdf02-4f7a-4898-a9a5-bd98a8d1e370', true, 'Loading and unloading equipment', 'Machinery and equipments', '', 'Industry'),
('cb452886-7bc7-46c3-81f4-381eb417bc7a', '3e2bdf02-4f7a-4898-a9a5-bd98a8d1e370', true, 'Backhoes', 'Machinery and equipments', '', 'Industry'),
('02c093f7-5d5e-4f6b-ab8b-3cd95f6aa554', '3e2bdf02-4f7a-4898-a9a5-bd98a8d1e370', true, 'Graders', 'Machinery and equipments', '', 'Industry'),
('7df15d3d-ddc7-4ae2-892e-94651ecf3dd4', '3e2bdf02-4f7a-4898-a9a5-bd98a8d1e370', true, 'Forklifts', 'Machinery and equipments', '', 'Industry'),
('f8ee0bc1-b85c-4ad2-b56b-7fdc56f81bd3', '3e2bdf02-4f7a-4898-a9a5-bd98a8d1e370', true, 'Rollers', 'Machinery and equipments', '', 'Industry'),
('dd3f862c-baa8-4ceb-b668-234e553dcb5e', '3e2bdf02-4f7a-4898-a9a5-bd98a8d1e370', true, 'Asphalt pavers', 'Machinery and equipments', '', 'Industry'),
('b7cdbf7e-de4f-42b9-aee6-4fe078d72f90', '3e2bdf02-4f7a-4898-a9a5-bd98a8d1e370', true, 'Milling machines', 'Machinery and equipments', '', 'Industry'),
('448fd98f-a6ff-4bfc-92cb-3316ada631fc', '3e2bdf02-4f7a-4898-a9a5-bd98a8d1e370', true, 'Demolition machines', 'Machinery and equipments', '', 'Industry'),
('41ff479d-0357-4596-8f6b-3ffb7f54a19c', '3e2bdf02-4f7a-4898-a9a5-bd98a8d1e370', true, 'Pile drivers', 'Machinery and equipments', '', 'Industry'),
('f4150a33-52d2-4917-8f1c-c0188d80bf4e', '3e2bdf02-4f7a-4898-a9a5-bd98a8d1e370', true, 'Compactors', 'Machinery and equipments', '', 'Industry'),
('b3fbc6cd-9612-4538-9ac5-4381e7d4cae9', '3e2bdf02-4f7a-4898-a9a5-bd98a8d1e370', true, 'Lighting systems', 'Machinery and equipments', '', 'Industry'),
('7dfa0326-d22a-4bc0-b086-26aef494f25c', '3e2bdf02-4f7a-4898-a9a5-bd98a8d1e370', true, 'Cranes', 'Machinery and equipments', '', 'Industry'),
('e0cb6601-e9d5-4c7b-bb6d-6493d80020d8', '3e2bdf02-4f7a-4898-a9a5-bd98a8d1e370', true, 'Scaffolding', 'Machinery and equipments', '', 'Industry'),
('99cb1644-daf9-43a5-a875-455c710481da', '3e2bdf02-4f7a-4898-a9a5-bd98a8d1e370,ed2b7a44-fd4b-46b4-9c86-98d1a4a1d15f', true, 'Generators', 'Machinery and equipments', '', 'Industry'),
('5c04f3c7-c5cc-4071-af1a-6ba90ff446aa', '3e2bdf02-4f7a-4898-a9a5-bd98a8d1e370', true, 'Concrete mixers', 'Machinery and equipments', '', 'Industry'),
('eee6a0bc-aad2-42c9-a565-3e2d278cb1bc', '3e2bdf02-4f7a-4898-a9a5-bd98a8d1e370', true, 'Batching plants', 'Machinery and equipments', '', 'Industry'),
('7e9b3b49-5991-4578-abfc-2d1efbb8add3', '3e2bdf02-4f7a-4898-a9a5-bd98a8d1e370', true, 'Concrete pump trucks', 'Machinery and equipments', '', 'Industry'),
('bd6d286d-5dce-484b-9700-af2af2b49e42', '3e2bdf02-4f7a-4898-a9a5-bd98a8d1e370', true, 'Handling machineries', 'Machinery and equipments', '', 'Industry'),
('d02cca45-f40d-4a51-8198-3c9189c76f9e', 'ed2b7a44-fd4b-46b4-9c86-98d1a4a1d15f,5f00c4d2-12e0-4a89-9f35-5bbda1c3d904,ba8e2cf9-0d9a-49c1-814e-0a4d45d0726b,e9f80a3c-84b4-4fa6-92a0-324ae34f81fd,3910f40d-b1a1-4ac0-bfa6-52064d7d4e9f', true, 'Buildings', '', '', 'Tourism'),
('b2666498-cf34-4411-98ac-fe1f729f7c9b', 'ed2b7a44-fd4b-46b4-9c86-98d1a4a1d15f', true, 'Properties', '', '', 'Tourism'),
('97a9bcdf-efea-4e4d-b995-abd697eac3ad', 'ed2b7a44-fd4b-46b4-9c86-98d1a4a1d15f', true, 'On-site restaurants', '', '', 'Tourism'),
('ddf3d2f5-5772-4430-9256-0c33fd6b3740', 'ed2b7a44-fd4b-46b4-9c86-98d1a4a1d15f', true, 'Restaurants', '', '', 'Tourism'),
('3cd27f3c-e992-4e42-b4e7-c87adf8a289a', 'ed2b7a44-fd4b-46b4-9c86-98d1a4a1d15f', true, 'Conference facilities', '', '', 'Tourism'),
('8dff59a8-555f-4c77-b481-2915e97265e2', 'ed2b7a44-fd4b-46b4-9c86-98d1a4a1d15f', true, 'Recreational amenities', '', '', 'Tourism'),
('d423fd56-50ca-4ae7-8765-ee96f57d3457', 'ed2b7a44-fd4b-46b4-9c86-98d1a4a1d15f', true, 'Swimming pool', '', '', 'Tourism'),
('71d181ef-a581-4758-ae89-16e6f398bb03', 'ed2b7a44-fd4b-46b4-9c86-98d1a4a1d15f', true, 'Saunas', '', '', 'Tourism'),
('e0cdafc6-65ca-4630-8d26-c4fc94d73ecd', 'ed2b7a44-fd4b-46b4-9c86-98d1a4a1d15f', true, 'golf park', '', '', 'Tourism'),
('18ba3340-f521-4b7c-b447-f307cc4f07cd', 'ed2b7a44-fd4b-46b4-9c86-98d1a4a1d15f', true, 'Spas', '', '', 'Tourism'),
('afb6d0e2-cd0b-4990-8590-720eab8b115f', 'ed2b7a44-fd4b-46b4-9c86-98d1a4a1d15f', true, 'Gyms', '', '', 'Tourism'),
('fd418033-4e88-4e80-b0b7-2517064eba5a', 'ed2b7a44-fd4b-46b4-9c86-98d1a4a1d15f', true, 'Parking facilities', '', '', 'Tourism'),
('f9365996-2633-4fb0-b727-ef715560627b', 'ed2b7a44-fd4b-46b4-9c86-98d1a4a1d15f', true, 'Landscaping', '', '', 'Tourism'),
('8bcb0daf-cd55-498f-b4ae-2a94ca412812', 'ed2b7a44-fd4b-46b4-9c86-98d1a4a1d15f', true, 'Laundry facilities', '', '', 'Tourism'),
('5f7799c8-d246-4825-9b81-b23cc874cedd', 'ed2b7a44-fd4b-46b4-9c86-98d1a4a1d15f', true, 'Wastewater treatment units', '', '', 'Tourism'),
('09f970db-332a-4821-a83c-b4c14aee496b', 'ed2b7a44-fd4b-46b4-9c86-98d1a4a1d15f', true, 'Water treatment units', '', '', 'Tourism'),
('84e833a7-e9f1-46ed-b3a2-dc549ce2a5c8', 'ed2b7a44-fd4b-46b4-9c86-98d1a4a1d15f', true, 'Kitchens', '', '', 'Tourism'),
('9bc700f0-aa67-4bf1-8a03-89b1c3a2a8a0', 'ed2b7a44-fd4b-46b4-9c86-98d1a4a1d15f', true, 'Storage areas', '', '', 'Tourism'),
('d17c37f6-ac1a-46eb-b5ae-a6576113204e', 'ed2b7a44-fd4b-46b4-9c86-98d1a4a1d15f', true, 'Garage', '', '', 'Tourism'),
('f9c769ad-3cb5-45cf-a881-0158716fdae6', 'ed2b7a44-fd4b-46b4-9c86-98d1a4a1d15f', true, 'Room furnishing', 'Furniture and equipment', '', 'Tourism'),
('25802138-528e-4496-90d0-092957368b72', 'ed2b7a44-fd4b-46b4-9c86-98d1a4a1d15f', true, 'Beds', 'Furniture and equipment', '', 'Tourism'),
('63a2e871-0ca9-4f46-bffc-feb834da0935', 'ed2b7a44-fd4b-46b4-9c86-98d1a4a1d15f', true, 'Applicance', 'Furniture and equipment', '', 'Tourism'),
('4aee9ace-ce22-48c0-84a3-9798c34a712c', 'ed2b7a44-fd4b-46b4-9c86-98d1a4a1d15f', true, 'Technological equipment', 'Furniture and equipment', '', 'Tourism'),
('be3e645a-538f-4c11-9002-0bd4db996c9e', 'ed2b7a44-fd4b-46b4-9c86-98d1a4a1d15f', true, 'In-room appliances', 'Furniture and equipment', '', 'Tourism'),
('64973982-18b7-4d69-b55d-17a0cb04a3cb', '5f00c4d2-12e0-4a89-9f35-5bbda1c3d904', true, 'Storefronts', '', '', 'Commerce and Trade'),
('f2512530-e6a8-40fe-99af-b6ca2cdd1eb8', '5f00c4d2-12e0-4a89-9f35-5bbda1c3d904', true, 'Shopping centers', '', '', 'Commerce and Trade'),
('b67f0526-d616-4992-bc9c-3d4774b4d7ce', '5f00c4d2-12e0-4a89-9f35-5bbda1c3d904', true, 'Retail outlets', '', '', 'Commerce and Trade'),
('8314fbdb-05df-4099-a270-0a1ccb7079c5', '5f00c4d2-12e0-4a89-9f35-5bbda1c3d904', true, 'Marketplaces', '', '', 'Commerce and Trade'),
('ed3b6cc5-a655-4a9e-9849-e5064e5c6c00', '5f00c4d2-12e0-4a89-9f35-5bbda1c3d904', true, 'Warehouses', '', '', 'Commerce and Trade'),
('887c31e8-9854-48ae-a1c9-1ffa89102894', '5f00c4d2-12e0-4a89-9f35-5bbda1c3d904', true, 'Distribution centeres', '', '', 'Commerce and Trade'),
('c9e5088b-9af5-4e67-80e2-58bc09dc1269', '5f00c4d2-12e0-4a89-9f35-5bbda1c3d904', true, 'Stalls', '', '', 'Commerce and Trade'),
('b615f9f5-cbea-4efa-9bce-62aaef22a353', '5f00c4d2-12e0-4a89-9f35-5bbda1c3d904', true, 'Merchandise', 'Inventory and stock', '', 'Commerce and Trade'),
('a73f597b-c608-4a62-9a3c-42335581b8be', '5f00c4d2-12e0-4a89-9f35-5bbda1c3d904', true, 'Raw material', 'Inventory and stock', '', 'Commerce and Trade'),
('23a5fa57-b2b1-46eb-b30e-e57b95f03c1a', '5f00c4d2-12e0-4a89-9f35-5bbda1c3d904', true, 'Supplies ', 'Inventory and stock', '', 'Commerce and Trade'),
('8a7ceaaf-3f60-4e91-b941-7ee99da357bc', '5f00c4d2-12e0-4a89-9f35-5bbda1c3d904', true, 'E-commerce platforms', 'Technological assets', '', 'Commerce and Trade'),
('a8ea231c-404b-4c91-8a2b-bad8185659fb', '5f00c4d2-12e0-4a89-9f35-5bbda1c3d904', true, 'Online storefronts', 'Technological assets', '', 'Commerce and Trade'),
('3115c3e2-5c77-499c-b2d2-155ecb932c07', 'ba8e2cf9-0d9a-49c1-814e-0a4d45d0726b,e9f80a3c-84b4-4fa6-92a0-324ae34f81fd,3910f40d-b1a1-4ac0-bfa6-52064d7d4e9f', true, 'Office space', '', '', 'Services'),
('12f35372-dcee-4d53-9739-52e7eced2a1d', 'ba8e2cf9-0d9a-49c1-814e-0a4d45d0726b', true, 'Technological platforms', '', '', 'Services'),
('6826c103-5d88-4997-88a4-03fd652838f6', 'ba8e2cf9-0d9a-49c1-814e-0a4d45d0726b', true, 'Studios', '', '', 'Services'),
('966b1aa4-ac0a-46c8-8b6c-12482886dff8', '4a39d053-a4cf-41f8-93c0-7c30e60f3b42', true, 'Primary health centers', '', '', 'Health'),
('aea9d149-1a1e-4a3c-a811-c9a20df89a0a', '4a39d053-a4cf-41f8-93c0-7c30e60f3b42', true, 'Outpatient centers', '', '', 'Health'),
('c0641bd2-2bc3-481c-bfd7-42f2f40e0b67', '4a39d053-a4cf-41f8-93c0-7c30e60f3b42', true, 'Dispensary', '', '', 'Health'),
('4f38b659-7176-4aed-8291-c6079f10038d', '4a39d053-a4cf-41f8-93c0-7c30e60f3b42', true, 'district hospital', '', '', 'Health'),
('14a7a88b-f82f-4e82-86d3-39dee58caf04', '4a39d053-a4cf-41f8-93c0-7c30e60f3b42', true, 'specialist clinics', '', '', 'Health'),
('4820ac23-e157-43e2-acfc-020b15667243', '4a39d053-a4cf-41f8-93c0-7c30e60f3b42', true, 'regional medical centers', '', '', 'Health'),
('535b20c1-737b-4bcd-b099-1e6f523b4757', '4a39d053-a4cf-41f8-93c0-7c30e60f3b42', true, 'University hospital', '', '', 'Health'),
('c0e660eb-17d7-4469-bcc5-50be016a4d9b', '4a39d053-a4cf-41f8-93c0-7c30e60f3b42', true, 'Diagnostic & laboratory services', '', '', 'Health'),
('a7c348da-0e68-4684-888e-263aed112666', '4a39d053-a4cf-41f8-93c0-7c30e60f3b42', true, 'Emergency medical services', '', '', 'Health'),
('c78bf768-8a82-409c-9ceb-625bac4bc96b', '4a39d053-a4cf-41f8-93c0-7c30e60f3b42', true, 'Pharmacy', '', '', 'Health'),
('dbaf671f-ec33-4736-8c5b-7595ba56a22c', '4a39d053-a4cf-41f8-93c0-7c30e60f3b42', true, 'Laboratories', '', '', 'Health'),
('d8656d68-7d7f-4001-9650-bac4ee70b5c1', '4a39d053-a4cf-41f8-93c0-7c30e60f3b42', true, 'Record storage sites', '', '', 'Health'),
('8d0ad683-d358-411a-978f-7d5e11c7c74d', '4a39d053-a4cf-41f8-93c0-7c30e60f3b42', true, 'Blood banks', '', '', 'Health'),
('58016281-c070-4785-bdaf-141f5f565133', '4a39d053-a4cf-41f8-93c0-7c30e60f3b42', true, 'Operating room', '', '', 'Health'),
('07e7abbb-bd3b-4149-a2dd-fb49a16486e7', '4a39d053-a4cf-41f8-93c0-7c30e60f3b42', true, 'Surgical block', '', '', 'Health'),
('714f7327-ead1-44bb-88c9-60410773ccef', '4a39d053-a4cf-41f8-93c0-7c30e60f3b42', true, 'Imaging equipments', 'Assets - equipments', '', 'Health'),
('e9cb3b54-a7ba-4426-98e1-ca1950f7fbd7', '4a39d053-a4cf-41f8-93c0-7c30e60f3b42', true, 'Medical equipments', 'Assets - equipments', '', 'Health'),
('6b0614d0-367f-4327-8d08-39600639d88b', '4a39d053-a4cf-41f8-93c0-7c30e60f3b42', true, 'Laboratory diagnostic equipments', 'Assets - equipments', '', 'Health'),
('ff9c003b-940a-414f-8aae-f3951bf825fb', '4a39d053-a4cf-41f8-93c0-7c30e60f3b42', true, 'Mobile healthcare unit', 'Assets - equipments', '', 'Health'),
('9d685f6e-4798-4455-bb07-3ed74a91047f', '4a39d053-a4cf-41f8-93c0-7c30e60f3b42', true, 'Other specialized treatment devices', 'Assets - equipments', '', 'Health'),
('56a92055-4c7b-48cb-a468-7f24b420dcb5', '4a39d053-a4cf-41f8-93c0-7c30e60f3b42', true, 'Health management system', 'Digital assets', '', 'Health'),
('3fa8bb1a-1f80-4fb4-8f91-e8411fd556c3', '4a39d053-a4cf-41f8-93c0-7c30e60f3b42', true, 'Electronic health records', 'Digital assets', '', 'Health'),
('3c1aad4e-7f22-4cdc-b50d-cbaf10794177', '4a39d053-a4cf-41f8-93c0-7c30e60f3b42', true, 'Servers', 'Digital assets', '', 'Health'),
('558c2f56-51ce-4a5e-b08b-8c1e110e9128', '4a39d053-a4cf-41f8-93c0-7c30e60f3b42', true, 'Vaccines', 'Consumables', '', 'Health'),
('3dd667b9-2d85-4a41-b544-400a0935d126', '4a39d053-a4cf-41f8-93c0-7c30e60f3b42', true, 'Biologics', 'Consumables', '', 'Health'),
('dc0ef026-80a3-4c98-aaea-2bd3f02bc1db', '4a39d053-a4cf-41f8-93c0-7c30e60f3b42', true, 'Medicines', 'Consumables', '', 'Health'),
('91346dc1-c798-4935-9475-8aecfc98f34f', '4a39d053-a4cf-41f8-93c0-7c30e60f3b42', true, 'Other consumables', 'Consumables', '', 'Health'),
('bbe03809-c3e9-48b0-9095-03d1df57048d', '4a39d053-a4cf-41f8-93c0-7c30e60f3b42', true, 'Laboratory consumables', 'Consumables', '', 'Health'),
('c7b3e5de-689f-4652-bad5-31921ef35168', 'fd53c0da-5ad6-4a7d-943b-089c7726a2bb', true, 'Kindergarden', 'Facilities', '', 'Education'),
('790d07cd-bce1-4931-a671-32bef4aca39f', 'fd53c0da-5ad6-4a7d-943b-089c7726a2bb', true, 'Day care center', 'Facilities', '', 'Education'),
('ad9d970b-931c-43c9-bf50-2474c6082ba0', 'fd53c0da-5ad6-4a7d-943b-089c7726a2bb', true, 'Early childhood center', 'Facilities', '', 'Education'),
('0b3caa9c-71bb-467a-b1b4-82c9333aabc1', 'fd53c0da-5ad6-4a7d-943b-089c7726a2bb', true, 'Primary school', 'Facilities', '', 'Education'),
('601b203a-e7ea-4ec8-ad40-a4d9dbfa4ba9', 'fd53c0da-5ad6-4a7d-943b-089c7726a2bb', true, 'Middle school', 'Facilities', '', 'Education'),
('22bf98c3-cee6-4df0-a592-b73ffd1fad2d', 'fd53c0da-5ad6-4a7d-943b-089c7726a2bb', true, 'Junior high school', 'Facilities', '', 'Education'),
('b197e924-f831-443c-a5bc-e6eeaba9eea7', 'fd53c0da-5ad6-4a7d-943b-089c7726a2bb', true, 'Vocational training center', 'Facilities', '', 'Education'),
('397b25a3-86ac-4569-af12-84facca40d78', 'fd53c0da-5ad6-4a7d-943b-089c7726a2bb', true, 'Teacher training', 'Facilities', '', 'Education'),
('47553293-ab99-4bab-b970-fbe51e6aed8f', 'fd53c0da-5ad6-4a7d-943b-089c7726a2bb', true, 'High school', 'Facilities', '', 'Education'),
('970ebb47-b753-47fc-8dad-d3424d525441', 'fd53c0da-5ad6-4a7d-943b-089c7726a2bb', true, 'College', 'Facilities', '', 'Education'),
('23bc380d-6b58-4f9d-bc5d-1ced0834b8d1', 'fd53c0da-5ad6-4a7d-943b-089c7726a2bb', true, 'Community colleague', 'Facilities', '', 'Education'),
('07bd10c3-5c78-45a4-8b23-e421d151b626', 'fd53c0da-5ad6-4a7d-943b-089c7726a2bb', true, 'Pollytecnic institute', 'Facilities', '', 'Education'),
('87f907f1-e6b3-4f42-a00a-60c5cff9f6aa', 'fd53c0da-5ad6-4a7d-943b-089c7726a2bb', true, 'University campus', 'Facilities', '', 'Education'),
('6c30c00c-6761-4aba-8bc0-e5cb49b0f8ed', 'fd53c0da-5ad6-4a7d-943b-089c7726a2bb', true, 'Faculty', 'Facilities', '', 'Education'),
('9dd2fbcf-d225-4403-85cf-64664d2decc0', 'fd53c0da-5ad6-4a7d-943b-089c7726a2bb', true, 'Student residences', 'Facilities', '', 'Education'),
('40f53f44-1c51-47ab-8fbe-2895017f17b1', 'fd53c0da-5ad6-4a7d-943b-089c7726a2bb', true, 'Student dorms', 'Facilities', '', 'Education'),
('e9c739da-c85f-4722-bed2-cd9055130e58', 'fd53c0da-5ad6-4a7d-943b-089c7726a2bb', true, 'Sport facilities', 'Facilities', '', 'Education'),
('40d0948c-e15a-49fa-b562-a83994b8e856', 'fd53c0da-5ad6-4a7d-943b-089c7726a2bb', true, 'Sport pavilions', 'Facilities', '', 'Education'),
('25986495-90fe-42d8-83e4-e585c6f2e884', 'fd53c0da-5ad6-4a7d-943b-089c7726a2bb', true, 'Computer labs', 'Facilities', '', 'Education'),
('de978594-29b4-4ee6-aaf5-1356366ba4d9', 'fd53c0da-5ad6-4a7d-943b-089c7726a2bb', true, 'Students libraries', 'Facilities', '', 'Education'),
('54d73e09-613e-40d6-9704-8e5ef1cbbcd5', 'fd53c0da-5ad6-4a7d-943b-089c7726a2bb', true, 'Teachers housing', 'Facilities', '', 'Education'),
('b8f786da-038a-4e8b-a681-f70d1eabd7ed', 'fd53c0da-5ad6-4a7d-943b-089c7726a2bb', true, 'Recreation grounds', 'Facilities', '', 'Education'),
('e790a060-3983-4cf5-9c28-a9ef3bcca6d2', 'fd53c0da-5ad6-4a7d-943b-089c7726a2bb', true, 'School gymnasium', 'Facilities', '', 'Education'),
('78836c2c-9120-4ee3-99a8-32b72a9313a9', 'fd53c0da-5ad6-4a7d-943b-089c7726a2bb', true, 'School sanitation facilities', 'Facilities', '', 'Education'),
('b463b5af-828d-4fb5-b29a-96b8dcb87810', 'fd53c0da-5ad6-4a7d-943b-089c7726a2bb', true, 'School water facilities', 'Facilities', '', 'Education'),
('eb02cba8-d1bb-4c16-bae1-8fa24f9e67f3', 'fd53c0da-5ad6-4a7d-943b-089c7726a2bb', true, 'School cafeteria', 'Facilities', '', 'Education'),
('bb713b78-497e-4e0c-bfed-d49c4b42ec0e', 'fd53c0da-5ad6-4a7d-943b-089c7726a2bb', true, 'School cantine', 'Facilities', '', 'Education'),
('b703347d-175b-4264-9b13-73cd935750d6', 'fd53c0da-5ad6-4a7d-943b-089c7726a2bb', true, 'School kitchen', 'Facilities', '', 'Education'),
('57b621e8-b148-4ac2-9f61-10f320d95808', 'fd53c0da-5ad6-4a7d-943b-089c7726a2bb', true, 'School dispensaire/ nurse', 'Facilities', '', 'Education'),
('0aeb5f6e-f69b-49ca-888e-d1c986797c01', 'fd53c0da-5ad6-4a7d-943b-089c7726a2bb', true, 'Colleague health unit', 'Facilities', '', 'Education'),
('437d0984-58cb-4979-a93b-5b42d570087c', 'fd53c0da-5ad6-4a7d-943b-089c7726a2bb', true, 'Vehicles - students or teachers transport (school buses, vans, boats, etc.)', 'Equipments & Furniture', '', 'Education'),
('11b6fb9e-0521-4292-9e65-183d3da17d6f', 'fd53c0da-5ad6-4a7d-943b-089c7726a2bb', true, 'Vehicles - management', 'Equipments & Furniture', '', 'Education'),
('cfeb1f1a-7f09-4086-a15f-9a5d5b56748d', 'fd53c0da-5ad6-4a7d-943b-089c7726a2bb', true, 'Desks', 'Equipments & Furniture', '', 'Education'),
('b7129883-5d43-4d06-94c1-fcc8895359dd', 'fd53c0da-5ad6-4a7d-943b-089c7726a2bb', true, 'Chairs', 'Equipments & Furniture', '', 'Education'),
('3e3c3f6d-ff27-4fbd-903a-90ed373aaf40', 'fd53c0da-5ad6-4a7d-943b-089c7726a2bb', true, 'Boards', 'Equipments & Furniture', '', 'Education'),
('9f59839e-e957-493a-beaf-7e8c27536290', 'fd53c0da-5ad6-4a7d-943b-089c7726a2bb', true, 'Storage furniture', 'Equipments & Furniture', '', 'Education'),
('240b31f0-7e83-4080-8a6a-0e2bd258c8f5', 'fd53c0da-5ad6-4a7d-943b-089c7726a2bb', true, 'Computers', 'Equipments & Furniture', '', 'Education'),
('70a91d28-707a-41e8-9675-785da27e2204', 'fd53c0da-5ad6-4a7d-943b-089c7726a2bb', true, 'Printers', 'Equipments & Furniture', '', 'Education'),
('3b86a4d9-5dec-4080-bff0-db73d1dc2be5', 'fd53c0da-5ad6-4a7d-943b-089c7726a2bb', true, 'Projectors', 'Equipments & Furniture', '', 'Education'),
('86ae6ad4-aa75-49b9-9964-fa799237306c', 'fd53c0da-5ad6-4a7d-943b-089c7726a2bb', true, 'Printers', 'Equipments & Furniture', '', 'Education'),
('750d1a6b-7bda-4397-b97d-20ee58956191', 'fd53c0da-5ad6-4a7d-943b-089c7726a2bb', true, 'Scanners', 'Equipments & Furniture', '', 'Education'),
('e2f26abf-a73c-4149-9bc7-fbed4eaa148f', '6ac0b833-6218-49d0-9882-827c1b748d7a', true, 'Precarious housing - Single family houses - detached houses', '', '', 'Housing'),
('f1527655-55c3-4291-bb7d-fdaaad7cae78', '6ac0b833-6218-49d0-9882-827c1b748d7a', true, 'Precarious housing - Single family houses - attached houses', '', '', 'Housing'),
('7092275f-b130-46c4-b986-c92749e72c09', '6ac0b833-6218-49d0-9882-827c1b748d7a', true, 'Precarious housing - Multi family housing - appartment buildings', '', '', 'Housing'),
('173b19aa-49aa-4036-b633-2c18b4002d93', '6ac0b833-6218-49d0-9882-827c1b748d7a', true, 'Precarious housing - Multi family housing - condominiums', '', '', 'Housing'),
('ded03c8b-a468-4a85-bac9-27ad949c2a09', '6ac0b833-6218-49d0-9882-827c1b748d7a', true, 'Precarious housing - Multi family housing - House Complex', '', '', 'Housing'),
('2a296db5-faff-4d42-8c8a-e244f0707101', '6ac0b833-6218-49d0-9882-827c1b748d7a', true, 'Recreational Vehicles (RVs) - motorhomes', '', '', 'Housing'),
('171eb06f-33dc-4002-97ab-8b84e3473d0c', '6ac0b833-6218-49d0-9882-827c1b748d7a', true, 'Recreational Vehicles (RVs) - travel trailers', '', '', 'Housing'),
('b2c9ecb7-1119-4fd0-9cc1-251f8e2a3b5b', '6ac0b833-6218-49d0-9882-827c1b748d7a', true, 'Recreational Vehicles (RVs) - camper vans ', '', '', 'Housing'),
('ff31857e-5e13-49c8-bbae-fce0a9be3020', '6ac0b833-6218-49d0-9882-827c1b748d7a', true, 'Mobile/ manufactured houses', '', '', 'Housing'),
('b9241ef3-9161-403c-8e22-3bf1c92b0cfb', '6ac0b833-6218-49d0-9882-827c1b748d7a', true, 'Boat houses', '', '', 'Housing'),
('91060c21-e3bb-4b76-b551-0d101e43361c', '6ac0b833-6218-49d0-9882-827c1b748d7a', true, 'Houseboats', '', '', 'Housing'),
('ab6ec417-d284-4908-91e7-c80ed8253b34', '6ac0b833-6218-49d0-9882-827c1b748d7a', true, 'House trailers', '', '', 'Housing'),
('cdd78a1e-2730-406e-a0fe-21b9e422f51c', '6ac0b833-6218-49d0-9882-827c1b748d7a', true, 'Shelter', '', '', 'Housing'),
('861e5d90-fedf-4bcf-b632-d865f0b12d3a', '6ac0b833-6218-49d0-9882-827c1b748d7a', true, 'Tents', '', '', 'Housing'),
('07d5eb1a-3290-4b3a-b3fd-ffa8d701e6ad', '6ac0b833-6218-49d0-9882-827c1b748d7a', true, 'Kitchen appliances', 'Furniture and Equipment', '', 'Housing'),
('82241c59-78c7-4275-8c1b-0481552cefbf', '6ac0b833-6218-49d0-9882-827c1b748d7a', true, 'Laundry appliances', 'Furniture and Equipment', '', 'Housing'),
('72b5963c-9bb7-4eed-81e5-569326edc9c2', '6ac0b833-6218-49d0-9882-827c1b748d7a', true, 'Other electronics', 'Furniture and Equipment', '', 'Housing'),
('39ea137c-61fd-41c2-8a46-bb27ced4a4ba', '6ac0b833-6218-49d0-9882-827c1b748d7a', true, 'Furniture', 'Furniture and Equipment', '', 'Housing'),
('e1f4448c-ea73-4a2f-9fcc-dd9c6e6562ec', '6ac0b833-6218-49d0-9882-827c1b748d7a', true, 'Major fixtures', 'Furniture and Equipment', '', 'Housing'),
('65ead99a-c6f7-47dc-925f-00f4b19e7a84', '6ac0b833-6218-49d0-9882-827c1b748d7a', true, 'Other equipments', 'Furniture and Equipment', '', 'Housing'),
('9201d57c-4aa5-47d7-9f05-64a4ece458f8', 'a48d6f2e-16e4-4976-8c25-5c8b1788232f', true, 'Monuments', '', '', 'Culture'),
('50c37075-30ba-40e2-8762-7754b335ea93', 'a48d6f2e-16e4-4976-8c25-5c8b1788232f', true, 'Historic buildings', '', '', 'Culture'),
('81bde15a-429d-46d4-a027-e8632d4880ea', 'a48d6f2e-16e4-4976-8c25-5c8b1788232f', true, 'Landmark', '', '', 'Culture'),
('eda5c0f3-c42a-437b-9e8a-ffaef9383d00', 'a48d6f2e-16e4-4976-8c25-5c8b1788232f', true, 'Museums', '', '', 'Culture'),
('b34ef229-5f0e-4b73-b57d-336f0613fe1b', 'a48d6f2e-16e4-4976-8c25-5c8b1788232f', true, 'Art centers', '', '', 'Culture'),
('9123f3d1-9c79-4251-b5e4-c0c83ffaf8e0', 'a48d6f2e-16e4-4976-8c25-5c8b1788232f', true, 'Art galleries', '', '', 'Culture'),
('95c9b83a-c28b-49cf-b5e1-7fcd3e3e77d5', 'a48d6f2e-16e4-4976-8c25-5c8b1788232f', true, 'Culture centeres', '', '', 'Culture'),
('5b3ef4e5-097d-49a8-ab52-93e3bdaefb86', 'a48d6f2e-16e4-4976-8c25-5c8b1788232f', true, 'Artifacts', '', '', 'Culture'),
('3f603498-c258-4dfd-9eb7-d06eff817386', 'a48d6f2e-16e4-4976-8c25-5c8b1788232f', true, 'Artworks', '', '', 'Culture'),
('d4c90296-f83b-40d2-805a-a833db5a151b', 'a48d6f2e-16e4-4976-8c25-5c8b1788232f', true, 'Colections', '', '', 'Culture'),
('15de048d-11c7-4302-8d8c-64e0fe042433', 'a48d6f2e-16e4-4976-8c25-5c8b1788232f', true, 'Archives', '', '', 'Culture'),
('e977ad27-f0c2-4611-bbcf-5b03d460495a', 'a48d6f2e-16e4-4976-8c25-5c8b1788232f', true, 'Libraries', '', '', 'Culture'),
('96a58b9b-7844-4d3d-b4b0-4116701eb826', 'a48d6f2e-16e4-4976-8c25-5c8b1788232f', true, 'Religious sites', '', '', 'Culture'),
('abcb8b8c-fbf4-480a-9461-641baf0c0a53', 'a48d6f2e-16e4-4976-8c25-5c8b1788232f', true, 'Religious buildings', '', '', 'Culture'),
('828b4c11-e9a7-4f5f-bfc3-abcd35643619', '2b01b68b-bf42-4a72-83b8-e272b0af90b5', true, 'Per type of road ( paved, gravel, dirt roads)', 'Assets - Road infrastructure', '', 'Transportation'),
('764c06f4-9204-4243-bef3-83ef916754cf', '2b01b68b-bf42-4a72-83b8-e272b0af90b5', true, 'Per type of terrain ( flat, undulating, mountanious)', 'Assets - Road infrastructure', '', 'Transportation'),
('276c857d-a47e-4295-8c35-e53b44dadcc0', '2b01b68b-bf42-4a72-83b8-e272b0af90b5', true, 'Roads per categories - highways, national, regional, local, community roads', 'Assets - Road infrastructure', '', 'Transportation'),
('b49275ca-2c28-4418-8899-33a6888b4d0c', '2b01b68b-bf42-4a72-83b8-e272b0af90b5', true, 'Assets: viaducts, roads ', 'Assets - Road infrastructure', '', 'Transportation'),
('6b314aa9-a08c-4d5c-89ea-d43210ab2746', '2b01b68b-bf42-4a72-83b8-e272b0af90b5', true, 'Light passenger', 'Assets - Road infrastructure', '', 'Transportation'),
('9dcd4c31-5a1b-4a3c-af88-681f25200ba2', '2b01b68b-bf42-4a72-83b8-e272b0af90b5', true, 'Medium passenger services', 'Assets - Road infrastructure', '', 'Transportation'),
('84328ccf-92d7-40d0-9013-f49d47e4d1e4', '2b01b68b-bf42-4a72-83b8-e272b0af90b5', true, 'Large passenger bus', 'Assets - Road infrastructure', '', 'Transportation'),
('8d444136-9124-450b-8782-0a1cd93e73cf', '2b01b68b-bf42-4a72-83b8-e272b0af90b5', true, 'Rigid ( 2-3 axle) cargo vehicle', 'Assets - Road infrastructure', '', 'Transportation'),
('139adf31-e6ef-4de9-b126-b72ac6f886fe', 'c83a021f-5861-4f2c-932b-07decb1fa9d2', true, 'Generation plants', '', '', 'Energy and Electricity '),
('dc42d908-55c9-4047-8f61-392235ef9f05', 'c83a021f-5861-4f2c-932b-07decb1fa9d2', true, 'Power plants', '', '', 'Energy and Electricity '),
('de48cecf-ee75-4ec2-a9d9-bb215d97db79', 'c83a021f-5861-4f2c-932b-07decb1fa9d2', true, 'Extraction of oil - offshore', '', '', 'Energy and Electricity '),
('8a2b8807-9875-45d5-b6af-a5aa234defc6', 'c83a021f-5861-4f2c-932b-07decb1fa9d2', true, 'Extraction of oil - inland', '', '', 'Energy and Electricity '),
('9b5744a3-1a9b-43c4-9958-299369a98233', 'c83a021f-5861-4f2c-932b-07decb1fa9d2', true, 'Distributed energy generation systems', '', '', 'Energy and Electricity '),
('c6cbd2db-963d-42f4-b42e-128e6146fb1c', 'c83a021f-5861-4f2c-932b-07decb1fa9d2', true, 'Turbines', '', '', 'Energy and Electricity '),
('9bb96832-87b4-4f6c-8aaa-5de12fae9bd0', 'c83a021f-5861-4f2c-932b-07decb1fa9d2', true, 'Solar PV', '', '', 'Energy and Electricity '),
('c42231ba-bfda-45c5-8284-c0c3030e0c69', 'c83a021f-5861-4f2c-932b-07decb1fa9d2', true, 'Batteries', '', '', 'Energy and Electricity '),
('ba44e960-d4b7-4a07-b046-aeffe3537acf', 'c83a021f-5861-4f2c-932b-07decb1fa9d2', true, 'Storage systems', '', '', 'Energy and Electricity '),
('acadf718-6fca-4546-a71c-0938ec57c9a6', 'c83a021f-5861-4f2c-932b-07decb1fa9d2', true, 'Storage tanks', '', '', 'Energy and Electricity '),
('82a406bc-a31b-4e2b-99d4-08a58006c9b8', 'c83a021f-5861-4f2c-932b-07decb1fa9d2', true, 'Refineries', '', '', 'Energy and Electricity '),
('b2ed1990-a17d-4e61-8b5d-856aaaf0bfa2', 'c83a021f-5861-4f2c-932b-07decb1fa9d2', true, 'Regasification terminals', '', '', 'Energy and Electricity '),
('0710307f-03e5-43b5-a317-d6b64a91c30d', 'c83a021f-5861-4f2c-932b-07decb1fa9d2', true, 'Pipelines oil - oleduct', '', '', 'Energy and Electricity '),
('bb36a742-0359-4f86-9a80-c9c57203664c', 'c83a021f-5861-4f2c-932b-07decb1fa9d2', true, 'Driling rigs onshore', '', '', 'Energy and Electricity '),
('0b5b8885-290f-42b3-a87c-9885f8f212bf', 'c83a021f-5861-4f2c-932b-07decb1fa9d2', true, 'Driling rigs offshore', '', '', 'Energy and Electricity '),
('32c682f4-1af5-4841-81e3-12eadbf6aab2', 'c83a021f-5861-4f2c-932b-07decb1fa9d2', true, 'Drill wells', '', '', 'Energy and Electricity '),
('68c1d475-41ab-48e7-80de-4b867c971efe', 'c83a021f-5861-4f2c-932b-07decb1fa9d2', true, 'Welleheads', '', '', 'Energy and Electricity '),
('1bea769a-86b4-4326-b170-6d9885f8cad6', 'c83a021f-5861-4f2c-932b-07decb1fa9d2', true, 'Completion systems', '', '', 'Energy and Electricity '),
('32e469e1-35e2-411e-9cfd-d04cae4c0126', 'c83a021f-5861-4f2c-932b-07decb1fa9d2', true, 'Pump jacks', '', '', 'Energy and Electricity '),
('5faaa20b-dbef-410d-ad17-60f994f7961c', 'c83a021f-5861-4f2c-932b-07decb1fa9d2', true, 'Production platforms', '', '', 'Energy and Electricity '),
('b9344dd0-071d-4b92-bb28-233ce6e7623b', 'c83a021f-5861-4f2c-932b-07decb1fa9d2', true, 'Pumping stations', '', '', 'Energy and Electricity '),
('0a8f5e48-a70e-4ff7-ba4c-f29f8b5bd8a4', 'c83a021f-5861-4f2c-932b-07decb1fa9d2', true, 'Separation units', '', '', 'Energy and Electricity '),
('ed829f9b-d45c-4565-b2b7-4de311dec533', 'c83a021f-5861-4f2c-932b-07decb1fa9d2', true, 'Pipeline network', '', '', 'Energy and Electricity '),
('1fca46ba-0b92-41bf-8546-08dce39383ed', 'c83a021f-5861-4f2c-932b-07decb1fa9d2', true, 'Pipelines gas- gaseoduct', '', '', 'Energy and Electricity '),
('4a70c242-0ce7-45a9-97d7-6cf75208f8e9', 'c83a021f-5861-4f2c-932b-07decb1fa9d2', true, 'Electricity transmission lines overhead', '', '', 'Energy and Electricity '),
('02660f64-64ed-4fad-99fa-54525bdfc933', 'c83a021f-5861-4f2c-932b-07decb1fa9d2', true, 'Electricity transmission underground ', '', '', 'Energy and Electricity '),
('5caf8ecc-c86e-4d9b-923e-388299253935', 'c83a021f-5861-4f2c-932b-07decb1fa9d2', true, 'Electricity transmission underwater', '', '', 'Energy and Electricity '),
('b70c5bd2-5a0c-4e8e-8fd3-528187360505', 'c83a021f-5861-4f2c-932b-07decb1fa9d2', true, 'Power grids', '', '', 'Energy and Electricity '),
('ab629788-0708-4bf0-9e2f-deaed667af60', 'c83a021f-5861-4f2c-932b-07decb1fa9d2,e9f80a3c-84b4-4fa6-92a0-324ae34f81fd', true, 'Poles', '', '', 'Energy and Electricity '),
('0f467d81-867a-4850-ad3c-d4973681bfe5', 'c83a021f-5861-4f2c-932b-07decb1fa9d2', true, 'Meters', '', '', 'Energy and Electricity '),
('d5a47c7b-4817-4a2b-95e8-44688031438b', 'c83a021f-5861-4f2c-932b-07decb1fa9d2', true, 'Wiring', '', '', 'Energy and Electricity '),
('845b008b-be31-48c1-82af-d95833194d93', 'e9f80a3c-84b4-4fa6-92a0-324ae34f81fd', true, 'Aerial telephone lines', '', '', 'Information and Communication'),
('6f0b75cc-94e0-4965-ad51-3525ea0140c4', 'e9f80a3c-84b4-4fa6-92a0-324ae34f81fd', true, 'Electronic switching ', '', '', 'Information and Communication'),
('ecbacbca-c803-4233-8551-d14f48504733', 'e9f80a3c-84b4-4fa6-92a0-324ae34f81fd', true, 'Studios music', '', '', 'Information and Communication'),
('26d94e9a-dffa-425d-8797-c5a2eb8f65d9', 'e9f80a3c-84b4-4fa6-92a0-324ae34f81fd', true, 'TV studios', '', '', 'Information and Communication'),
('fc343ac8-8666-4538-ac1e-17a6e0f54524', 'e9f80a3c-84b4-4fa6-92a0-324ae34f81fd', true, 'Movie studios', '', '', 'Information and Communication'),
('2e92e4ed-f9fb-4738-8282-8b0333909e7f', 'e9f80a3c-84b4-4fa6-92a0-324ae34f81fd', true, 'Photo studies', '', '', 'Information and Communication'),
('4a92b447-5561-4a97-9211-d34b64a9aa63', 'e9f80a3c-84b4-4fa6-92a0-324ae34f81fd', true, 'Printing presses ', '', '', 'Information and Communication'),
('3bfbf3f3-9f40-4163-a069-a76112e36efe', 'e9f80a3c-84b4-4fa6-92a0-324ae34f81fd', true, 'Distribution warehouses', '', '', 'Information and Communication'),
('6bcdbcbc-a021-4960-9259-907b17cd2430', 'e9f80a3c-84b4-4fa6-92a0-324ae34f81fd', true, 'Binding machines', '', '', 'Information and Communication'),
('cb85d0e0-6442-44b7-97ec-fdddd92bd866', 'e9f80a3c-84b4-4fa6-92a0-324ae34f81fd', true, 'Editing hardwarde', '', '', 'Information and Communication'),
('67783d9d-b251-4258-96fd-4baeb0aad172', 'e9f80a3c-84b4-4fa6-92a0-324ae34f81fd', true, 'Recording studios', '', '', 'Information and Communication'),
('cabd0c81-7c37-4ec2-b8fb-9b8ccd510779', 'e9f80a3c-84b4-4fa6-92a0-324ae34f81fd', true, 'Sound stages', '', '', 'Information and Communication'),
('d492d23d-9017-4ce7-916b-4f39c10a9860', 'e9f80a3c-84b4-4fa6-92a0-324ae34f81fd', true, 'Post production facilities', '', '', 'Information and Communication'),
('284e318d-dc1a-4950-87a2-44de2761a64d', 'e9f80a3c-84b4-4fa6-92a0-324ae34f81fd', true, 'Mixing rooms', '', '', 'Information and Communication'),
('c1118063-e81e-41fe-b8d2-429658473b79', 'e9f80a3c-84b4-4fa6-92a0-324ae34f81fd', true, 'Filming locations', '', '', 'Information and Communication'),
('90b45f2b-da57-42cb-829b-d1ccff46b1cd', 'e9f80a3c-84b4-4fa6-92a0-324ae34f81fd', true, 'Specialized stages for movie production', '', '', 'Information and Communication'),
('5003a606-db7c-41b7-9231-c01cecb04b7c', 'e9f80a3c-84b4-4fa6-92a0-324ae34f81fd', true, 'Equiments', '', '', 'Information and Communication'),
('d71acd7c-5153-4513-ad17-40dd77e92f4e', 'e9f80a3c-84b4-4fa6-92a0-324ae34f81fd', true, 'Cameras', '', '', 'Information and Communication'),
('348e8821-ae4a-476e-8abc-4b912cbec15d', 'e9f80a3c-84b4-4fa6-92a0-324ae34f81fd', true, 'Color grading labs', '', '', 'Information and Communication'),
('2a5e75a5-2283-4160-aec9-11e3cfdce569', 'e9f80a3c-84b4-4fa6-92a0-324ae34f81fd', true, 'Inventory', '', '', 'Information and Communication'),
('900f0b53-0cc1-4eb8-b6aa-ebf8a46a5e8d', 'e9f80a3c-84b4-4fa6-92a0-324ae34f81fd', true, 'Books', '', '', 'Information and Communication'),
('1efb83c0-3967-42cf-80fd-e9a1f47dbf2d', 'e9f80a3c-84b4-4fa6-92a0-324ae34f81fd', true, 'Magazines', '', '', 'Information and Communication'),
('9920d104-4fd6-4c6d-af38-7255092d812d', 'e9f80a3c-84b4-4fa6-92a0-324ae34f81fd', true, 'Newspapers', '', '', 'Information and Communication'),
('45b7c5ae-d3d1-42b8-8db7-aa71056459b2', 'e9f80a3c-84b4-4fa6-92a0-324ae34f81fd', true, 'Editing software', '', '', 'Information and Communication'),
('bb848101-8875-429d-82db-333ac6a40a01', '0f260f9c-c8b8-4a71-94c3-883158f540ad', true, 'Water sources', '', '', 'Water'),
('6c824c11-9bce-4b23-aa16-d88f84ff4e4c', '0f260f9c-c8b8-4a71-94c3-883158f540ad', true, 'Ground extraction systems', '', '', 'Water'),
('f7d72226-fc26-4573-be10-98124f28ccee', '0f260f9c-c8b8-4a71-94c3-883158f540ad', true, 'Wells', '', '', 'Water'),
('a0d75d43-31af-4d0e-b343-741126a0852b', '0f260f9c-c8b8-4a71-94c3-883158f540ad', true, 'Boreholdes', '', '', 'Water'),
('56108ffa-3c66-4d1d-9cbf-80d8c65306b2', '0f260f9c-c8b8-4a71-94c3-883158f540ad', true, 'Mechanized wells', '', '', 'Water'),
('00dd23f2-abc9-4670-a34c-5b29b9737ec9', '0f260f9c-c8b8-4a71-94c3-883158f540ad', true, 'Hand-dug wells ', '', '', 'Water'),
('d4be69df-beed-4f86-bf42-b90a3fcfa9f7', '0f260f9c-c8b8-4a71-94c3-883158f540ad,5c91ad51-b152-4ed0-a7f1-0d3e23e3253e', true, 'Ponds', '', '', 'Water'),
('09519eef-862a-44f6-95aa-31f9059d638d', '0f260f9c-c8b8-4a71-94c3-883158f540ad', true, 'Intake structures', '', '', 'Water'),
('868cbacd-7c5b-4041-8d8f-779e6a27d91a', '0f260f9c-c8b8-4a71-94c3-883158f540ad', true, 'Dams', '', '', 'Water'),
('8626139d-32fa-42d4-86b4-fcc00f4a81ca', '0f260f9c-c8b8-4a71-94c3-883158f540ad', true, 'weirs', '', '', 'Water'),
('f03801ec-f7e2-47d7-9cf0-284fb91e52e6', '0f260f9c-c8b8-4a71-94c3-883158f540ad', true, 'river intakes', '', '', 'Water'),
('bea6a2c7-9265-4c2c-a3a6-94e8d3c5f86c', '0f260f9c-c8b8-4a71-94c3-883158f540ad', true, 'Pumping systems submersible', '', '', 'Water'),
('745a0e41-c96f-4118-8b6f-697e0167f831', '0f260f9c-c8b8-4a71-94c3-883158f540ad', true, 'Pumping systems surface', '', '', 'Water'),
('51c07ea1-d324-4ef6-a005-a9d1430c411c', '0f260f9c-c8b8-4a71-94c3-883158f540ad', true, 'Treatment facilities', '', '', 'Water'),
('76f4aa82-3919-40e3-8608-6f482c4cb3e7', '0f260f9c-c8b8-4a71-94c3-883158f540ad', true, 'Monitoring stations', '', '', 'Water'),
('004397c5-166b-4ccc-9765-d45e2d228bdc', '0f260f9c-c8b8-4a71-94c3-883158f540ad', true, 'Metering systems', '', '', 'Water'),
('58a5e280-0026-41d7-8064-15070e76b0af', '0f260f9c-c8b8-4a71-94c3-883158f540ad', true, 'Water quality laboratories', '', '', 'Water'),
('9d16d1da-0d3f-4656-931e-7ed08e174bd9', '0f260f9c-c8b8-4a71-94c3-883158f540ad', true, 'Associated energy supplies', '', '', 'Water'),
('3f9dcebd-ed55-4fea-aeb7-105aa50f9f17', '0f260f9c-c8b8-4a71-94c3-883158f540ad', true, 'boreholes', '', '', 'Water'),
('2be3d877-a6b7-425e-bdf3-4aaebbbbb361', 'adcd0b72-1c9f-40ec-9267-d91a2ff2b08a', true, 'Public toilets', '', '', 'Sanitation'),
('34e545e3-6857-4fb3-81af-8978ec53a427', 'adcd0b72-1c9f-40ec-9267-d91a2ff2b08a', true, 'Septic tanks', '', '', 'Sanitation'),
('52fcbd9f-af3e-4d6d-8571-1dd3c6259f1b', 'adcd0b72-1c9f-40ec-9267-d91a2ff2b08a', true, 'Letrines', '', '', 'Sanitation'),
('e972dbd4-8f3d-4737-bc58-3e0e74a4ec53', 'adcd0b72-1c9f-40ec-9267-d91a2ff2b08a', true, 'Treatment plants', '', '', 'Sanitation'),
('308939ef-17a0-4a9e-80dc-c4e20fa49be0', 'adcd0b72-1c9f-40ec-9267-d91a2ff2b08a', true, 'Decentralized plants', '', '', 'Sanitation'),
('2e568e75-9239-4744-be03-369d2f22e095', 'adcd0b72-1c9f-40ec-9267-d91a2ff2b08a', true, 'French drains', '', '', 'Sanitation'),
('d528ed2c-90c7-49ba-a05e-1533c062d077', 'adcd0b72-1c9f-40ec-9267-d91a2ff2b08a', true, 'Sewage pipelines', '', '', 'Sanitation'),
('db3a9957-7be5-4bd1-86d6-96b5321cf4fe', 'adcd0b72-1c9f-40ec-9267-d91a2ff2b08a', true, 'Vacuum trucks', '', '', 'Sanitation'),
('a732b3df-bca5-42ec-9b87-851dd00ce9e9', 'adcd0b72-1c9f-40ec-9267-d91a2ff2b08a', true, 'Sludge transports', '', '', 'Sanitation'),
('9509deb3-8a24-48bc-832c-906261ac180f', 'adcd0b72-1c9f-40ec-9267-d91a2ff2b08a', true, 'Mobile treatment units', '', '', 'Sanitation'),
('e5e1f01e-b1f6-4d1a-8428-ba1a234599bb', 'adcd0b72-1c9f-40ec-9267-d91a2ff2b08a', true, 'Pipes', '', '', 'Sanitation'),
('d94ad3ec-1dbe-4f88-bfbb-ddcd52ac40b6', 'adcd0b72-1c9f-40ec-9267-d91a2ff2b08a', true, 'Pumps', '', '', 'Sanitation'),
('7b2a5afc-9990-4a02-a462-fbfd0414691c', 'adcd0b72-1c9f-40ec-9267-d91a2ff2b08a', true, 'Drainage system', '', '', 'Sanitation'),
('cd4f1ba5-6a5e-405f-9a5a-2a975ad9169c', 'adcd0b72-1c9f-40ec-9267-d91a2ff2b08a', true, 'Supporting equipments', '', '', 'Sanitation'),
('360ce210-adf7-4966-acc9-b4b5fb1b1d0f', 'adcd0b72-1c9f-40ec-9267-d91a2ff2b08a', true, 'Waste water treatment plant', '', '', 'Sanitation'),
('091df712-12e3-4b54-b1cb-c0e391a6ffa2', '5c91ad51-b152-4ed0-a7f1-0d3e23e3253e', true, 'internal roads', '', '', 'Community Infrastructure'),
('417e8188-14c4-491b-b557-42c199bd63d5', '5c91ad51-b152-4ed0-a7f1-0d3e23e3253e', true, 'pathways', '', '', 'Community Infrastructure'),
('8d15c404-9750-4237-993a-85c707fe101d', '5c91ad51-b152-4ed0-a7f1-0d3e23e3253e', true, 'walkways', '', '', 'Community Infrastructure'),
('3a36156b-026b-48e9-b951-8c1448f2ca74', '5c91ad51-b152-4ed0-a7f1-0d3e23e3253e', true, 'footpaths', '', '', 'Community Infrastructure'),
('d20f6a08-7cfe-4b74-ae4f-217c6263f3bb', '5c91ad51-b152-4ed0-a7f1-0d3e23e3253e', true, 'Other connective ', '', '', 'Community Infrastructure'),
('517539d4-e73a-4592-9526-fba1d04f5aab', '5c91ad51-b152-4ed0-a7f1-0d3e23e3253e', true, 'rainage structures', '', '', 'Community Infrastructure'),
('d1a42d7f-9818-48f7-b368-ea1edcd87eb7', '5c91ad51-b152-4ed0-a7f1-0d3e23e3253e', true, 'pipe culverts', '', '', 'Community Infrastructure'),
('8ae5e800-8ba2-42d6-b54b-c92a3643c7e5', '5c91ad51-b152-4ed0-a7f1-0d3e23e3253e', true, 'box culverts', '', '', 'Community Infrastructure'),
('a1789d46-711a-4a38-88c7-3462939720d5', '5c91ad51-b152-4ed0-a7f1-0d3e23e3253e', true, 'footbridges ', '', '', 'Community Infrastructure'),
('2961e26b-36f6-4738-9036-59e24713a740', '5c91ad51-b152-4ed0-a7f1-0d3e23e3253e', true, 'retaining walls', '', '', 'Community Infrastructure'),
('e1652bec-020b-4802-b3ed-01c474691836', '5c91ad51-b152-4ed0-a7f1-0d3e23e3253e', true, 'protection of slopes', '', '', 'Community Infrastructure'),
('63f5ba5d-1d73-4b3c-8c15-c0dec0822f6a', '5c91ad51-b152-4ed0-a7f1-0d3e23e3253e', true, 'jetties', '', '', 'Community Infrastructure'),
('3932ca75-1ee0-4a2c-8153-c0f6807679d0', '5c91ad51-b152-4ed0-a7f1-0d3e23e3253e', true, 'small embankments ', '', '', 'Community Infrastructure'),
('c64f1321-25f7-41b4-a73e-6b7f4a0898a5', '5c91ad51-b152-4ed0-a7f1-0d3e23e3253e', true, 'protection walls', '', '', 'Community Infrastructure'),
('0ff0f328-2dba-406b-9d62-3ac01772302c', '5c91ad51-b152-4ed0-a7f1-0d3e23e3253e', true, 'small earthen dam', '', '', 'Community Infrastructure'),
('915f9e4e-3de2-4a47-aa8e-150328d30792', '5c91ad51-b152-4ed0-a7f1-0d3e23e3253e', true, 'Other protective', '', '', 'Community Infrastructure'),
('574a0769-5551-4cb2-898d-df0b29a48f28', '5c91ad51-b152-4ed0-a7f1-0d3e23e3253e', true, 'small marketplaces ', '', '', 'Community Infrastructure'),
('0823edc2-32ec-4f6f-b6de-ebf3e691b567', '5c91ad51-b152-4ed0-a7f1-0d3e23e3253e', true, 'infrastructure within market grounds', '', '', 'Community Infrastructure'),
('92f672d3-831d-4a0f-9181-d7328402b63f', '5c91ad51-b152-4ed0-a7f1-0d3e23e3253e', true, 'sheds', '', '', 'Community Infrastructure'),
('8ada5c77-925a-4283-bf02-1b02ef51b78c', '5c91ad51-b152-4ed0-a7f1-0d3e23e3253e', true, 'drains', '', '', 'Community Infrastructure'),
('270be00b-bb13-43ac-8fff-1e72c24ffd1a', '5c91ad51-b152-4ed0-a7f1-0d3e23e3253e', true, 'community shops', '', '', 'Community Infrastructure'),
('4dcbdd1c-0bec-4c37-a20c-997853ecf18b', '5c91ad51-b152-4ed0-a7f1-0d3e23e3253e', true, 'community resource centers', '', '', 'Community Infrastructure'),
('6d783f74-a175-44a9-bc69-6d5b503b8f40', '5c91ad51-b152-4ed0-a7f1-0d3e23e3253e', true, 'religious centers', '', '', 'Community Infrastructure'),
('c8f4c061-42fb-4471-8511-f8de1b08fb6d', '5c91ad51-b152-4ed0-a7f1-0d3e23e3253e', true, 'graveyards', '', '', 'Community Infrastructure'),
('82594492-8857-45b8-9b0b-c0d1cdce3db3', '5c91ad51-b152-4ed0-a7f1-0d3e23e3253e', true, 'playgrounds', '', '', 'Community Infrastructure'),
('1c666545-0b79-49fd-a82c-9e927e86a330', '5c91ad51-b152-4ed0-a7f1-0d3e23e3253e', true, 'water reservoirs ', '', '', 'Community Infrastructure'),
('96ed053b-db47-46f5-9b3c-ad4a8780be37', '5c91ad51-b152-4ed0-a7f1-0d3e23e3253e', true, 'community water supply', '', '', 'Community Infrastructure'),
('913cd6a8-726e-486e-a5e1-1d053043fc4c', '5c91ad51-b152-4ed0-a7f1-0d3e23e3253e', true, 'pump houses ', '', '', 'Community Infrastructure'),
('17ab719c-4705-4665-a858-bf0f0c2c49fa', '5c91ad51-b152-4ed0-a7f1-0d3e23e3253e', true, 'deep tube wells', '', '', 'Community Infrastructure'),
('0c794785-f590-47e5-a7fe-ee61a81bed2f', '5c91ad51-b152-4ed0-a7f1-0d3e23e3253e', true, 'basic drainage lines', '', '', 'Community Infrastructure'),
('c41ce43f-ae33-4650-a517-7db8dfba5e89', '5c91ad51-b152-4ed0-a7f1-0d3e23e3253e', true, 'community waste disposal and composting plants', '', '', 'Community Infrastructure'),
('42eb4a4c-2be7-4630-8dfc-d9003df3e4db', '5c91ad51-b152-4ed0-a7f1-0d3e23e3253e', true, 'biogassifiers', '', '', 'Community Infrastructure'),
('5bdefab6-5987-4bc5-8bba-d25cf13548b4', '5c91ad51-b152-4ed0-a7f1-0d3e23e3253e', true, 'solar home systems for electrification', '', '', 'Community Infrastructure'),
('6922ca3b-56df-4f58-8ae0-ac00484317e1', '5c91ad51-b152-4ed0-a7f1-0d3e23e3253e', true, 'other low cost off-grid systems', '', '', 'Community Infrastructure'),
('3c8d47a4-25d8-462e-b7ee-b42dd42fc9d1', '5c91ad51-b152-4ed0-a7f1-0d3e23e3253e', true, 'community telephone centers', '', '', 'Community Infrastructure'),
('10b0d02e-7a60-4400-ab63-7db0716d018b', '5c91ad51-b152-4ed0-a7f1-0d3e23e3253e', true, 'community-based early warning systems and communication devices', '', '', 'Community Infrastructure'),
('773e20e1-e128-4f20-8e51-f465a6ad0cdf', '5c91ad51-b152-4ed0-a7f1-0d3e23e3253e', true, 'community-run radio and communication systems', '', '', 'Community Infrastructure'),
('f8f57c74-14bf-478e-890f-b4f5b9c26bb6', '5c91ad51-b152-4ed0-a7f1-0d3e23e3253e', true, 'other community communication lifelines', '', '', 'Community Infrastructure'),
('1f3215e6-a108-49d0-b30e-ef9af195c003', '3910f40d-b1a1-4ac0-bfa6-52064d7d4e9f', true, 'Police stations', '', '', 'Governance'),
('a5f65443-960d-4b55-9fbe-076221b7fd01', '3910f40d-b1a1-4ac0-bfa6-52064d7d4e9f', true, 'Barracks', '', '', 'Governance'),
('f62fc5fe-7919-44a3-ba57-9a3977084c3f', '3910f40d-b1a1-4ac0-bfa6-52064d7d4e9f', true, 'Prisons', '', '', 'Governance'),
('914b0a03-16b3-471b-ba34-77023047fd59', '3910f40d-b1a1-4ac0-bfa6-52064d7d4e9f', true, 'Parliament house', '', '', 'Governance'),
('600c8a50-4aca-4b3e-bf77-f973eab831f5', '3910f40d-b1a1-4ac0-bfa6-52064d7d4e9f', true, 'Government house', '', '', 'Governance'),
('912e29c5-8208-4ef0-af64-5aebef9fae7e', '3910f40d-b1a1-4ac0-bfa6-52064d7d4e9f', true, 'Official residencies', '', '', 'Governance'),
('23a439b0-6205-4601-bfa5-9767599a3790', '3910f40d-b1a1-4ac0-bfa6-52064d7d4e9f', true, 'Arquives', '', '', 'Governance'),
('da1f389e-5a17-4415-833b-31f750b9b29f', '3910f40d-b1a1-4ac0-bfa6-52064d7d4e9f', true, 'Correctionaries', '', '', 'Governance'),
('35a74151-ce5a-4407-bbee-c2922f569bfb', '3910f40d-b1a1-4ac0-bfa6-52064d7d4e9f', true, 'Tribunal facilities', '', '', 'Governance'),
('cf0183db-c27c-436c-91d4-a4e6e0fc1007', '3910f40d-b1a1-4ac0-bfa6-52064d7d4e9f', true, 'Official Vehicles', 'Equipments', '', 'Governance'),
('12420163-6d99-4172-b3cb-cac192494670', '3910f40d-b1a1-4ac0-bfa6-52064d7d4e9f', true, 'Office furniture', 'Equipments', '', 'Governance'),
('ba1eec30-ff7b-4291-ab08-7fde9f35ff20', '3910f40d-b1a1-4ac0-bfa6-52064d7d4e9f', true, 'Fire trucks', 'Equipments', '', 'Governance'),
('8732a6a5-ed26-4378-babf-a706b9aa296b', '3910f40d-b1a1-4ac0-bfa6-52064d7d4e9f', true, 'Tanks', 'Equipments', '', 'Governance'),
('e65e7a04-234a-48b4-9d90-d59ffd86c146', '3910f40d-b1a1-4ac0-bfa6-52064d7d4e9f', true, 'Water trucks', 'Equipments', '', 'Governance');


INSERT INTO public.hip_class (id, name_en) VALUES 
('1041', 'Geohazards'),
('1044', 'Technological'),
('1042', 'Meteorological and Hydrological'),
('1037', 'Biological'),
('1043', 'Societal'),
('1038', 'Chemical'),
('1039', 'Environmental'),
('1040', 'Extraterrestrial');


--
-- Data for Name: hip_cluster, Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.hip_cluster (id, type_id, name_en) VALUES 
('1045', '1037', 'Fisheries and Aquaculture'),
('1046', '1037', 'Insect Infestation'),
('1047', '1037', 'Invasive Species'),
('1048', '1037', 'Human Animal Interaction'),
('1049', '1037', 'CBRNE (Chemical, Biological, Radiological, Nuclear and Explosive)'),
('1050', '1037', 'Mental Health'),
('1051', '1037', 'Food Safety'),
('1057', '1038', 'Heavy Metals'),
('1052', '1037', 'Infectious Diseases (Plant)'),
('1058', '1038', 'Food Safety'),
('1059', '1038', 'Pesticides'),
('1060', '1038', 'Persistent Organic Pollutants (POPs)'),
('1061', '1038', 'Hydrocarbons'),
('1062', '1038', 'CBRNE (Chemical, Biological, Radiological, Nuclear and Explosive)'),
('1093', '1044', 'Transportation'),
('1063', '1038', 'Other Chemical Hazards and Toxins'),
('1064', '1038', 'Fisheries and Aquaculture'),
('1088', '1044', 'Cyber Hazard'),
('1074', '1042', 'Marine'),
('1075', '1042', 'Pressure Related'),
('1076', '1042', 'Precipitation Related'),
('1065', '1039', 'Environmental Degradation'),
('1066', '1039', 'Environmental Degradation (Forestry)'),
('1077', '1042', 'Temperature Related'),
('1078', '1042', 'Terrestrial'),
('1067', '1040', 'Extraterrestrial'),
('1068', '1041', 'Seismogenic (Earthquakes)'),
('1079', '1042', 'Wind Related'),
('1080', '1043', 'Conflict'),
('1081', '1043', 'Post Conflict'),
('1082', '1043', 'Behavioural'),
('1053', '1037', 'Infectious Diseases (Human and Animal)'),
('1083', '1043', 'Economic'),
('1054', '1037', 'Infectious Diseases (Animal)'),
('1055', '1037', 'Infectious Diseases (Aquaculture)'),
('1069', '1041', 'Volcanogenic'),
('1056', '1038', 'Gases'),
('1084', '1044', 'Radiation'),
('1085', '1044', 'CBRNE (Chemical, Biological, Radiological, Nuclear and Explosive)'),
('1086', '1044', 'Structural Failure'),
('1070', '1041', 'Other Geohazard'),
('1071', '1042', 'Convective Related'),
('1087', '1044', 'Infrastructure Failure'),
('1072', '1042', 'Flood'),
('1073', '1042', 'Lithometeors'),
('1089', '1044', 'Industrial Failure'),
('1090', '1044', 'Waste'),
('1091', '1044', 'Marine'),
('1092', '1044', 'Flood');


--
-- Data for Name: hip_hazard; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.hip_hazard (id, code, cluster_id, name_en, description_en) VALUES 
('78385', 'BI0001', '1045', 'Harmful Algal Blooms', 'Harmful algal blooms result from noxious and/or toxic algae that cause direct and indirect negative impacts on aquatic ecosystems, coastal resources, and human health (Kudela et al., 2015).'),
('78386', 'BI0002', '1046', 'Insect Pest Infestations', 'An insect pest infestation is a recently detected insect pest population, including an incursion, or a sudden significant increase of an established insect, disease agents or weed population in an area leading to damage to plants in production fields, forests or natural habitats and causing substantial damage to productivity, biodiversity or natural resources (adapted from FAO, 2019).'),
('78387', 'BI0003', '1046', 'Locust', 'Widespread and heavy infestations of crops and natural vegetation by locusts causing significant threats to food security, livelihoods and natural habitats in multiple regions (adapted from FAO, 2009).'),
('78388', 'BI0004', '1047', 'Invasive Weeds', 'An invasive weed is an alien species that by its establishment or spread has become injurious to plants, or that by risk analysis is shown to be potentially injurious to plants (adapted from FAO, 2017).'),
('78389', 'BI0005', '1047', 'Invasive Species', '‘Invasive species’, also known as ‘alien invasive species’, are species whose introduction, establishment and spread into new areas threaten ecosystems, habitats or other species and cause social, economic or environmental harm, or harm to human health (FAO, 2007:82).'),
('78390', 'BI0006', '1048', 'Snake Envenomation', 'A snake envenomation is a potentially life-threatening disease caused by toxins in the bite of a venomous snake. Envenoming can also be caused by having venom sprayed into the eyes by certain species of snake that have the ability to spit venom as a defence measure (WHO, no date).'),
('78391', 'BI0007', '1048', 'Human-Wildlife Conflict', 'Human-wildlife conflict is defined as struggles that emerge when the presence or behaviour of wildlife poses an actual or perceived, direct and recurring threat to human interests or needs, leading to disagreements between groups of people and negative impacts on people and/or wildlife (IUCN SSC, 2020).'),
('78392', 'BI0008', '1049', 'Biological Agents', 'Biological agents, according to the Convention on the Prohibition of the Development, Production and Stockpiling of Bacteriological (Biological) and Toxin Weapons and on their Destruction (1972), include germs, toxins and viruses that can sicken or kill people, livestock, or crops (UNODA, 1972).'),
('78393', 'BI0009', '1050', 'Suicide Cluster', 'The term ‘suicide cluster’ describes a situation in which more suicides than expected occur in terms of time, place, or both. It is difficult to precisely define a cluster. A suicide cluster usually includes three or more deaths; however, two suicides occurring in a specific community or setting (for example a school) in a short time period should also be taken very seriously in terms of possible links and impacts (even if the deaths are apparently unconnected), particularly in the case of young people (PHE, 2019).'),
('78394', 'BI0010', '1051', 'Antimicrobial Resistance', 'Antimicrobial resistance is the ability of a microorganism to multiply or persist in the presence of an increased level of an antimicrobial agent relative to the susceptible counterpart of the same species (FAO, 2011).'),
('78395', 'BI0011', '1051', 'Foodborne Microbial Hazards (including human enteric virus and foodborne parasite)', '<p>Foodborne microbial hazards include (but are not limited to) pathogenic bacteria, viruses, algae, protozoa, fungi, parasites, prions, toxins and other harmful metabolites of microbial origin (FAO and WHO, 2007).</p><p>A human enteric virus is a virus that replicates in the gastro-intestinal tract or in the liver and is excreted in faeces and/or vomitus from humans. It is transmitted mainly by the faecal-oral route and is infectious to humans (FAO and WHO, 2012).</p><p>A foodborne parasite is any parasite that can be transmitted to humans by ingesting food (FAO and WHO, 2016).</p>'),
('78396', 'BI0012', '1052', 'Bacterial Plant Disease', 'A bacterial plant disease is the occurrence of plant diseases caused by bacterial microorganisms over large areas with significant impacts on crop and forest productivity or natural habitat (adapted from FAO, 2018).'),
('78397', 'BI0013', '1052', 'Fungal Plant Disease', 'Fungal plant disease is the occurrence of plant diseases caused by fungal agents over large areas with significant impact on crop productivity or natural habitats (Arneson, 2001; Moore et al., 2019).'),
('78398', 'BI0014', '1052', 'Viral, Mycoplasma and Viroid Plant Disease', 'Viral, mycoplasma and viroid plant disease epidemics are the occurrence of plant diseases caused by viruses, mycoplasma (syn. phytoplasma, mycoplasma-like organisms ) and viroids over large areas with significant impact on crop productivity or natural habitats (adapted from Nakashima and Murata, 1993; Hammond and Owens, 2006; FAO and IPPC, 2016; Rubio et al., 2020).'),
('78399', 'BI0015', '1053', 'Anthrax', 'Anthrax is a disease caused by the spore-forming bacteria Bacillus anthracis. Anthrax is primarily a disease of herbivorous animals, although all mammals, including humans can contract it. In humans, anthrax manifests itself in three distinct patterns (cutaneous, gastrointestinal, inhalational) (adapted from WHO, FAO and OIE, 2008; CDC, 2020).'),
('78400', 'BI0016', '1053', 'Airborne Diseases', 'Airborne transmission of infectious agents refers to the transmission of disease caused by dissemination of very small droplets that remain infectious when suspended in air over long distance and time (WHO, 2020).'),
('78401', 'BI0017', '1053', 'Blood Borne Viruses', 'Blood-borne viruses are viruses transmitted by direct contact with infected blood or other body fluids (WHO, 2012).'),
('78402', 'BI0018', '1053', 'Waterborne Diseases', '<p>Waterborne diseases are those diseases that are transmitted by ingestion of contaminated water (WHO, 2012).</p>'),
('78403', 'BI0019', '1053', 'Foodborne Diseases', 'Foodborne diseases are transmitted by consumption of contaminated biological food and drink (WHO, 2012). These diseases are caused by eating food contaminated with bacteria, viruses, parasites or chemical substances (WHO, no date).'),
('78404', 'BI0020', '1053', 'Sexually Transmitted Diseases (Human)', 'Sexually transmitted diseases are infections transmitted from an infected person to an uninfected person through sexual contact (WHO, no date).'),
('78405', 'BI0021', '1053', 'Neglected Tropical Diseases (Human)', 'Neglected tropical diseases (NTDs) are a diverse group of communicable diseases caused by bacteria, viruses or parasites that prevail in tropical and subtropical conditions (WHO, no date). Twenty diseases and disease groups are addressed in the global roadmap for NTDs 2021–2030 (WHO, 2020).'),
('78406', 'BI0022', '1053', 'Vaccine-Preventable Diseases (Human)', 'Vaccine preventable diseases are those infectious diseases that can be prevented by vaccination (WHO, 2012).'),
('78453', 'BI0069', '1053', 'Rotavirus (Human)', 'Rotaviruses are the most common cause of severe diarrhoeal disease in young children throughout the world. According to WHO estimates in 2013 about 215,000 children aged under 5 years die each year from vaccine-preventable rotavirus infections; the vast majority of these children live in low-income countries (WHO, 2018).'),
('78407', 'BI0023', '1053', 'Vector Borne Diseases (VBD) (Human)', 'Vector borne diseases encompass a variety of illnesses that are caused via the spread of pathogens by living organisms known as vectors. These infectious diseases can be transmitted via vectors among humans (e.g., malaria, dengue), among animals (e.g., African swine fever, East Coast fever), or from animals to humans (e.g., Nipah virus disease). Many of these vectors are bloodsucking insects, and mosquitoes are the bestknown disease vector. Other vectors include ticks, flies, sandflies, fleas, triatomine bugs and some species of freshwater aquatic snails (adapted from OIE, 2019; WHO, 2020).'),
('78408', 'BI0024', '1053', 'Viral Haemorrhagic Fevers (Human)', 'Viral haemorrhagic fever is a general term for severe illnesses, sometimes associated with bleeding, that may be caused by a number of viruses. The term is usually applied to diseases caused by viruses that belong to the Arenaviridae, Bunyaviridae, Filoviridae and Flaviviridae families (WHO, no date).'),
('78409', 'BI0025', '1053', 'Antimicrobial Resistant Microorganisms', 'Antimicrobial resistant microorganisms are those microorganisms (such as bacteria, fungi, viruses, and parasites) that change when they are exposed to antimicrobial drugs (such as antibiotics, antifungals, antivirals, antimalarials, and anthelmintic). Microorganisms that develop antimicrobial resistance are sometimes referred to as ‘superbugs’. As a result, the medicines become ineffective and infections persist in the body, increasing the risk of spread to others (WHO, 2020).'),
('78410', 'BI0026', '1053', 'Animal Diseases (Not Zoonoses)', 'Animal disease is an impairment of the normal state of an animal that interrupts or modifies its vital function. Infectious diseases of livestock and wildlife are a major threat to global animal health and welfare and their effective control is crucial for agronomic health, for safeguarding and securing national and international food supplies and for alleviating rural poverty in developing countries. This hazard information profile focusses on animal diseases not including zoonoses (Britannica, 2021; adapted from Tomley and Shirley, 2009).'),
('78411', 'BI0027', '1053', 'Zoonotic Diseases', 'Zoonotic diseases are a group of communicable diseases that are transmissible from vertebrate animals to humans through direct contact or through food, water, and the environment (WHO, no date).'),
('78412', 'BI0028', '1053', 'Diarrhoeal Diseases (Human)', 'Diarrhoeal diseases are infectious diseases, contaminants and other causes of diarrhoea. Diarrhoea is defined as the passage of three or more loose or liquid stools per day, or more frequently than is normal for the individual (WHO, no date). This includes the three clinical types of diarrhoea: acute watery diarrhoea – lasts several hours or days, and includes cholera; acute bloody diarrhoea – also called dysentery; and persistent diarrhoea – lasts 14 days or longer (WHO, 2017).'),
('78413', 'BI0029', '1053', 'Prion Diseases', 'Prion diseases are a family of rare progressive neurodegenerative disorders that affect both humans and animals (CDC, no date).'),
('78414', 'BI0030', '1053', 'Hepatitis B (Human)', 'Hepatitis B is a vaccine-preventable disease, that is endemic and epidemic worldwide, and caused by the Hepatitis B virus (HBV). HBV can cause both acute and chronic liver disease. Chronic infection puts people at high risk of death from cirrhosis and liver cancer (WHO, 2020).'),
('78415', 'BI0031', '1053', 'Hepatitis C (human)', 'Hepatitis C is a blood-borne liver disease caused by the hepatitis C virus: the virus can cause both acute and chronic hepatitis, ranging in severity from a mild illness lasting a few weeks to a serious, lifelong illness including liver cirrhosis and liver cancer. Hepatitis C is endemic and epidemic worldwide (WHO, 2020).'),
('78416', 'BI0032', '1053', 'HIV and AIDS (Human)', 'The human immunodeficiency virus (HIV) is a viral sexually transmitted and blood-borne infection which targets the immune system, weakening people’s defences against opportunistic infections and some types of cancer. The most advanced stage of HIV infection is acquired immunodeficiency syndrome (AIDS), which can take from 2 to 15 years to develop if not treated, depending on the individual. AIDS is defined by the development of certain cancers, infections or other severe clinical manifestations (WHO, 2019).'),
('78417', 'BI0033', '1053', 'COVID-19 (SARS-CoV-2) (Human)', 'COVID-19 is an infectious disease caused by the SARS Coronavirus 2 (SARS CoC2), a virus first identified in human populations in late 2019. Transmission occurs through droplets containing infectious virus, either by direct face to face contact (splash) generated by speaking, singing, coughing or sneezing; or by aerosolisation for up to 1 metre. Virus-containing aerosols that travel further than 1 metre are defined as airborne. The virus is thought to infect humans through the mucus membranes of the eyes, nose and mouth. Living virus has been isolated from faeces and urine but neither is thought to represent a major means of transmission. Fomites are thought to represent a low risk of transmission, but the risk has not yet been quantified. The risk of transmission is greatest in closed, poorly ventilated spaces where humans are in close proximity for ten to fifteen minutes and do not physically distance or wear a protective face covering (WHO, 2020).'),
('78418', 'BI0034', '1053', 'Cholera (Human)', 'Cholera is an acute diarrhoeal infection caused by ingestion of food or water contaminated with the bacterium Vibrio cholerae. Cholera remains a global threat to public health (WHO, 2019).'),
('78419', 'BI0035', '1053', 'Cryptosporidium (Human)', 'Cryptosporidium is a microscopic parasite that causes the watery diarrhoeal disease cryptosporidiosis (WHO, 2013).'),
('78420', 'BI0036', '1053', 'Paratyphoid fever (Human)', 'Paratyphoid fever is a systemic disease caused by the bacterium Salmonella Paratyphi usually through ingestion of contaminated food or water (WHO, 2019).'),
('78421', 'BI0037', '1053', 'Typhoid Fever (Human)', 'Typhoid fever is a life-threatening infection caused by the bacterium Salmonella Typhi. It is usually spread through contaminated food or water. An estimated 11–20 million people get sick from typhoid and between 128,000 and 161,000 people die from it every year (WHO, 2018).'),
('78422', 'BI0038', '1053', 'Hepatitis A (Human)', 'Hepatitis A is an acute vaccine-preventable viral liver disease caused by the hepatitis A virus. The infection can cause mild to severe illness and is epidemic prone (WHO, 2020).'),
('78423', 'BI0039', '1053', 'Escherichia Coli (STEC) (Human)', 'Escherichia coli (E. coli) is a bacterium commonly found in the gut. Some strains can cause serious food poisoning, leading to diarrhoea and sometimes to life-threatening complications including haemolytic uraemic syndrome (WHO, 2018).'),
('78424', 'BI0040', '1053', 'Listeriosis (Human)', 'Listeriosis is a foodborne infection caused by the bacterium Listeria monocytogenes which can be invasive (the more serious form of the disease) or non-invasive (the milder form of the disease). Listeriosis outbreaks occur in all countries and can be a significant public health concern (WHO, 2018).'),
('78425', 'BI0041', '1053', 'Shigellosis (Human)', 'Shigellosis is an acute invasive enteric infection caused by bacteria belonging to genus Shigella (WHO, 2005).'),
('78454', 'BI0071', '1053', 'Vector-borne diseases (VBD) (Animals)', 'Vector-borne diseases are diseases transmitted by a living being, usually an arthropod vector, to a vertebrate host (Verwoerd, 2015).'),
('78426', 'BI0042', '1053', 'Avian Influenza (Human and Animal)', 'Avian influenza is an infectious disease of birds caused by type A influenza viruses of the Orthomyxoviridae family. Naturally occurring among wild bird populations, avian influenza viruses can infect domestic poultry and other bird species. Some avian influenza viruses can also infect mammals and those affecting humans are called zoonotic. A pandemic can occur when a novel zoonotic avian influenza virus spreads in human populations worldwide (FAO, 2009; WHO, 2018; OIE, 2020).'),
('78427', 'BI0043', '1053', 'Pandemic Influenza (Human)', 'An influenza pandemic is the worldwide spread of a new influenza virus to which there is little or no pre-existing immunity in the human population (WHO, 2021).'),
('78428', 'BI0044', '1053', 'Seasonal Influenza (Human)', 'Seasonal influenza is an acute respiratory infection caused by influenza viruses which circulate in all parts of the world (WHO, 2018).'),
('78429', 'BI0045', '1053', 'Cysticercosis', 'Cysticercosis is a preventable intestinal infection in humans and animals caused by the tapeworm Taenia solium (pork tapeworm). Human cysticercosisi can result in devastating effects on human health resulting in neurocysticercosis with blindness, convulsions, and epileptic seizures, and can be fatal. It is estimated to affect between 2.56 and 8.30 million people, based on the range of epilepsy prevalence data available (adapted from WHO, 2020).'),
('78430', 'BI0046', '1053', 'Leptospirosis (Human)', 'Leptospirosis is an infectious disease caused by pathogenic Spirochaetes of the genus Leptospira. These bacteria called leptospires affect both humans and animals. Humans become infected through direct contact with the urine of infected animals or with a urinecontaminated environment. It is a zoonosis. Human-to-human transmission occurs only very rarely (adapted from WHO and ILS, 2003 and WHO, 2020).'),
('78431', 'BI0047', '1053', 'Plague (Human)', 'Plague is an acute febrile infectious disease caused by the zoonotic bacteria Yersinia pestis (Dennis et al., 1999).'),
('78432', 'BI0048', '1053', 'Leprosy', 'Leprosy is a curable infectious disease, endemic in many countries, caused by the bacterium Mycobacterium leprae (M. leprae). It mainly affects the skin, peripheral nerves, mucosa of the upper respiratory tract and eyes. Untreated, it can lead to permanent disability (WHO, 2019).'),
('78433', 'BI0049', '1053', 'Chikungunya', 'Chikungunya is a mosquito-borne viral infection caused by the chikungunya virus. It causes fever and severe arthralgia (joint pain) which is often debilitating. The disease can be endemic and epidemic in countries (WHO, 2020).'),
('78434', 'BI0050', '1053', 'Zika Virus (human)', 'Zika virus disease is a disease transmitted primarily by Aedes mosquitoes which can lead to complications (WHO, 2018).'),
('78435', 'BI0051', '1053', 'Diphtheria (Human)', 'Diphtheria is a widespread severe infectious disease caused by the bacterium Corynebacterium diphtheriae and the toxin they produce. It is a potentially life-threatening, vaccine-preventable disease that primarily affects the throat and upper airways and has the potential for epidemics (WHO, 2018).'),
('78436', 'BI0052', '1053', 'Measles (Human)', 'Measles is a highly contagious, serious disease caused by a virus from the paramyxovirus family. Transmission occurs through direct contact, droplet spread, and airborne spread. The virus initially infects the respiratory tract, then spreads throughout the body (WHO 2019).'),
('78437', 'BI0053', '1053', 'Meningococcal Meningitis (Human)', 'Meningococcal meningitis is a bacterial form of meningitis, a serious infection of the thin lining that surrounds the brain and spinal cord, that is caused by the bacterium Neisseria meningitidis. Meningococcal meningitis has the potential to cause large-scale epidemics and is observed worldwide (WHO, 2018).'),
('78438', 'BI0054', '1053', 'Pertussis (Human)', 'Pertussis is a highly contagious disease of the respiratory tract caused by the bacterium Bordetella pertussis (WHO, no date).'),
('78439', 'BI0055', '1053', 'Polio (Human)', 'Polio (human) is a highly infectious viral disease which mainly affects young children (WHO, 2019).'),
('78440', 'BI0056', '1053', 'Smallpox (Human)', 'Smallpox is an acute contagious disease caused by the variola virus (WHO, 2019).'),
('78441', 'BI0057', '1053', 'Varicella and herpes zoster (Human)', 'Varicella is an acute, highly contagious disease caused by varicellazoster virus (WHO, 2014).'),
('78442', 'BI0058', '1053', 'Yellow Fever (Human)', 'Yellow fever is an acute viral haemorrhagic disease transmitted by infected mosquitoes (WHO, 2019).'),
('78443', 'BI0059', '1053', 'Dengue (Human)', 'Dengue is a mosquito-borne disease that is caused by a virus of the Flaviviridae family and transmitted by female mosquitoes mainly of the species Aedes aegypti and, to a lesser extent, A. albopictus (WHO, 2020).'),
('78444', 'BI0060', '1053', 'Malaria (Human)', 'Malaria is a life-threatening disease caused by parasites that are transmitted to people through the bites of infected female Anopheles mosquitoes. It is preventable and curable. In 2018, there were an estimated 228 million cases of malaria worldwide and the estimated number of malaria deaths stood at 405,000 (WHO, 2020).'),
('78445', 'BI0061', '1053', 'Crimean-Congo Haemorrhagic Fever (Human)', 'Crimean-Congo haemorrhagic fever (CCHF) is a tick-borne viral infection caused by the CCHF virus. It causes severe viral haemorrhagic fever outbreaks and epidemics (WHO, 2013).'),
('78446', 'BI0062', '1053', 'Ebola (Human)', 'Ebola virus disease (EVD) is a rare but severe zoonotic viral infectious disease caused by the Ebola virus. It can lead to haemorrhagic fever and is often fatal in humans. EVD can trigger epidemics with high casefatality rates (WHO, 2020).'),
('78447', 'BI0063', '1053', 'Lassa Fever (Human)', 'Lassa fever is a zoonotic disease associated with acute and potentially fatal haemorrhagic illness caused by Lassa virus. It is associated with epidemics particularly where it is endemic in Benin, Ghana, Guinea, Liberia, Mali, Sierra Leone, and Nigeria (WHO, 2017).'),
('78448', 'BI0064', '1053', 'Tuberculosis (Human and Animal)', 'Tuberculosis (TB) is a curable bacterial infectious disease caused by Mycobacterium tuberculosis that most commonly affects the lungs. It causes national epidemics of varied severity worldwide. Forms of TB that are resistant to treatment – multi-drug resistant TB (MDR-TB) and extensively drug-resistant TB (XDR-TB) – are public health crises and threaten health security worldwide (WHO, 2020).'),
('78449', 'BI0065', '1053', 'Middle East Respiratory Syndrome (MERS)', 'Middle East respiratory syndrome (MERS) is a viral respiratory disease caused by MERS-Corona Virus (MERS-CoV) (WHO, 2019).'),
('78450', 'BI0066', '1053', 'Monkeypox (Human)', 'Monkeypox is a viral zoonotic disease that has symptoms similar to those of smallpox (WHO, 2019).'),
('78451', 'BI0067', '1053', 'Rabies (Animal and Human)', 'Rabies is a vaccine preventable zoonotic disease causing acute encephalitis which can progress towards coma and death typically within 7 to 10 days of the first signs if no intensive care is instituted. It is a disease of public health concern (adapted from WHO, 2018, 2020).'),
('78452', 'BI0068', '1053', 'Severe Acute Respiratory Syndrome (SARS)', 'Severe acute respiratory syndrome (SARS) is a viral respiratory illness caused by a coronavirus called SARS-associated coronavirus (SARSCoV) (WHO, 2019).'),
('78455', 'BI0072', '1053', 'Brucellosis (Animal)', 'Brucellosis is a bacterial disease caused by various Brucella species, which mainly infect cattle, swine, goats, sheep and dogs (WHO, 2020).'),
('78456', 'BI0074', '1053', 'Contagious Bovine Pleuropneumonia (CBPP) (Animal)', 'Contagious bovine pleuropneumonia is an infectious and contagious respiratory disease of Bovidae caused by Mycoplasma mycoides subspecies mycoides SC (Mmm) (OIE, 2018).'),
('78457', 'BI0075', '1053', 'Contagious Caprine Pleuropneumonia (CCPP) (Animal)', 'Contagious caprine pleuropneumonia is a severe disease of goats caused by Mycoplasma capricolum subsp. capripneumonIae (Mccp). The acute form of the disease is characterised by unilateral serofibrinous pleuropneumonia with severe pleural fluid (OIE, 2018).'),
('78458', 'BI0076', '1053', 'Foot and Mouth Disease Virus (Animal)', 'Foot-and-mouth disease is caused by a virus of the family Picornaviridae, genus Aphthovirus. It is a highly contagious and economically important disease of cloven-hoofed domestic animals (cattle, buffaloes, pigs, sheep, goats) and wild animals (FAO, 2012; OIE, 2018).'),
('78459', 'BI0077', '1053', 'Lumpy Skin Disease (Animal)', 'Lumpy skin disease is a vector-borne pox disease of domestic cattle and Asian water buffalo and is characterised by the appearance of skin nodules on all body surface including the udder (FAO, 2017).'),
('78460', 'BI0078', '1053', 'New World Screwworm (NWS) (Animal)', 'New World screwworms are a type of blow fly larvae (maggots) that can infest livestock and other warm blooded animals, including people. They most often enter an animal through an open wound and feed on the animal’s living flesh. If not treated, infestations can be fatal (OIE, 2020).'),
('78461', 'BI0079', '1053', 'Newcastle Disease Virus (Animal)', 'Newcastle disease is an infectious disease of birds caused by Newcastle disease virus, of the Paramyxovirdae family. The disease is seen mainly in chickens, but many bird species and even reptiles and mammals are susceptible to infection (OIE, 2018).'),
('78462', 'BI0080', '1053', 'Peste Des Petits Ruminants (Animal)', 'Peste des petits ruminants is a highly contagious and devastating disease of goats and sheep. The causative agent, Peste des petits ruminants virus is a member of the genus Morbillivirus, Family Paramyxoviridae and Order Mononegavirales (adapted from FAO, 2020a; OiE, 2020).'),
('78463', 'BI0081', '1053', 'Q Fever', 'Q fever is a widespread zoonosis caused by the bacterium Coxiella burnetii. The respiratory tract is the most common route of infection, which occurs by inhalation of contaminated dust and spray shed from infected animals. Livestock, more specifically dairy goats and cows are considered as the major ‘source’ for human infections; dairy products from infected goats or cows are also an important source of infection (FAO, no date).'),
('78464', 'BI0082', '1053', 'Rift Valley Fever (Animal)', 'Rift Valley fever (RVF) is an acute haemorrhagic viral disease, affecting small and large ruminants and camels. RVF virus is a member of the Phlebovirus genus. The disease causes high mortality especially in new borne and mass abortions in pregnant animals. Humans become infected from contact with tissues/blood of infected animals including abortive material and through mosquito bites. Disease in humans presents as influenza like illness, haemorrhagic fever, encephalitis and occasionally death (adapted from FAO, 2003; WHO, 2018; OIE 2020).'),
('78465', 'BI0083', '1053', 'Trypanosomosis (Animal)', 'Animal trypanosomosis is a lethal parasitic disease caused by unicellular organisms named trypanosomes. The disease is cyclically transmitted by the bite of infected tsetse flies and it affects both humans ‘sleeping sickness’ and livestock ‘nagana’ (FAO, 2020).'),
('78466', 'BI0084', '1053', 'West Nile Fever (Human)', 'West Nile virus disease is a fatal neurological disease caused by a virus transmitted through the bites of infected mosquitoes. The virus is a member of the flavivirus genus and belongs to the Japanese encephalitis antigenic complex of the family Flaviviridae (WHO, 2017).'),
('78467', 'BI0086', '1053', 'Trypanosomiasis (Human)', 'Trypanosomiasis, human African (sleeping sickness) is caused by protozoan parasites belonging to the genus Trypanosoma transmitted by infected tsetse flies and is endemic in 36 sub-Saharan African countries. Without treatment, the disease is considered fatal, where there are tsetse flies that transmit the disease (WHO, 2020).'),
('78468', 'BI0070', '1054', 'African Swine Fever (Animal)', 'African swine fever is a devastating haemorrhagic viral disease of pigs, affecting domestic and wild pigs of all ages and both sexes (FAO, OiE, and EC, 2019).'),
('78469', 'BI0073', '1054', 'Classical Swine Fever (Animal)', 'Classical swine fever, also known as hog cholera, is a contagious viral disease of domestic and wild swine. It is caused by a virus of the genus Pestivirus of the family Flaviviridae (OiE, 2020).'),
('78470', 'BI0085', '1054', 'Rinderpest (Animal)', 'Rinderpest was a disease caused by paramyxovirus in the genus Morbillivirus. It was most commonly observed in domestic cattle and buffaloes. The last confirmed outbreak of rinderpest was in 2001 and the disease was declared to have been eradicated globally in 2011 by the Food and Agriculture Organization of the United Nations (FAO) and the World Organisation for Animal Health (OIE). Rinderpest was a highly contagious viral disease of animals that, throughout history, has resulted in the mortality of hundreds of millions of livestock and has caused significant disruption and damage to agricultural supply chains throughout the world. Rinderpest is the first animal disease eradicated worldwide. The last confirmed outbreak of rinderpest was in 2001. Rinderpest was declared as eradicated by 2011. The Rinderpest Secretariat (FAO and OIE joint activity) is engaged in safeguarding the global freedom, similar to what has been done for smallpox by the World Health Organization (OIE, 2019; FAO, 2020).'),
('78471', 'BI0087', '1055', 'Shrimp disease (bacterial) - Acute Hepatic', 'Shrimp acute hepatopancreatic necrosis disease (AHPND) is caused by virulent strains of Vibrio parahaemolyticus and related Vibrio species. AHPND-associated mortalities occur early in the production cycle, usually within 30 to 35 days of stocking, and because of this AHPND was initially referred to as early mortality syndrome (OIE, 2019).'),
('78472', 'BI0088', '1055', 'Oyster Disease Aquaculture', 'There are a number of causal agents recognised for oyster diseases. Examples of major oyster diseases and their causal protozoan agents are: bonamiosis (Bonamia exitiosa, B. ostreae); marteiliosis (Marteilia refringens); perkinsosis (Perkinsus marinus, P. olseni). These oyster diseases are notifiable OIE-listed diseases and occur worldwide (OIE, 2019).'),
('78473', 'CH0001', '1056', 'Ammonia', 'Ammonia (NH3) is a colourless acrid-smelling reactive gas at ambient temperature and pressure and is considered a significant public health hazard (WHO, 1986; PHE, 2019).'),
('78474', 'CH0002', '1056', 'Carbon Monoxide', 'Carbon monoxide is a colourless, odourless gas that can be poisonous to humans and is considered a significant public health hazard (WHO, 1999).'),
('78490', 'CH0018', '1061', 'Benzene', 'Benzene is a clear, colourless, highly flammable and volatile, liquid aromatic hydrocarbon (molecular formula C6H6) with a gasoline-like odour (WHO, 2019).'),
('78596', 'MH0031', '1075', 'Extra-tropical Cyclone', 'An extra-tropical cyclone is a low-pressure system which develops in latitudes outside the tropics (WMO, 1992).'),
('78475', 'CH0015', '1056', 'Phosphine', 'Phosphine (PH₃) is a colourless, flammable, and explosive gas at room temperature. The major uses of phosphine are as a rodenticide and fumigant for agricultural products and in the manufacture of semiconductors for the electronics industry. Exposure to low doses causes non-specific symptoms, such as nausea, vomiting, stomach pain, diarrhoea, thirst, muscle pain, difficulty breathing and fluid in the lungs. Exposure to higher doses may cause more severe effects, even death (adapted from PHE, 2017 and CDC, 2019).'),
('78476', 'CH0016', '1056', 'Chlorine', 'Chlorine is a reactive pale green gas with many uses including disinfection of water that is approximately three times heavier than air and has a characteristic odour similar to bleach. Most significant exposures to chlorine result from loss of containment of chlorine during storage and transport. Human exposure can result in symptoms ranging from mild irritation to rapid death related to pulmonary oedema. It is considered a significant public health hazard (adapted from IPCS, 1982 and PHE, 2019).'),
('78477', 'CH0003', '1057', 'Arsenic', 'Arsenic is a toxic heavy metal widely distributed throughout the Earth’s crust, generally as arsenic sulphide or as metal arsenates and arsenides. Human exposure to arsenic compounds represents a major public health concern as it has been associated with a range of acute and long-term adverse health effects and diseases (WHO, 2019).'),
('78478', 'CH0004', '1057', 'Cadmium', 'Cadmium is a toxic heavy metal which is widely distributed in the Earth’s crust (soil and rocks), air and water; however, human activity has greatly increased levels in environmental media relevant to population exposure. Human exposure to cadmium represents a major public health concern as it has been associated with a range of acute and long-term adverse health effects and diseases (WHO, 2019).'),
('78479', 'CH0005', '1057', 'Lead', 'Lead is a naturally occurring highly toxic heavy metal. Its widespread use has caused extensive environmental contamination and health problems in many parts of the world. It is a cumulative toxicant that affects multiple body systems, including the neurological, haematological, gastrointestinal, cardiovascular and renal systems. Children are particularly vulnerable to the neurotoxic effects of lead, and even relatively low levels of exposure can cause serious and, in some cases, irreversible neurological damage (WHO, 2010).'),
('78480', 'CH0006', '1057', 'Mercury', 'Mercury is a naturally occurring element that is found in air, water and soil. Exposure to mercury – even small amounts – may cause serious health problems and is a threat to the development of the foetus in utero and for children early in life (WHO, 2017).'),
('78481', 'CH0007', '1058', 'Levels of Contaminants in Food and Feed', 'A contaminant in food and feed is defined as any substance not intentionally added to food or feed for food-producing animals, which is present in such food or feed as a result of the production (including operations carried out in crop husbandry, animal husbandry and veterinary medicine), manufacture, processing, preparation, treatment, packing, packaging, transport or storage, or as a result of environmental contamination. Note: The term includes toxins, such as moulds, but does not include insect fragments, rodent hairs and other extraneous matter (FAO and WHO, 2019).'),
('78482', 'CH0008', '1059', 'Pesticides – Highly Hazardous', '<p>Pesticide means any substance, or mixture of substances of chemical or biological ingredients intended for repelling, destroying or controlling any pest, or regulating plant growth. Pesticides are inherently toxic, and among them, a small number of Highly Hazardous Pesticides, cause disproportionate harm to the environment and human health. The Food and Agriculture Organization (FAO) and the World Health Organization (WHO) Guidelines on Highly Hazardous pesticides (UNEP, 2021) adopted the following definition:</p><p>“Highly Hazardous Pesticides means pesticides that are acknowledged to present particularly high levels of acute or chronic hazards to health or environment according to internationally accepted classification systems such as WHO or Global Harmonized System (GHS) or their listing in relevant binding international agreements or conventions. In addition, pesticides that appear to cause severe or irreversible harm to health or the environment under conditions of use in a country may be considered to be and treated as highly hazardous.”</p>'),
('78483', 'CH0009', '1059', 'Residue of Pesticides', 'Pesticide residue means any specified substance in food, agricultural commodities, or animal feed resulting from the use of a pesticide. The term includes any derivatives of a pesticide, such as conversion products, metabolites, reaction products, and impurities considered to be of toxicological significance (FAO and WHO, no date, 2019).'),
('78484', 'CH0011', '1059', 'Insecticides', 'Insecticides are chemicals used to control insects by killing them (CDC, 2019).'),
('78485', 'CHO012', '1059', 'Fungicides', 'Fungicides are chemicals that kill or slow the growth of fungi and their spores. They can be used on plants or other surfaces where mould or mildew grow (CDC, 2019).'),
('78486', 'CH0010', '1060', 'Hazardous Pesticide Contamination in Soils', 'Hazardous pesticide contamination in soils often results from improper storage of (obsolete) agrochemicals, as a result of which pesticides are spilled in the surroundings of the storage site, where they seep into the soil or are dispersed by wind. In some cases, pesticide spillage has been ongoing for many years. Such spillage may cause serious soil or groundwater contamination. In addition, highly toxic and persistent compounds have been used in agriculture for decades to control pests and diseases, which are proven to cause harm to non-target species. Although international agreements are put in place to regulate the production and use of those highly toxic and persistent compounds they will still remain in soils for several more decades. Moreover, in some countries, the international agreements are not yet being implemented or fully implemented, and therefore toxic pesticides are still being used. When soil and groundwater are contaminated, crops, livestock and drinking water may become affected and, when they are consumed by people, health risks may occur (FAO, 2000).'),
('78487', 'CH0013', '1060', 'Dioxins and Dioxin-like Substances', 'Dioxins and dioxin-like substances, including polychlorinated biphenyls (PCBs), polychlorinated dibenzo-p-dioxins (PCDDs) and polychlorinated dibenzofurans (PCDFs) are persistent organic pollutants (POPs) and are unwanted by-products of combustion and various industrial processes, such as chlorine bleaching of paper pulp and smelting. They can travel long distances from the source of emission, and bioaccumulate in food chains These substances represent a major public health concern. They have been associated with a range of acute and long-term adverse health effects and diseases (WHO, 2019).'),
('78488', 'CH0014', '1060', 'Microplastics', 'Microplastics are small plastic pieces less than five millimetres in length which can be harmful to the environment especially marine life. They originate from a variety of sources, including larger plastic debris that degrades into progressively smaller pieces (adapted from UNEP, 2016 and NOAA, no date).'),
('78489', 'CH0017', '1061', 'Oil Pollution', 'Oil pollution includes the accidental or deliberate, operational spills of oil from ships, especially tankers, offshore platforms and pipelines (Global Marine Oil Pollution Information Gateway, no date).'),
('78491', 'CH0019', '1062', 'Chemical Warfare Agents', 'Chemical agents or ‘chemical warfare agents’ (chemical weapons) are chemicals used to cause intentional death or harm through their toxic properties. Munitions, devices and other equipment specifically designed to weaponise toxic chemicals also fall under the definition of chemical weapons. The Chemical Weapons Convention (CWC) prohibition against the use of toxic chemicals and their precursors and also covers toxins of biological origin (OPCW, 2019a,b).'),
('78492', 'CH0020', '1063', 'Asbestos', 'Asbestos is the term for a group of naturally occurring minerals widely used historically in building materials and other products (WHO, no date). All types of asbestos cause lung cancer, mesothelioma, cancer of the larynx and ovary, and asbestosis (fibrosis of the lungs) (WHO, no date).'),
('78493', 'CH0021', '1063', 'Aflatoxins', 'Aflatoxins are mycotoxins – toxic compounds that are naturally produced by certain types of mould (fungi). Aflatoxins are among the most poisonous mycotoxins and are produced by certain moulds (Aspergillus flavus and A. parasiticus) that grow in soil, decaying vegetation, hay, and grains. Aflatoxins pose a serious health risk to humans and livestock (WHO, 2018a,b).'),
('78494', 'CH0022', '1063', 'Fluoride - Excess or inadequate intake', 'Fluoride is a naturally occurring mineral to which the public are often exposed via drinking-water. Depending on dose intake fluoride may have both beneficial effects (reducing the incidence of dental caries) or negative effects (causing tooth enamel and skeletal fluorosis following prolonged high exposure) (adapted from NCBI, 2020 and WHO, no date).'),
('78495', 'CH0023', '1063', 'Methanol', 'Methanol is a colourless fairly volatile liquid with a faintly sweet pungent odour similar to ethyl alcohol. Outbreaks of methanol poisoning arise from the consumption of adulterated counterfeit or informally produced spirit drinks (adapted from NCBI, 2020 and WHO, 2014).'),
('78496', 'CH0024', '1063', 'Substandard and Falsified Medical Products', 'Substandard and falsified medical products are defined as those that may cause harm to patients and fail to treat the diseases for which they were intended (WHO, 2018).'),
('78497', 'CH0025', '1064', 'Marine Toxins', 'Marine toxins (biotoxins) are naturally occurring chemicals, mostly caused by certain types of toxic algae, but also by bacteria. These toxins can accumulate in fish and shellfish and present a human health hazard (WHO, no date). When people consume such contaminated aquatic products, depending on the toxins, they can evoke a variety of gastrointestinal and neurological illnesses (paralytic shellfish poisoning, amnesic shellfish poisoning, diarrhoeic shellfish poisoning, neurotoxic shellfish poisoning, azaspiracid shellfish poisoning and ciguatera poisoning).'),
('78498', 'EN0001', '1065', 'Household Air Pollution', 'Household air pollution is one of the leading causes of disease and premature death and is associated with inefficient cooking practices using polluting stoves paired with solid fuels and kerosene (WHO, 2018).'),
('78499', 'EN0002', '1065', 'Air Pollution (Point Source)', 'A point source of air pollution is an identifiable stationary location or fixed facility from which air pollutants are released, which may be manmade or natural in origin (adapted from Kibble and Harrison, 2005 and Dunne et al., 2014).'),
('78500', 'EN0003', '1065', 'Ambient (Outdoor) Air Pollution', 'Ambient (outdoor) air pollution is a leading environmental risk factor affecting urban and rural populations around the world, resulting in an estimated 4.2 million premature deaths in 2016 (WHO, 2018).'),
('78501', 'EN0004', '1065', 'Land Degradation', '<p>Land degradation means reduction or loss, in arid, semi-arid and dry subhumid areas, of the biological or economic productivity and complexity of rainfed cropland, irrigated cropland or range, pasture, forest and woodlands resulting from land uses or from a process or combination of processes, including processes arising from human activities and habitation patterns such as: soil erosion caused by wind and/or water; deterioration of the physical, chemical and biological or economic properties of soil; and long-term loss of natural vegetation (UNCCD, 1993).</p><p>Alternative Definition: Land degradation is the reduction in the capability of the land to produce benefits from a particular land use under a specified form of land management (FAO, 1999).</p><p>Alternative Definition: Land degradation is a negative trend in land condition, caused by direct or indirect human-induced processes including anthropogenic climate change, expressed as long-term reduction or loss of at least one of the following: biological productivity, ecological integrity or value to humans. [Note: This definition applies to forest and non-forest land. Changes in land condition resulting solely from natural processes (such as volcanic eruptions) are not considered to be land degradation. Reduction of biological productivity or ecological integrity or value to humans can constitute degradation, but any one of these changes need not necessarily be considered degradation.] (Olsson et al., 2019).</p>'),
('78502', 'EN0005', '1065', 'Soil Degradation', 'Soil degradation is defined as a change in soil health status resulting in a diminished capacity of the ecosystem to provide goods and services for its beneficiaries (FAO, 2020).'),
('78503', 'EN0006', '1065', 'Runoff / Nonpoint Source Pollution', 'Nonpoint sources of pollution refer to pollution sources that are diffused and without a single point of origin or not introduced into a receiving freshwater or maritime environment from a specific outlet. The pollutants are generally carried off the land by storm-water run-off. The commonly used categories for nonpoint sources are agriculture, forestry, urban areas, mining, construction, dams and channels, land disposal and saltwater intrusion (UN data, no date).'),
('78504', 'EN0007', '1065', 'Salinity', '<p>Saline soils are those which have an electrical conductivity of the saturation soil extract of more than 4 dS/m at 25°C (Richards, 1954). This value is generally used worldwide although the terminology committee of the Soil Science Society of America has lowered the boundary between saline and non-saline soils to 2 dS/m in the saturation extract (FAO, 1988).</p><p>Note: dS/m = decisiemens per metre this is equivalent to the measurement of electrical conductivity of the salinity which can also be described as millimho per centimetre, hence 1 dS/m = 1 mmho/cm. Once the dS/m is known this can be converted to either mg/L or parts per million (ppm) (University of California, 2020).</p>'),
('78505', 'EN0008', '1065', 'Biodiversity Loss', 'Biodiversity loss refers to the reduction of any aspect of biological diversity (i.e., diversity at the genetic, species and ecosystem levels) in a particular area through death (including extinction), destruction or manual removal; it can refer to many scales, from global extinctions to population extinctions, resulting in decreased total diversity at the same scale (IPBES, no date).'),
('78506', 'EN0010', '1065', 'Forest Declines and Diebacks', 'Forest declines and diebacks are episodic events characterised by premature, progressive loss of tree and stand vigour and health over a given period without obvious evidence of a single clearly identifiable causal factor such as physical disturbance or attack by primary disease or insect (Ciesla and Donaubauer, 1994).'),
('78595', 'MH0030', '1075', 'Depression or Cyclone (Low Pressure Area)', 'A depression or cyclone is a region of the atmosphere in which the pressures are lower than those of the surrounding region at the same level (WMO, 1992).'),
('78507', 'EN0011', '1065', 'Forest Disturbances', 'Forest disturbance is the damage caused by any factor (biotic or abiotic) that adversely affects the vigour and productivity of the forest and which is not a direct result of human activities. It includes disturbance by insect pests, diseases, severe weather events and fires (FAO, 2018, 2020).'),
('78508', 'EN0014', '1065', 'Desertification', 'Desertification refers to land degradation in arid, semi-arid and dry subhumid areas resulting from various factors, including climatic variations and human activities (UNCCD, 2017).'),
('78509', 'EN0015', '1065', 'Loss of Mangroves', 'Mangroves and the destruction of mangrove habitat is caused by both human and natural causes. Human activities in the form of farming, aquaculture, urban development and natural stressors such as erosion and extreme weather have driven mangrove habitat loss. The hazard of loss of mangroves and their ecosystem services has devastating socioeconomic and environmental consequences for coastal communities, especially in those areas with low mangrove diversity and low mangrove area (adapted from Ellison et al., 1996; Polidoro et al., 2010; and Goldberg, 2020).'),
('78510', 'EN0016', '1065', 'Wetland Loss/Degradation', 'Wetland loss/degradation is a negative trend in wetland condition, caused by physical or direct/indirect human-induced processes expressed as long-term reduction or loss of at least one of the following: biological productivity, ecological role or value to humans (Craig et al., 1979; Olsson et al., 2019). Where wetlands are defined as areas of marsh, fen, peatland or water, whether natural or artificial, permanent or temporary, with water that is static or flowing, fresh, brackish or salt, including areas of marine water the depth of which at low tide does not exceed six metres (Ramsar Convention 1971: Article 1.1). Wetlands may incorporate riparian and coastal zones adjacent to the wetlands, and islands or bodies of marine water deeper than six metres at low tide lying within the wetlands (Ramsar Convention 1971: Article 2.1).'),
('78511', 'EN0017', '1065', 'Coral Bleaching', 'Corals are subject to ‘bleaching’ when the seawater temperature is too high: they lose the symbiotic algae that give coral its colour and part of its nutrients. Severe, prolonged or repeated bleaching can lead to the death of coral colonies (United Nations, 2017).'),
('78512', 'EN0018', '1065', 'Compressive Soils', 'Compressible soils include both compressive and collapsible soils. Compressive soils are soils that are prone to volumetric change when subject to mechanical loading (USDA, 1990:30). Collapsible soils are metastable in that they are prone to volumetric change (collapse) on wetting and loading (Rogers, 1995).'),
('78513', 'EN0019', '1065', 'Soil Erosion', 'Soil erosion is defined as the accelerated removal of topsoil from the land surface through water, wind and tillage (FAO, 2020).'),
('78514', 'EN0020', '1065', 'Coastal Erosion and Shoreline Change', 'Coastal erosion is the physical reduction of land mass at the coast that results from the interfacing of marine, fluvial and landsliding (driven by the interactions between groundwater and the soil or rock) processes with the coast (Mentaschi et al., 2018).'),
('78515', 'EN0021', '1065', 'Permafrost Loss', 'Permafrost is defined as the ground that remains frozen under 0°C for a minimum of two consecutive years. Permafrost loss, also known as permafrost thaw is the progressive loss of ground ice in permafrost, usually due to input of heat. Thaw can occur over decades to centuries over the entire depth of permafrost ground, with impacts occurring while thaw progresses. During thaw, temperature fluctuations are subdued because energy is transferred by phase change between ice and water. After the transition from permafrost to non-permafrost, ground can be described as thawed (IPCC, 2019).'),
('78516', 'EN0022', '1065', 'Sand Mining', 'Sand mining (extraction) is defined as the removal of primary (virgin) natural sand and sand resources (mineral sands and aggregates) from the natural environment (terrestrial, riverine, coastal, or marine) for extracting valuable minerals, metals, crushed stone, sand and gravel for subsequent processing (UNEP, 2019).'),
('78517', 'EN0023', '1065', 'Sea Level Rise', 'Sea-level change (sea-level rise / sea-level fall) is a change to the height of sea level, both globally and locally (relative sea-level change) at seasonal, annual, or longer time scales due to: a change in ocean volume as a result of a change in the mass of water in the ocean (e.g., due to melt of glaciers and ice sheets); to changes in ocean volume as a result of changes in ocean water density (e.g., expansion under warmer conditions), and to changes in the shape of the ocean basins and changes in the Earth’s gravitational and rotational fields, and local subsidence or uplift of the land (IPCC, 2019).'),
('78518', 'EN0024', '1065', 'Eutrophication', 'Eutrophication is the overabundance of nutrients in a body of water that results in harmful algal blooms, fish kills, and in some cases ecosystem collapse. It is a process driven by enrichment of water by nutrients, particularly compounds of nitrogen and/or phosphorus, leading to increased growth, primary production and biomass of algae; changes in the balance of nutrients causing changes to the balance of organisms; and water quality degradation (NOAA, 2007; UNEP, 2015).'),
('78519', 'EN0009', '1066', 'Deforestation', 'Deforestation is the conversion of forest to other land use independently of whether human-induced or not (FAO, 2020).'),
('78520', 'EN0012', '1066', 'Forest Invasive Species', 'Forest invasive species are any species that are non-native to a particular forest ecosystem and whose introduction and spread causes, or are likely to cause, socio-cultural, economic or environmental harm or harm to human health (adapted from FAO, 2015).'),
('78521', 'EN0013', '1066', 'Wildfires', 'Wildfires are any unplanned or uncontrolled fire affecting natural, cultural, industrial and residential landscapes (adapted from FAO, 2010).'),
('78522', 'ET0001', '1067', 'Airburst', 'An airburst is defined as an explosion in the air, especially of a nuclear bomb or large meteorite (Lexico Dictionary, no date).'),
('78523', 'ET0002', '1067', 'Geomagnetic Storm (including energetic particles related to space weather, and solar flare radio blackout [R Scale])', 'A geomagnetic storm is a worldwide disturbance of the Earth’s magnetic field induced by a solar storm (Cannon et al., 2013).'),
('78524', 'ET0003', '1067', 'UV Radiation', 'UV radiation is the portion of the electromagnetic (EM) spectrum between X-rays and visible light. Depending on its wavelength, UV radiation can penetrate the ozone layer and affect human health in different ways (Government of Canada, 2019).'),
('78525', 'ET0004', '1067', 'Meteorite Impact', 'A meteorite is an object that survives a trip through Earth’s atmosphere and hits the ground (adapted from NASA, no date).'),
('78526', 'ET0005', '1067', 'Ionospheric Storms', '<p>An ionospheric storm is defined as turbulence in the F region of the ionosphere, usually due to a sudden burst of radiation from the Sun (WMO, 1992).</p><p>NB. The F region is the highest region of the ionosphere, at altitudes greater than 160 km (100 miles).</p>'),
('78527', 'ET0006', '1067', 'Radio Blackout', 'Radio blackout is a prolonged period of fading or faded radio communications, primarily in the high frequency range from ionospheric changes because of increased solar activity, in particular solar flares of C-class level or higher on the sunlit side of Earth (AMS, 2018).'),
('78528', 'ET0007', '1067', 'Solar Storm (Solar Radiation Storm) (S Scale)', 'Solar radiation storms occur when large quantities of charged particles, primarily protons, accelerated by eruptive processes at or near the Sun reach the near-Earth environment (NOAA, 2019).'),
('78529', 'ET0008', '1067', 'Space Hazard / Accident', 'A space accident is any accident involving space objects that causes damage (adapted from UNGA, 1971).'),
('78530', 'ET0009', '1067', 'Near-Earth Object', 'A near-Earth object (NEO) is an asteroid or comet whose trajectory brings it to within 1.3 astronomical units of the Sun and hence within 0.3 astronomical units, or approximately 45 million kilometres, of the Earth’s orbit (UN OOSA, no date).'),
('78531', 'GH0001', '1068', 'Earthquake', 'Earthquake is a term used to describe both sudden slip on a fault, and the resulting ground shaking and radiated seismic energy caused by the slip, or by volcanic or magmatic activity, or other sudden stress changes in the Earth (USGS, no date).'),
('78532', 'GH0002', '1068', 'Ground Shaking (Earthquake)', 'Earthquake ground shaking is the movement of the Earth’s surface produced by seismic waves that are generated when an earthquake occurs (adapted from USGS, no date).'),
('78533', 'GH0003', '1068', 'Liquefaction (Earthquake Trigger)', 'Soil liquefaction occurs when soil is transformed from a solid to a liquid state as a result of increased pore pressure and reduced effective stress. It is typically caused by rapid loading of the soil during earthquake shaking (AGI, 2017).'),
('78534', 'GH0004', '1068', 'Earthquake Surface Rupture, Fissures, and Tectonic Uplift/Subsidence', '<p>Earthquake surface ruptures and fissures are localised ground displacements that develop during and immediately after an earthquake, where the fault which hosted the earthquake intersects the Earth’s surface. Surface ruptures represent the upward continuation of fault slip at depth, while fissures are smaller displacements, or more distributed deformation in and around the rupture area (adapted from USGS, no date and PNSN, no date).</p><p>Tectonic uplift and subsidence are the distributed vertical permanent ground deformations (warping) that result from displacement on a dipping (inclined) fault (Styron, 2019).</p>'),
('78535', 'GH0005', '1068', 'Subsidence and Uplift, Including Shoreline Change (Earthquake Trigger)', 'Tectonic uplift and subsidence are the distributed vertical permanent ground deformations (warping) that result from earthquake displacements on a dipping (inclined) fault (Styron, 2019). This includes changes to the shoreline as a result of uplift and subsidence.'),
('78536', 'GH0006', '1068', 'Tsunami (Earthquake Trigger)', 'Tsunami is the Japanese term meaning wave (‘nami’) in a harbour (‘tsu’). It is a series of travelling waves of extremely long length and period, usually generated by disturbances associated with earthquakes occurring below or near the ocean floor (IOC, 2019).'),
('78537', 'GH0007', '1068', 'Landslide or Debris Flow (Earthquake Trigger)', 'Landslide is the downslope movement of soil, rock and organic materials under the effects of gravity, which occurs when the gravitational driving forces exceed the frictional resistance of the material resisting on the slope. Landslides could be terrestrial or submarine (Varnes, 1978).'),
('78538', 'GH0008', '1068', 'Ground Gases (Seismogenic)', 'Ground gases generated in the ground from magma (molten or semimolten natural material derived from the melting of land or oceanic crust) include carbon dioxide, sulphur dioxide, hydrogen sulphide and hydrogen halides (adapted from IVHHN, 2020 and USGS, no date).'),
('78539', 'GH0009', '1069', 'Lava Flows (Lava Domes)', 'A lava flow or lava dome is a body of lava that forms during an eruption, or main eruptive episode. Lava flows are outpourings of fluid, relatively low-viscosity molten rock, whereas a lava dome is a pile of relatively viscous lava that cannot flow far from the vent (Calder et al., 2015; Kilburn, 2015).'),
('78540', 'GH0010', '1069', 'Ash/Tephra Fall (Physical and Chemical)', 'Tephra is a collective term for fragmented magma and old (i.e., preexisting) rocks ejected into the atmosphere from volcanic vents during an explosive eruption, irrespective of size, composition and shape (BGS, no date). The term ‘volcanic ash’ refers to the finest particles of tephra (less than 2 mm diameter).'),
('78541', 'GH0011', '1069', 'Ballistics (Volcanic)', 'Ballistics comprise fragments of magma and old (i.e., pre-existing) rocks ejected during an explosive eruption at variable velocity and angle on cannon ball-like trajectories; they are not entrained within the volcanic plume and are dispersed in proximity to the vent (typically <5 km) (adapted from Biass et al., 2016 and Bonadonna et al., 2021).'),
('78542', 'GH0012', '1069', 'Pyroclastic Density Current', 'Pyroclastic density currents are hot, fast-moving mixtures of volcanic particles and gas that flow according to their density relative to the surrounding medium and the Earth’s gravity. They typically originate from the gravitational collapse of explosive eruption columns, lava domes or lava-flow fronts, and from explosive lateral blasts (adapted from Branney and Kokelaar, 2002 and Cole et al., 2015).'),
('78543', 'GH0013', '1069', 'Debris Flow/Lahars/Floods', 'Lahars are discrete, rapid, gravity-driven, water-saturated flows containing water and solid particles of volcanic rock, sediment, ice, wood, and other debris that originate at volcanoes (Gudmundsson, 2015; Vallance and Iverson, 2015).'),
('78544', 'GH0014', '1069', 'Landslide (Volcanic Trigger)', 'A landslide is the downslope movement of soil, rock and organic materials under the effects of gravity, which occurs when the gravitational driving forces exceed the frictional resistance of the material resisting on the slope. Landslides could be terrestrial or submarine (Varnes, 1978).'),
('78545', 'GH0015', '1069', 'Ground Shaking (Volcanic Earthquake)', '<p>Ground shaking is the movement of the Earth’s surface from earthquakes. Ground shaking is produced by waves that travel through the earth and along its surface (USGS, no date).</p><p>A volcanic earthquake is any earthquake that results from tectonic forces which occur in conjunction with volcanic activity (UN-SPIDER, no date).</p>'),
('78546', 'GH0016', '1069', 'Volcanic Gases and Aerosols', '<p>Volcanic gas includes any gas-phase substance that is emitted by volcanic or volcanic-geothermal activity. Volcanic aerosols include liquid or solid particles that are small enough to be suspended in the air, and that are emitted by volcanic or volcanic-geothermal activity (adapted from Baxter and Horwell, 2015, Fischer and Chiodini 2015, and Williams- Jones and Rymer 2015).</p>'),
('78547', 'GH0017', '1069', 'Tsunami (Volcanic Trigger)', 'Volcano tsunamis (pronounced soo-ná-mees), are a series of waves created when water surrounding a volcano is displaced following an eruption, a landslide, or failure of a volcanic edifice into surrounding water. If the generating mechanism is large enough, the waves can be significant on local, regional or even transoceanic scales (Day, 2015).'),
('78548', 'GH0018', '1069', 'Lightning (Volcanic Trigger)', 'Volcanic lightning is an electrical discharge caused by a volcanic eruption. It is typically associated with ash-rich eruption plumes but can also arise from a range of volcanic processes including ground-hugging ash flows and lava-ocean entry (adapted from Mather and Harrison, 2006; Behnke and McNutt, 2014; and McNutt and Thomas, 2015).'),
('78549', 'GH0019', '1069', 'Urban Fire (During/Following Volcanic Eruption)', 'Urban fires are fire involving buildings or structures in cities or towns with potential to spread to adjoining structures. Triggers of urban fires are numerous, from human actions (e.g., knocking over a candle) and technological triggers (e.g., power surge overloading appliances), to natural triggers (e.g., wildland fires interacting with urban areas). Triggers from volcanic eruptions include lava flows, pyroclastic density currents, tephra, and ground shaking (adapted from Baxter et al., 2005 and ISO, 2020).'),
('78550', 'GH0020', '1069', 'Subsidence and Uplift, Including Shoreline Change (Magmatic/Volcanic Trigger)', 'Volcanic uplift and subsidence are deformations of the ground associated with volcanic unrest and eruptions (Dzurisin, 2007).'),
('78551', 'GH0021', '1070', 'Ground Shaking (induced earthquake, reservoir fill, dams, cavity collapse, underground explosion, impact, hydrocarbon fields, shale exploration, etc.)', 'Induced seismic ground shaking comprises non-tectonic (i.e., nonnatural) earthquakes which result from human activities that alter the stresses and strains on the Earth’s crust. Most induced seismicity is of a low magnitude and higher frequency than larger magnitude events with longer wavelengths and lower frequencies (USGS, 2016).'),
('78552', 'GH0022', '1070', 'Liquefaction (Groundwater Trigger)', 'Liquefaction is the term applied to the loss of strength experienced in loosely packed, saturated or close to saturated sediments at or near the ground surface in response to strong ground shaking, such as earthquakes, cyclic loading, and vibration from machinery, or due to the development of excess pore pressure resulting from a change in head or confining pressures. The loss of strength causes the soil to behave like a viscous fluid, sometimes referred to as ‘running sand’, until the excess pore pressure returns to hydrostatic (USGS, no date).'),
('78553', 'GH0023', '1070', 'Ground Fissuring', 'Ground fissures form in response to tensional stresses, most commonly in unconsolidated sediment, but also in rock (Arizona Geological Survey, 2020).'),
('78554', 'GH0024', '1070', 'Subsidence and Uplift Including Shoreline Change', 'Subsidence is a lowering or collapse of the ground (BGS, 2020). Uplift is the converse.'),
('78555', 'GH0025', '1070', 'Shrink-Swell Subsidence', 'Subsidence is a lowering or collapse of the ground, caused by various factors, including groundwater lowering, sub-surface mining or tunnelling, consolidation, sinkholes, or changes in moisture content in expansive soils. Shrink-swell is the term applied to the behaviour of expansive soils, which are a group of soils that exhibit volumetric change in response to changes in moisture content, such that they shrink in response to desiccation and swell by hydration, resulting in ground subsidence and ground heave respectively (BGS, 2020).'),
('78556', 'GH0026', '1070', 'Sinkhole', 'A sinkhole is a closed depression in karst (a landscape resulting from the dissolution of soluble rock) by current or palaeo internal drainage, also known as a doline. This is one of several hazards that result in subsidence, i.e., lowering or collapse of the ground (adapted from USGS, no date; and BGS, no date).'),
('78557', 'GH0027', '1070', 'Ground Gases (CH4, Rn, etc.)', 'Ground gases that result from material decay (natural or anthropogenic) typically include radon, methane, carbon dioxide, hydrogen sulphide, but may also include the break down products of other compounds, such as nitrogen, alcohols, alkanes, cycloalkanes and alkenes, aromatic hydrocarbons (monocyclic or polycyclic); esters and ethers, as well as halogenated compounds and organosulphur. Ground gases derived from magma (molten or semi-molten natural material derived from the melting of land or oceanic crust) include carbon dioxide, sulphur dioxide, hydrogen sulphide and hydrogen halides. Ground gases are gases released in combination with water vapour and particulate matter during volcanogenic events, or via fumaroles, and hydrothermal systems (adapted from NHBC (UK), 2007; IVHHN, 2020; US EPA, no date; and USGS, no date).'),
('78558', 'GH0028', '1070', 'Riverbank Erosion', 'Riverbank erosion is the removal of material from the banks of rivers when flowing water forces exceed bank resisting forces by the soil and vegetation, for example, when river levels are sufficiently high, primarily due to fluvial energy and atmospheric processes and secondarily because of the resultant geotechnical instability and consequential riverbank failure. Riverbank failure can also occur as a consequence of Earth hazards, such as volcanos and earthquakes (USDA, no date).'),
('78559', 'GH0029', '1070', 'Sand Encroachment', 'Sand encroachment occurs generally in arid to semi-arid regions when grains of sand are carried by winds and form sandy accumulation on coasts, along water courses and on cultivated or uncultivated land. As the accumulations of sand (dunes) move, they bury towns, roads, oases, crops, market gardens, irrigation channels and dams, thus causing major material and socioeconomic damage (FAO, 2010).'),
('78560', 'GH0030', '1070', 'Aquifer Recharge (Systems Failure/Outages)', 'An aquifer is a water-bearing rock that readily transmits water to wells and springs. It can be recharged either naturally (precipitation including rainfall or snow) or artificially (e.g., pumped river recharge via wells). Failure or outage can be due to derogation, well failure or contamination (USGS, no date).'),
('78561', 'GH0031', '1070', 'Submarine Landslide', 'A submarine landslide is a downslope movement of sediment or rock under the effect of gravity, which occurs when the stresses acting downslope exceed the available strength of the sediment on the slope (Lee et al., 2007).'),
('78562', 'GH0032', '1070', 'Rockfall', 'Rockfall is a fragment of rock (a block) detached by sliding, toppling, or falling, that falls along a vertical or sub-vertical cliff, and proceeds down slope by bouncing and flying along ballistic trajectories or by rolling on talus or debris slopes (Highland and Bobrowsky, 2008).'),
('78563', 'GH0033', '1070', 'Landscape Creep', 'Landscape creep is the imperceptibly slow, steady, downward movement of slope-forming soil or rock. Movement is caused by shear stress, sufficient to produce permanent deformation, but too small to produce shear failure (adapted from Hutchinson, 1968; and Varnes, 1978).'),
('78564', 'GH0034', '1070', 'Sediment Rock Avalanche', 'Rock avalanches are a translational form of mass movement where the transported material is dry rock that is fragmented before or during slope failure. They are rapid with long runouts and large volumes and often involve the entrainment of slope material, commonly therefore, giving rise to debris slides or flows. The motion of rock avalanches is massive such that the bulk of the rock fragments move together as a largely coherent mass (adapted from Collins, 2014 and USGS, no date).'),
('78565', 'GH0035', '1070', 'Tsunami (Submarine Landslide Trigger)', 'Tsunami is a Japanese term meaning wave (‘nami’) in a harbour (‘tsu’). It is a series of travelling waves of extremely long length and period. They are usually generated by seabed disturbances associated with earthquakes occurring below or near the ocean floor, but also by other mechanisms such as submarine landslides (IOC, 2019).'),
('78566', 'MH0001', '1071', 'Downburst', 'A downburst is a violent and damaging downdraught reaching the ground surface, associated with a severe thunderstorm (WMO, 1992).'),
('78567', 'MH0002', '1071', 'Lightning (Electrical Storm)', 'Lightning is the luminous manifestation accompanying a sudden electrical discharge which takes place from or inside a cloud or, less often, from high structures on the ground or from mountains (WMO, 2017).'),
('78568', 'MH0003', '1071', 'Thunderstorm', 'A thunderstorm is defined as one or more sudden electrical discharges, manifested by a flash of light (lightning) and a sharp or rumbling sound (thunder) (WMO, no date).'),
('78569', 'MH0004', '1072', 'Coastal Flood', 'Coastal flooding is most frequently the result of storm surges and high winds coinciding with high tides. The surge itself is the result of the raising of sea levels due to low atmospheric pressure. In particular configurations, such as major estuaries or confined sea areas, the piling up of water is amplified by a combination of the shallowing of the seabed and retarding of return flow (WMO, 2011).'),
('78570', 'MH0005', '1072', 'Estuarine (Coastal) Flood', 'Estuarine flooding is flooding over and near coastal areas caused by storm surges and high winds coincident with high tides, thereby obstructing the seaward river flow. Estuarine flooding can be caused by tsunamis in specific cases (WMO, 2011).'),
('78571', 'MH0006', '1072', 'Flash Flood', 'A flash flood is a flood of short duration with a relatively high peak discharge in which the time interval between the observable causative event and the flood is less than four to six hours (WMO, 2006).'),
('78572', 'MH0007', '1072', 'Fluvial (Riverine) Flood', 'A fluvial flood is a rise, usually brief, in the water level of a stream or water body to a peak from which the water level recedes at a slower rate (WMO, 2012).'),
('78573', 'MH0008', '1072', 'Groundwater Flood', 'A groundwater flood is the emergence of groundwater at the ground surface away from perennial river channels or the rising of groundwater into man-made ground, under conditions where the ‘normal’ ranges of groundwater level and groundwater flow are exceeded (BGS, 2010).'),
('78574', 'MH0009', '1072', 'Ice-Jam Flood Including Debris', '<p>An ice jam flood including debris is defined as an accumulation of shuga including ice cakes, below ice cover. It is broken ice in a river which causes a narrowing of the river channel, a rise in water level and local floods (WMO, 2012).</p><p>Shuga is defined as accumulation of spongy white ice lumps, a few centimetres across, formed from grease ice or slush, and sometimes from anchor ice rising to the surface (WMO, 2012).</p>'),
('78575', 'MH0010', '1072', 'Ponding (Drainage) Flood', 'A ponding flood is a flood which results from rainwater ponding at or near the point where it falls because it is falling faster than the drainage system (natural or man-made) can carry it away (WMO, 2006).'),
('78576', 'MH0011', '1072', 'Snowmelt Flood', 'A snowmelt flood is a significant flood rise in a river caused by the melting of snowpack accumulated during the winter (WMO, 2012).'),
('78577', 'MH0012', '1072', 'Surface Water Flooding', 'Surface water flooding is that part of the rain which remains on the ground surface during rain and either runs off or infiltrates after the rain ends, not including depression storage (WMO, 2012).'),
('78578', 'MH0013', '1072', 'Glacial Lake Outburst Flood', 'A ‘glacial lake outburst flood’ is a phrase used to describe a sudden release of a significant amount of water retained in a glacial lake, irrespective of the cause (Emmer, 2017).'),
('78579', 'MH0014', '1073', 'Black Carbon (Brown Clouds)', 'Black carbon refers to the absorbing components of soot, often defined using elemental carbon and some condensed organics. Black carbon is an important part of the combustion product commonly referred to as soot. Black carbon in indoor environments is largely due to cooking with biofuels such as wood, dung and crop residue. Outdoors, it is due to fossil fuel combustion (diesel and coal), open biomass burning (associated with deforestation and crop residue burning), and cooking with biofuels (Ramanathan and Carmichael, 2008).'),
('78580', 'MH0015', '1073', 'Dust storm or Sandstorm', 'A dust storm is an ensemble of particles of dust or sand energetically lifted to great heights by a strong and turbulent wind (WMO, 2017).'),
('78581', 'MH0016', '1073', 'Fog', 'Fog is a suspension of very small, usually microscopic water droplets in the air, reducing visibility at the Earth’s surface (WMO, 2017).'),
('78582', 'MH0017', '1073', 'Haze', 'Haze is a suspension in the air of extremely small, dry particles invisible to the naked eye and sufficiently numerous to give the air an opalescent appearance (WMO, 2017).'),
('78583', 'MH0018', '1073', 'Polluted Air', '<p>Polluted air is air containing dust, smoke, micro-organisms or gases different from those from which it would normally be composed (WMO, 1992).</p><p>Alternative definition: Polluted air is air which contains gases and particles emitted to the atmosphere by a variety of human activities and natural sources, or formed in the atmosphere, that at critical levels have harmful effects on human health, animals, plants and ecosystems, or reduce visibility and corrode materials, buildings and cultural heritage sites (UNEP, no date).</p>'),
('78584', 'MH0019', '1073', 'Sand haze', 'Sand haze is haze caused by the suspension in the atmosphere of small sand or dust particles, raised from the ground prior to the time of observation by a sandstorm or dust storm (WMO, 1992).'),
('78585', 'MH0020', '1073', 'Smoke', 'Smoke is a suspension in the air of small particles produced by combustion (WMO, 2017).'),
('78586', 'MH0021', '1074', 'Ocean Acidification', 'Ocean acidification refers to a reduction in the pH of the ocean over an extended period, which is caused primarily by uptake of carbon dioxide from the atmosphere and can also be caused by other chemical additions or subtractions from the ocean (IPCC, 2011).'),
('78587', 'MH0022', '1074', 'Rogue Wave', 'Rogue waves are extreme waves with overall or crest heights that are abnormally high relative to the background significant wave height (WMO, 2018).'),
('78588', 'MH0023', '1074', 'Sea Water Intrusion', 'Seawater intrusion is the process by which saltwater infiltrates a coastal aquifer, leading to contamination of fresh groundwater (NRC, 2011).'),
('78589', 'MH0024', '1074', 'Sea Ice (Ice Bergs)', 'Sea ice is any form of ice found at sea (WMO, 2015).'),
('78590', 'MH0025', '1074', 'Ice Flow', 'Ice flow is the motion of ice driven by gravitational forces, ice stress or, for sea ice, wind, water currents and tide (AMS, 2012).'),
('78591', 'MH0026', '1074', 'Seiche', 'Seiches are sea-level oscillations at the resonant frequency of enclosed bodies of water (WMO, 2011).'),
('78592', 'MH0027', '1074', 'Storm Surge', 'A storm surge reflects the difference between the actual water level under the influence of a meteorological disturbance (storm tide) and the level which would have occurred in the absence of the meteorological disturbance (i.e., astronomical tide) (WMO, 2008, 2011, 2017).'),
('78593', 'MH0028', '1074', 'Storm Tides', 'A storm tides is the actual sea level as influenced by a weather disturbance. The storm tide consists of the normal astronomical tide plus the storm surge (WMO, 2017).'),
('78594', 'MH0029', '1074', 'Tsunami', 'Tsunami is the Japanese term meaning wave (‘nami’) in a harbour (‘tsu’). It is a series of travelling waves of extremely long length and period, usually generated by disturbances associated with earthquakes occurring below or near the ocean floor (IOC, 2019).'),
('78597', 'MH0032', '1075', 'Sub-Tropical Cyclone', 'A sub-tropical cyclone is a non-frontal low-pressure system that has characteristics of both tropical and extratropical cyclones. Like tropical cyclones, they are non-frontal, synoptic-scale cyclones that originate over tropical or subtropical waters and have a closed surface wind circulation about a welldefined centre (WMO, 2017).'),
('78598', 'MH0033', '1076', 'Acid Rain', 'Acid rain is rain which in the course of its history has combined with chemical elements or pollutants in the atmosphere and reaches the Earth’s surface as a weak acid solution (WMO/UNESCO, 2012).'),
('78599', 'MH0034', '1076', 'Blizzard', 'A blizzard is a severe snow storm characterised by poor visibility, usually occurring at high-latitude and in mountainous regions (WMO, 1992).'),
('78600', 'MH0035', '1076', 'Drought', 'A drought is a period of abnormally dry weather characterised by a prolonged deficiency of precipitation below a certain threshold over a large area and a period longer than a month (WMO, 2020).'),
('78601', 'MH0036', '1076', 'Hail', 'Hail is precipitation in the form of particles of ice (hailstones). These can be either transparent, or partly or completely opaque. They are usually spheroidal, conical or irregular in form, and generally 5−50 mm in diameter. The particles may fall from a cloud either separately or agglomerated in irregular lumps (WMO, 2017).'),
('78602', 'MH0037', '1076', 'Ice Storm', 'An ice storm involves the intense formation of ice on objects by the freezing, on impact, of rain or drizzle (WMO, 1992).'),
('78603', 'MH0038', '1076', 'Snow', 'Snow is the precipitation of ice crystals, isolated or agglomerated, falling from a cloud (WMO, 2017).'),
('78604', 'MH0039', '1076', 'Snow Storm', 'A snow storm is a meteorological disturbance giving rise to a heavy fall of snow, often accompanied by strong winds (WMO, 1992).'),
('78605', 'MH0040', '1077', 'Cold Wave', 'A cold wave is a period of marked and unusual cold weather characterised by a sharp and significant drop in air temperatures near the surface (maximum, minimum and daily average) over a large area and persisting below certain thresholds for at least two consecutive days during the cold season (WMO, 2020).'),
('78606', 'MH0041', '1077', 'Dzud', 'A dzud (a Mongolian term that describes ‘severe winter conditions’’, sometimes spelled zud) is a cold-season disaster in which anomalous climatic (i.e., heavy snow and severe cold) and/or land-surface (snow/ ice cover and lack of pasture) conditions lead to reduced accessibility and/or availability of forage/pastures, and ultimately to high livestock mortality during winter–spring. Severe dzuds (high mortality) result from a combination of growing-season drought and severe weather (Natsagdorj and Dulamsuren, 2001; Nandintsetseg et al., 2017, 2018a,b).'),
('78607', 'MH0042', '1077', 'Freeze', 'A freeze is an air temperature equal to or less than the freezing point of water (D °C) (adapted from WMO, 1992).'),
('78608', 'MH0043', '1077', 'Frost (Hoar Frost)', 'A hoar frost is a deposit of ice produced by the deposition of water vapour from the surrounding air and is generally crystalline in appearance (WMO, 2017).'),
('78609', 'MH0044', '1077', 'Freezing Rain (Supercooled Rain)', 'Freezing rain is rain where the temperature of the water droplets is below 0°C. Drops of supercooled rain may freeze on impact with the ground, in-flight aircraft or other objects (WMO, 2017).'),
('78610', 'MH0045', '1077', 'Glaze', 'Glaze is a smooth compact deposit of ice, generally transparent, formed by the freezing of super-cooled drizzle droplets or raindrops on objects with a surface temperature below or slightly above 0°C (WMO, 2017).'),
('78611', 'MH0046', '1077', 'Ground Frost', 'Ground frost is a covering of ice, in one of its many forms, produced by the sublimation of the water vapour on objects colder than 0°C (WMO, 1992). Ground frost occurs when the temperature of the upper layer of the soil is less than 0°C (WMO, 1992).'),
('78612', 'MH0047', '1077', 'Heatwave', 'A heatwave is a marked warming of the air, or the invasion of very warm air, over a large area; it usually lasts from a few days to a few weeks (WMO, 1992). Alternative definition: A heatwave is a marked unusual period of hot weather over a region persisting for at least two consecutive days during the hot period of the year based on local climatological conditions, with thermal conditions recorded above given thresholds (WMO, 2020).'),
('78613', 'MH0048', '1077', 'Icing (Including Ice)', 'Icing refers to any deposit or coating of ice on an object caused by the impact of liquid hydrometeors, usually supercooled (WMO, 1992).'),
('78614', 'MH0049', '1077', 'Thaw', 'Thaw is the melting of snow or ice at the Earth’s surface due to a temperature rise above 0°C (WMO, 1992).'),
('78615', 'MH0050', '1078', 'Avalanche', 'An avalanche is a mass of snow and ice falling suddenly down a mountain slope and often taking with it earth, rocks and rubble of every description (WMO, 1992).'),
('78616', 'MH0051', '1078', 'Mud Flow', 'A mud flow is a flow of water so heavily charged with sediment and debris that the flowing mass is thick and viscous (WMO and UNESCO, 2012).'),
('78617', 'MH0052', '1078', 'Rock slide', 'A rock slide is a movement of a mass of soil or rock on an individualized failure surface (Dennis and Didier, 2019).'),
('78618', 'MH0053', '1079', 'Derecho', 'Derechos are fast-moving bands of thunderstorms with destructive winds. The winds can be as strong as those found in hurricanes or even tornadoes. Unlike hurricanes and tornadoes, these winds follow straight lines (NOAA, 2019).'),
('78619', 'MH0054', '1079', 'Gale (Strong Gale)', 'A gale is wind with a speed of between 34 and 40 knots (62–74 km/h, 32–38 mph). Also known as Beaufort scale wind force 8 (WMO, 1992).'),
('78620', 'MH0055', '1079', 'Squall', 'A squall is an atmospheric phenomenon characterised by a very large variation of wind speed: it begins suddenly, has a duration of the order of minutes and decreases suddenly in speed. It is often accompanied by a shower or thunderstorm (WMO, 2018).'),
('78621', 'MH0056', '1079', 'Subtropical Storm', 'A subtropical storm is a subtropical cyclone in which the maximum sustained surface wind speed (using the U.S. 1-minute average) is 34 kt (39 mph or 63 km/hr) or more (NOAA, 2019).'),
('78622', 'MH0057', '1079', 'Tropical Cyclone (Cyclonic Wind, Rain [Storm] Surge)', '<p>A tropical cyclone is a cyclone of tropical origin of small diameter (some hundreds of kilometres) with a minimum surface pressure in some cases of less than 900 hPa, very violent winds and torrential rain; sometimes accompanied by thunderstorms. It usually contains a central region, known as the ‘eye’ of the storm, with a diameter of the order of some tens of kilometres, and with light winds and a more or less lightly clouded sky (WMO, 2017).</p><p>Alternative definition: A tropical cyclone is a warm-core, non-frontal synoptic-scale cyclone, originating over tropical or subtropical waters, with organised deep convection and closed surface wind circulation about a well-defined centre (WMO, 2017).</p>'),
('78641', 'TL0007', '1086', 'Structural Failure', 'Structural failure corresponds to the exceedance of ultimate limit state in many of the load-carrying elements, which compromise the structural stability of the building (Rossetto, 2013).'),
('78623', 'MH0058', '1079', 'Tropical Storm', '<p>A tropical storm is a rapid rotating storm originating over tropical oceans. It has a low pressure centre and clouds spiralling towards the eyewall surrounding the ‘eye’. Its diameter is typically around 200 to 500 km, but can reach 1000 km. The related hazards are very violent winds, torrential rain, high waves, storm surges and in some cases tornadoes, causing direct effects such as flash floods, flooding, coastal inundation, and indirect effects such as landslides and mudslides. The winds blow anti-clockwise in the Northern Hemisphere and clockwise in the Southern Hemisphere (WMO, 2020).</p><p>The intensity of tropical storms is based on the wind speed. A tropical storm is a tropical cyclone with the maximum sustained winds of 34 knots (17.5 m/s, 63 km/h) to 47 knots (24.2 m/s, 87 km/h) near the centre. When reaching this intensity, they are named in the interests of public safety (WMO, 2021).</p>'),
('78624', 'MH0059', '1079', 'Tornado', 'A tornado is a rotating column of air, extending from the base of a cumuliform cloud, and often visible as a condensation funnel in contact with the ground, and/or attendant circulating dust or debris cloud at the ground (WMO, 2017).'),
('78625', 'MH0060', '1079', 'Wind', 'Wind is air motion relative to the Earth’s surface. Unless otherwise specified, only the horizontal component is considered (WMO, 1992).'),
('78626', 'SO0001', '1080', 'International Armed Conflict (IAC)', 'International armed conflict covers all cases of declared war and other de facto armed conflict between two or more States, even if the state of war is not recognised by one of them and/or the use of armed force is unilateral (ICRC, 2016).'),
('78627', 'SO0002', '1080', 'Non-International Armed Conflict (NIAC)', 'Non-international armed conflict is defined as protracted armed confrontations occurring between governmental armed forces and the forces of one or more armed groups, or between such groups arising on the territory of a State. The armed confrontation must reach a minimum level of intensity, and the parties involved in the conflict must show a minimum of organisation (ICRC, 2008).'),
('78628', 'SO0003', '1080', 'Civil Unrest', '<p>‘Civil unrest’ is an umbrella term for a wide spectrum of phenomena, and although there is no commonly agreed United Nations definition the term is used widely among United Nations agencies, funds and programmes, particularly to describe violent and non-violent group acts.</p><p>A suggested definition for ‘civil unrest’ is as follows: a term that includes limited political violence (such as acts of ‘terrorism’, individual assassinations, etc.), sporadic violent collective action (such as riots), or nonviolent and mildly violent collective action (such as protests, demonstrations, etc.) – all of which tend to take place in times of peace (Kalyvas, 2000:3).</p>'),
('78629', 'SO0004', '1081', 'Explosive Remnants of War', 'Explosive remnants of war are unexploded ordnance and abandoned explosive ordnance that are left by a party to an armed conflict following the cessation of warfare. Explosive ordnance is defined as conventional munitions containing explosives (United Nations, 2004:2).'),
('78630', 'SO0005', '1081', 'Environmental Degradation from Conflict', 'Environmental degradation from conflict is defined as the reduction of the capacity of the environment to meet social and ecological objectives and needs (UNISDR, 2009:6).'),
('78631', 'SO0006', '1082', 'Violence', 'Violence refers to the intentional or unintentional use of force whether physical or psychological, threatened or actual, against an individual, oneself, or against a group of people, a community, or a government. Violence can either be targeted or indiscriminate, motivated by certain aims, including political, religious, social, economic, ethnic, racial, or gender-based, or unintentional and can be initiated with the aim to directly or indirectly inflict harm, injury or death (Krug et al., 2002). Armed as well as non-armed forms of violence can occur both in conflict and non-conflict settings. Violence has been explicitly identified as a significant public health problem (Rutherford et al., 2007).'),
('78632', 'SO0007', '1082', 'Stampede or Crushing (Human)', 'Stampede or crushing is the surge of individuals in a crowd, in response to a perceived danger or loss of physical space. It often disrupts the orderly movement of crowds resulting in irrational and dangerous movement for self-protection leading to injuries and fatalities (Illiyas et al., 2013).'),
('78633', 'SO0008', '1083', 'Financial shock', 'A financial shock is an unexpected disturbance which originates from the financial sector and has a significant effect on an economy (e.g. national, regional, or global). The term is largely used to refer to events which have negative impacts (ECB, 2013).'),
('78634', 'TL0001', '1084', 'Radioactive Waste', '<p>Radioactive waste is radioactive material for which no further use is foreseen but still contains, or is contaminated with, radionuclides. Radioactive waste can be in gas, liquid or solid form (IAEA, 2018). It may remain radioactive from a few hours to hundreds of thousands of years.</p><p>N.B. For regulatory purposes radioactive waste is defined as material with activity concentrations greater than the clearance levels set by the regulatory authority (IAEA 2018).</p>'),
('78635', 'TL0002', '1084', 'Radioactive Material', 'A substance or a material emitting, or related to the emission of, ionising radiation (either in the form of electromagnetic waves or particle radiation) is radioactive (IAEA, 2018).'),
('78636', 'TL0003', '1085', 'Radiation Agents', 'A substance or a material emitting, or related to the emission of, ionizing radiation (either in the form of electro-magnetic waves or particle radiation) is radioactive. Depending on the magnitude of exposure, the radioactive substance may become a hazard to human health; as such it is subject to regulatory control by national laws and national regulatory authorities. Radioactive material may also be hazard to animal health, other forms of life and the environment (IAEA, 2018).'),
('78637', 'TL0004', '1085', 'Nuclear agents', 'Nuclear agents are derived from neutron radiation (n) which is a neutron emitted by an unstable nucleus, in particular during atomic fission and nuclear fusion. Apart from a component in cosmic rays, neutrons are usually produced artificially. Because they are electrically neutral particles, neutrons can be very penetrating and when they interact with matter or tissue, they cause the emission of beta- and gamma-radiation. Neutron radiation therefore requires heavy shielding to reduce exposure (IAEA, 2004).'),
('78638', 'TL0053', '1085', 'Explosive agents', 'Explosive agents include improvised explosive devices (IEDs) which can be made anywhere from a wide range of materials – from everyday tools, to conventional explosives, to commercial explosives used in construction and mining. They are cheap and relatively easy to construct (UNODA, 2014).'),
('78639', 'TL0005', '1086', 'Building Collapse', 'Building collapse is the failure of load-bearing structural elements, causing a building to fall or fail catastrophically / catastrophic failure (adapted from US Department of Labor, no date).'),
('78640', 'TL0006', '1086', 'Building, highrise, cladding', 'A building high-rise cladding fire hazard occurs when combustible materials such as cladding on a high-rise building greatly increases risk in the event of a fire and can have a catastrophic outcome (adapted from Rockpanel, no date)'),
('78642', 'TL0008', '1086', 'Bridge Failure', 'Bridge failure is the inability of a bridge, or its components, to perform as specified by its design and construction requirements (Wardhana and Hadipriono, 2003). Note: This definition includes bridges that have totally collapsed, partially collapsed and those that experienced distress, such as, exhibiting excessive deformation.'),
('78643', 'TL0009', '1086', 'Dam Failure', 'Dam failure is the collapse or movement of part of a dam or its foundation, such that the dam cannot retain water. In general, a failure results in a release of large quantities of water imposing risks on the people or property downstream (ICOLD, 2015).'),
('78644', 'TL0010', '1086', 'Supply Chain Failure', 'Supply chain failure refers to an event in the supply chain that disrupts the flow of materials on their journey from initial suppliers through to final customers (Walters, 2007).'),
('78645', 'TL0011', '1086', 'Critical Infrastructure Failure', 'Critical Infrastructure failure is defined as the failure in one or more of the physical structures, facilities, networks and other assets which provide services that are essential to the social and economic functioning of a community or society (UNGA, 2016).'),
('78646', 'TL0012', '1087', 'Nuclear Plant Failure', 'Nuclear plant failure occurs when the accidental melting of the core of a nuclear reactor results in either the core to have a complete or partial collapse (adapted from USNRC, 1975).'),
('78647', 'TL0013', '1087', 'Power Outage/ or Blackout', 'In the electric power domain, especially in power transmission and distribution, a power outage usually refers to a partial or total loss of power supply to some end user (e.g., population, enterprises, critical systems). Triggering factors may include accidents, equipment breakdowns, failure of control mechanisms, targeted attacks (physical or cyber), organisational errors, and natural hazards (adapted from Pescaroli et al., 2017; UK Cabinet Office, 2017; EIS Council, 2019; and FEMA, 2018).'),
('78648', 'TL0014', '1087', 'Emergency Telecommunications Failure', 'Emergency telecommunications failure is an umbrella term for telecommunications of an ‘extraordinary nature’ under abnormal and potentially adverse network conditions (ITU, 2007).'),
('78649', 'TL0015', '1087', 'Water Supply Failure', '<p>Water supply failure is the physical shortage or scarcity in access of water supply due to the failure of institutions to ensure a regular supply or due to a lack of adequate infrastructure (adapted from UN-Water, no date).</p><p>Alternative definition: Water supply systems are networks whose edges and nodes are pressure pipes and either pipe junctions, water sources or end-users. Water supply systems are designed to protect the customer from natural biological contamination, and the same systems have potential efficacy against deliberate biological and chemical contamination (adapted from Franchin and Cavalieri, 2013; and Jain et al., 2014).</p>'),
('78650', 'TL0016', '1087', 'Radio and Other Telecommunication Failures', 'Radio and other telecommunication failures can be said to occur when there is internal or external interruption of communications by either party that results in difficult to transport the message as it was intended (adapted from Dainty et al., 2007).'),
('78651', 'TL0017', '1088', 'Misconfiguration of Software and Hardware', 'Misconfiguration of software and hardware is the incorrect or suboptimal configuration of an information system or system component that may lead to vulnerabilities (NIST, no date).'),
('78652', 'TL0018', '1088', 'Non-Conformity and Interoperability', '<p>Conformity assessment: activity that provides demonstration that specified requirements relating to a product, process, system, person or body are fulfilled (NIST Information Technology Laboratory, no date).</p><p>For the purposes of this standard, interoperability allows any government facility or information system, regardless of the personal Identity verification (PIV) Issuer, to verify a cardholder’s identity using the credentials on the PIV Card (NIST, no date).</p>'),
('78653', 'TL0019', '1088', 'Malware', 'Malware is a summary term for different forms of malevolent software designed to infiltrate and infect computers, typically without the knowledge of the owner (ITU, 2008).'),
('78654', 'TL0020', '1088', 'Data Breach', 'A data breach is a compromise of security that leads to the accidental or unlawful destruction, loss, alteration, unauthorised disclosure of, or access to protected data transmitted, stored, or otherwise processed (ICO, no date).'),
('78655', 'TL0021', '1088', 'Data Security-Related Hazards', 'Data security is related to the preservation of data to guarantee availability, confidentiality and data integrity. Data security-related hazards include risks arising from increased system complexity because this provides opportunities for malicious cyberattacks and data loss in the case of serious incidents, including natural disasters (ITU, 2017).'),
('78656', 'TL0023', '1088', 'Outage', 'A cyber outage is the unavailability of a service or resource (ITU, 1996).'),
('78657', 'TL0024', '1088', 'Personally Identifiable Information (PII) Breach', 'A personally identifiable information (PII) breach is a situation where PII is processed in violation of one or more relevant PII protection requirements (ITU, 2018).'),
('78658', 'TL0025', '1088', 'Internet of Things (IOT)-Related Hazards', '<p>The Internet of Things (IoT) is a global infrastructure for the information society, enabling advanced services by interconnecting (physical and virtual) things based on existing and evolving interoperable information and communication technologies (ITU, 2012).</p><p>NOTE 1: Through the exploitation of identification, data capture, processing and communication capabilities, the IoT makes full use of things to offer services to all types of applications, while ensuring that security and privacy requirements are fulfilled.</p><p>NOTE 2: From a broader perspective, the IoT can be perceived as a vision with technological and societal implications.</p><p>The IoT is a relatively new technology that is a hazard if a data security or breach occurs.</p>'),
('78659', 'TL0026', '1088', 'Cyberbullying', 'Cyberbullying is bullying that takes place using digital devices such as cell/mobile phones, computers, and tablets. Cyberbullying can occur through SMS, e-mail, apps, social media, forums, or gaming when people view, participate in, or share content. Cyberbullying includes the deliberate sending, posting, or sharing of negative, harmful, false, or mean content about someone else. It can include sharing personal or private information about someone else causing embarrassment or humiliation. Some cyberbullying may also be unlawful or criminal behaviour (US Government, 2020).'),
('78660', 'TL0027', '1089', 'Natech', 'Natural hazard triggered technological accident (Showalter et al., 1994).'),
('78661', 'TL0028', '1089', 'Pollution', 'Pollution is defined as the presence of substances and/or heat in environmental media (air, water, land) whose nature, location, or quantity produces undesirable environmental effects (UN data, no date). Alternative definition: Pollution is defined as activity that generates pollutants (UN data, no date).'),
('78662', 'TL0029', '1089', 'Explosion', 'Explosion-related technological incidents can be defined as accidental or intentional events that result in the actual or potential exposure of responders and/or members of the public to a chemical hazard (adapted from WHO, no date).'),
('78663', 'TL0030', '1089', 'Leaks and Spills', 'A leak or a spill is an incident involving the uncontrolled release of a toxic substance, potentially resulting in harm to public health and the environment. Chemical incidents can occur as a result of natural events, or as a result of accidental or intentional events. These incidents can be sudden and acute or have a slow onset when there is a ‘silent’ release of a chemical. Chemical leaks and spills can range from small releases to full-scale major emergencies (adapted from WHO, 2020).'),
('78664', 'TL0031', '1089', 'Soil Pollution', 'Soil pollution refers to the presence of a chemical or substance out of place and/or present in a soil at higher than normal concentration that has adverse effects on any non-targeted organism (Rodríguez-Eugenio et al., 2018).'),
('78665', 'TL0032', '1089', 'Fire', 'Fire related technological incidents can be defined as accidental or intentional events that result in the actual or potential exposure of responders and/or members of the public to a chemical hazard (adapted from WHO, no date)'),
('78666', 'TL0033', '1089', 'Mining Hazards', 'Mining hazards can be defined as having major environmental impacts including the production of waste, release of toxic and hazardous waste, air pollution and emissions, water pollution and depletion, and the loss of productive land and ecosystems (adapted from UNDP and UN Environment, 2018).'),
('78667', 'TL0034', '1089', 'Safety Hazards Associated with Oil and Gas', '<p>Oil and gas extraction, and associated servicing activities involve many types of equipment and materials. Identifying and controlling hazards is critical to preventing injuries and deaths (US Department of Labor, no date).</p><p>Alternative definition: For the purpose of the C155 - Occupational Safety and Health Convention, 1981 (No. 155) (ILO, 1981):</p><p>a) the term branches of economic activity covers all branches in which workers are employed, including the public service.</p><p>b) the term workers covers all employed persons, including public employees.</p><p>c) the term workplace covers all places where workers need to be or to go by reason of their work and which are under the direct or indirect control of the employer.</p><p>d) the term regulations covers all provisions given force of law by the competent authority or authorities.</p><p>e) the term health, in relation to work, indicates not merely the absence of disease or infirmity; it also includes the physical and mental elements affecting health which are directly related to safety and hygiene at work.</p>'),
('78668', 'TL0035', '1090', 'Disaster Waste', 'Disaster waste is the waste generated by the impact of a disaster, both as a direct effect of the disaster as well as in the post-disaster phase as a result of poor waste management (UNEP/OCHA, 2011).'),
('78669', 'TL0036', '1090', 'Solid Waste', 'Solid waste covers discarded materials that are no longer required by the owner or user. Solid waste includes materials that are in a solid or liquid state but excludes wastewater and small particulate matter released into the atmosphere (United Nations, 2014).'),
('78670', 'TL0037', '1090', 'Wastewater', 'Wastewater is regarded as a combination of one or more of the following materials: domestic effluent consisting of ‘blackwater’ (excreta, urine and faecal sludge, contaminants from pharmaceutical and personal care products) and ‘greywater’ (used water from washing and bathing); water from commercial establishments and institutions, including hospitals; industrial effluent, stormwater and other urban runoff; and agricultural, horticultural and aquaculture runoff (UN Water, 2017).'),
('78671', 'TL0038', '1090', 'Hazardous Waste', 'Hazardous waste is waste that has physical, chemical, or biological characteristics such that it requires special handling and disposal procedures to avoid negative health effects, adverse environmental effects or both (Joint UNEP/OCHA Environment Unit, 2011).'),
('78672', 'TL0039', '1090', 'Plastic Waste', 'Plastic is a generic term used in the case of polymeric material that may contain other substances to improve performance and/or reduce costs, with plastic waste almost exclusively comprising one non-halogenated polymer and waste substances or objects which are disposed of or are intended to be disposed of or are required to be disposed of by the provisions of national law (adapted from Basel Convention, 1989; and Basel Convention Secretariat, 2019).'),
('78673', 'TL0041', '1090', 'Electronic Waste (E-Waste)', 'Electrical and electronic waste, or E-waste, refers to electrical or electronic equipment that is waste, including all components, subassemblies and consumables that are part of the equipment at the time the equipment becomes waste (UNEP, 2019).'),
('78674', 'TL0042', '1090', 'Healthcare Risk Waste', 'Healthcare waste includes waste generated within healthcare facilities, research centres and laboratories related to medical procedures and medical equipment. It also includes waste originating from minor and scattered healthcare sources, including waste produced in the course of emergency medical treatment or health care undertaken in the home (e.g., home dialysis, self-administration of insulin, recuperative care) (WHO, 2014).'),
('78675', 'TL0043', '1090', 'Landfilling', 'Landfilling is the final placement of waste into or onto the land in a controlled way. The definition covers both landfilling at internal sites (i.e., where a generator of waste is carrying out its own waste disposal at the place of generation) and at external sites (United Nations, 2016).'),
('78676', 'TL0044', '1090', 'Tailings', 'Tailings are a common by-product of the mineral recovery process. They usually take the form of a liquid slurry made of fine mineral particles (created when mined ore is crushed, ground and processed) and water (ICMM, 2019).'),
('78677', 'TL0045', '1090', 'Waste Treatment Lagoons', 'Waste [treatment] lagoons can be defined as impoundments made by excavation or earth fill for biological treatment of animal and other agricultural waste (Spellman and Bieber, 2012).'),
('78678', 'TL0040', '1091', 'Marine Debris', 'Marine debris is any persistent, manufactured or processed solid material discarded, disposed of or abandoned in the marine and coastal environment. Marine litter consists of items that have been made or used by people and deliberately discarded into the sea or rivers or on beaches; brought indirectly to the sea with rivers, sewage, storm water or winds; or accidentally lost, including material lost at sea in bad weather (adapted from UN Environment, no date; and NOAA, no date).'),
('78679', 'TL0046', '1092', 'Drain and Sewer Flooding', 'Drain and sewer flooding is said to occur when sewage or foul water leaks from the sewerage system (through pipes, drains or manholes) or floods up through toilets, sinks or showers inside a building (Priestly, 2016).'),
('78680', 'TL0047', '1092', 'Reservoir Flooding', 'A reservoir is an artificial lake where water is stored (National Geographic, 2020). Reservoir flooding occurs when excess rainfall causes the lake level to rise or flood water to spill downstream.'),
('78681', 'TL0048', '1093', 'Air Transportation Accident', 'An air transportation accident is defined as an occurrence associated with the operation of an aircraft which takes place between the time any person boards the aircraft with the intention of flight until such time as all such persons have disembarked, in which one of the following applies: a person is fatally or seriously injured, the aircraft sustains damage or structural failure, and the aircraft is missing or is completely inaccessible (United Nations, European Union and the International Transport Forum at the OECD, 2019:119).'),
('78682', 'TL0049', '1093', 'Inland Water Ways', 'An inland waterway transportation accident is an unwanted or unintended sudden event or a specific chain of such events occurring in connection with inland water vessel operations, which have harmful consequences (United Nations, European Union and the International Transport Forum at the OECD, 2019).'),
('78683', 'TL0050', '1093', 'Marine Accident', 'A marine accident is an event, or a sequence of events, that has resulted in any of the following occurring directly in connection with the normal operation of a marine vessel: the death of, or serious injury to, a person; the loss of a person from a ship; the loss, presumed loss or abandonment of a marine vessel; material damage to a marine vessel; the stranding or disabling of a marine vessel, or the involvement of a marine vessel in a collision; material damage to the marine infrastructures external to a vessel, that could seriously endanger the safety of the vessel or another vessel or an individual; and severe damage to the environment, or the potential for severe damage to the environment, brought about by the damage of a marine vessel (United Nations, European Union and the International Transport Forum at the OECD, 2019).'),
('78684', 'TL0051', '1093', 'Rail Accident', 'A rail accident is an unwanted or unintended sudden event or a specific chain of such events (occurring during train operation) which has harmful consequences (United Nations, European Union and the International Transport Forum at the OECD, 2019).'),
('78685', 'TL0052', '1093', 'Road Traffic Accident', 'A road traffic accident is any accident involving at least one road vehicle in motion on a public road or private road to which the public has right of access, resulting in at least one injured or killed person (United Nations, European Union and the International Transport Forum at the OECD, 2019).'),
('81041', 'TL0022', '1088', 'Disrupt', '<p>A service procedure is disrupted by another service if the second service results in service primitives of the first service not being used as specified for the procedure of the first service (ITU, 2012)</p>');

-- Update Version No
DELETE FROM public.dts_system_info;

INSERT INTO
	public.dts_system_info (id, version_no)
VALUES
	('73f0defb-4eba-4398-84b3-5e6737fec2b7', '0.1.1');

 -- Create the initial super admin user
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA public;
SET search_path = public;

INSERT INTO public.super_admin_users(
	first_name, last_name, email, password)
	VALUES ('admin', 'admin', 'admin@admin.com', crypt('pvDT0g8Qsa36', gen_salt('bf', 10)));

