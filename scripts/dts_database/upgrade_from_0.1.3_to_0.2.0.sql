ALTER TABLE instance_system_settings
ADD COLUMN IF NOT EXISTS language VARCHAR(10) NOT NULL DEFAULT 'en';

-- This migration converts text-based name and description fields to JSONB localized maps with language support.
--
-- For each affected column:
-- - Non-empty values (e.g., 'Flood') become {"en": "Flood"}
-- - NULL or empty/blank strings remain as {} (no "en" key)
-- - New column is NOT NULL with DEFAULT '{}'
--
-- Renames columns to remove 'En' suffix.
-- Tables affected: hip_cluster, hip_hazard, hip_class, asset, sector.

-- hip_cluster.name_en -> name
ALTER TABLE public.hip_cluster ADD COLUMN name JSONB DEFAULT '{}'::jsonb NOT NULL;
UPDATE public.hip_cluster
SET name = jsonb_build_object('en', name_en)
WHERE name_en IS NOT NULL;
-- Will do in later migration to allow rollback for now.
-- ALTER TABLE public.hip_cluster DROP COLUMN name_en;

-- hip_hazard.name_en -> name
ALTER TABLE public.hip_hazard ADD COLUMN name JSONB DEFAULT '{}'::jsonb NOT NULL;
UPDATE public.hip_hazard
SET name = jsonb_build_object('en', name_en)
WHERE name_en IS NOT NULL;
-- Will do in later migration to allow rollback for now.
-- ALTER TABLE public.hip_hazard DROP COLUMN name_en;

-- hip_hazard.description_en -> description
ALTER TABLE public.hip_hazard ADD COLUMN description JSONB DEFAULT '{}'::jsonb NOT NULL;
UPDATE public.hip_hazard
SET description = jsonb_build_object('en', description_en)
WHERE description_en IS NOT NULL;
-- Will do in later migration to allow rollback for now.
-- ALTER TABLE public.hip_hazard DROP COLUMN description_en;

-- hip_type.name_en -> name
ALTER TABLE public.hip_class ADD COLUMN name JSONB DEFAULT '{}'::jsonb NOT NULL;
UPDATE public.hip_class
SET name = jsonb_build_object('en', name_en)
WHERE name_en IS NOT NULL;
-- Will do in later migration to allow rollback for now.
-- ALTER TABLE public.hip_class DROP COLUMN name_en;

-- asset.name -> built_in_name and custom_name
ALTER TABLE public.asset ADD COLUMN built_in_name JSONB DEFAULT '{}'::jsonb NOT NULL;
UPDATE public.asset SET built_in_name = jsonb_build_object('en', name) WHERE is_built_in IS TRUE AND name IS NOT NULL;
ALTER TABLE public.asset RENAME COLUMN name TO custom_name;
-- Will do in later migration to allow rollback for now.
-- UPDATE public.asset SET custom_name = NULL WHERE is_built_in IS TRUE;

-- asset.category -> built_in_category and custom_category
ALTER TABLE public.asset ADD COLUMN built_in_category JSONB DEFAULT '{}'::jsonb NOT NULL;
UPDATE public.asset SET built_in_category = jsonb_build_object('en', category) WHERE is_built_in IS TRUE AND category IS NOT NULL;
ALTER TABLE public.asset RENAME COLUMN category TO custom_category;
-- Will do in later migration to allow rollback for now.
-- UPDATE public.asset SET custom_category = NULL WHERE is_built_in IS TRUE;

-- asset.notes -> built_in_notes and custom_notes
ALTER TABLE public.asset ADD COLUMN built_in_notes JSONB DEFAULT '{}'::jsonb NOT NULL;
UPDATE public.asset SET built_in_notes = jsonb_build_object('en', notes) WHERE is_built_in IS TRUE AND notes IS NOT NULL;
ALTER TABLE public.asset RENAME COLUMN notes TO custom_notes;
-- Will do in later migration to allow rollback for now.
-- UPDATE public.asset SET custom_notes = NULL WHERE is_built_in IS TRUE;

-- sector.sectorname -> name
ALTER TABLE public.sector ADD COLUMN name JSONB DEFAULT '{}'::jsonb NOT NULL;
UPDATE public.sector
SET name = jsonb_build_object('en', sectorname)
WHERE sectorname IS NOT NULL;
-- Will do in later migration to allow rollback for now.
-- ALTER TABLE public.sector DROP COLUMN sectorname;

-- sector.description
ALTER TABLE public.sector RENAME COLUMN description TO description_old;
ALTER TABLE public.sector ADD COLUMN description JSONB DEFAULT '{}'::jsonb NOT NULL;
UPDATE public.sector
SET description = jsonb_build_object('en', description_old)
WHERE description_old IS NOT NULL;
-- Will do in later migration to allow rollback for now.
-- ALTER TABLE public.sector DROP COLUMN description_old;

-- categories.name
ALTER TABLE public.categories RENAME COLUMN name TO name_old;
ALTER TABLE public.categories ADD COLUMN name JSONB DEFAULT '{}'::jsonb NOT NULL;
UPDATE public.categories
SET name = jsonb_build_object('en', name_old)
WHERE name_old IS NOT NULL;
-- Will do in later migration to allow rollback for now.
-- ALTER TABLE public.categories DROP COLUMN name_old;

-- Store last update timestamp
ALTER TABLE dts_system_info
ADD COLUMN last_translation_import_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

CREATE OR REPLACE FUNCTION public.dts_jsonb_localized(
    data jsonb,
    lang text
)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(
    data->>lang,
    data->>'en',
		''
  )
$$;

DROP FUNCTION public.dts_get_sector_all_idonly(param_sector_id uuid);

CREATE FUNCTION public.dts_get_sector_all_idonly(param_sector_id uuid) RETURNS uuid[]
    LANGUAGE plpgsql
    AS $$BEGIN
	RETURN ARRAY(
		WITH RECURSIVE ParentCTE AS (
			-- Start from the child node
			SELECT id, parent_id
			FROM sector
			WHERE id = param_sector_id
			UNION ALL
			-- Recursively find parents
			SELECT s.id, s.parent_id
			FROM sector s
			INNER JOIN ParentCTE p ON s.id = p.parent_id
		),
		ChildCTE AS (
			-- Find all descendants (children)
			SELECT id, parent_id
			FROM sector
			WHERE id = param_sector_id
			UNION ALL
			SELECT t.id, t.parent_id
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

DROP FUNCTION public.dts_get_sector_ancestors_decentants(uuid);

CREATE FUNCTION public.dts_get_sector_ancestors_descendants(lang text, sector_id uuid) RETURNS json
		LANGUAGE sql
    AS $$
WITH RECURSIVE ParentCTE AS (
    -- Find all ancestors (parents)
    SELECT id, dts_jsonb_localized(name, lang) as sectorname, parent_id, level
    FROM sector
    WHERE id = sector_id
    UNION ALL
    SELECT t.id, dts_jsonb_localized(t.name, lang) as sectorname, t.parent_id, t.level
    FROM sector t
    INNER JOIN ParentCTE p ON t.id = p.parent_id
),
ChildCTE AS (
    -- Find all descendants (children)
    SELECT id, dts_jsonb_localized(name, lang) as sectorname, parent_id, level
    FROM sector
    WHERE id = sector_id
    UNION ALL
    SELECT t.id, dts_jsonb_localized(t.name, lang) as sectorname, t.parent_id, t.level
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


DROP FUNCTION public.dts_get_sector_decendants(sector_id uuid);

CREATE FUNCTION public.dts_get_sector_descendants(lang text, sector_id uuid) RETURNS json
    LANGUAGE sql
    AS $$
WITH RECURSIVE ChildCTE AS (
    -- Find all descendants (children)
    SELECT id, dts_jsonb_localized(name, lang) as sectorname, parent_id, level
    FROM sector
    WHERE id = sector_id
    UNION ALL
    SELECT t.id, dts_jsonb_localized(t.name, lang) as sectorname, t.parent_id, t.level
    FROM sector t
    INNER JOIN ChildCTE c ON t.parent_id = c.id
)
SELECT json_agg(row_to_json(all_records))
FROM (
    SELECT id, sectorname, level FROM ChildCTE
) all_records;
$$;


DROP FUNCTION public.dts_get_sector_parent_idonly(param_sector_id uuid);

CREATE FUNCTION public.dts_get_sector_parent_idonly(param_sector_id uuid) RETURNS uuid[]
    LANGUAGE plpgsql
    AS $$BEGIN
	RETURN ARRAY(
		WITH RECURSIVE ParentCTE AS (
		  -- Start from the child node
		  SELECT id, parent_id
		  FROM sector
		  WHERE id = param_sector_id

		  UNION ALL

		  -- Recursively find parents
		  SELECT s.id, s.parent_id
		  FROM sector s
		  INNER JOIN ParentCTE p ON s.id = p.parent_id
		)
		SELECT id FROM ParentCTE
	);
END;
$$;

CREATE OR REPLACE FUNCTION public.dts_jsonb_localized(data jsonb, lang text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  base_lang text := lang;
  is_debug  boolean := false;
  result    text;
BEGIN
	-- Detect and strip '-debug' suffix
  IF lang LIKE '%-debug' THEN
    base_lang := substring(lang FOR length(lang) - 6); 
    is_debug  := true;
  END IF;

  -- Resolve the string
  result := COALESCE(data->>base_lang, data->>'en', '');

  -- Append language tag if needed
  IF is_debug THEN
    result := result || ' [' || base_lang || ']';
  END IF;

  RETURN result;
END;
$$;


ALTER TABLE hip_class DROP CONSTRAINT name_en_not_empty;
ALTER TABLE hip_cluster DROP CONSTRAINT name_en_not_empty;
ALTER TABLE hip_hazard DROP CONSTRAINT name_en_not_empty;
ALTER TABLE hip_hazard DROP CONSTRAINT description_en_not_empty;

ALTER TABLE hip_class
ADD CONSTRAINT name_en_not_empty
CHECK ((name->>'en') IS NOT NULL AND TRIM(COALESCE((name->>'en'), '')) <> '');

ALTER TABLE hip_cluster
ADD CONSTRAINT name_en_not_empty
CHECK ((name->>'en') IS NOT NULL AND TRIM(COALESCE((name->>'en'), '')) <> '');

ALTER TABLE hip_hazard
ADD CONSTRAINT name_en_not_empty
CHECK ((name->>'en') IS NOT NULL AND TRIM(COALESCE((name->>'en'), '')) <> '');

ALTER TABLE hip_hazard
ADD CONSTRAINT description_en_not_empty
CHECK ((description->>'en') IS NOT NULL AND TRIM(COALESCE((description->>'en'), '')) <> '');

UPDATE dts_system_info
SET version_no = '0.2.0',
updated_at = NOW();