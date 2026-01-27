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

