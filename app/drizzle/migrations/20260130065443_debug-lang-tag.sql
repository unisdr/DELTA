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
