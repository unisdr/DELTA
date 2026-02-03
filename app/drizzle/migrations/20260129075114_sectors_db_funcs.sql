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

