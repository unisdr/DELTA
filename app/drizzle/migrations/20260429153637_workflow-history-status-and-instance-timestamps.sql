-- Custom SQL migration file, put your code below! --

BEGIN;

-- workflow_history: drop legacy from_status and rename to_status -> status
ALTER TABLE IF EXISTS public.workflow_history
	DROP COLUMN IF EXISTS from_status;

DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
		  AND table_name = 'workflow_history'
		  AND column_name = 'to_status'
	) THEN
		ALTER TABLE public.workflow_history
			RENAME COLUMN to_status TO status;
	END IF;
END
$$;

-- workflow_instance: add lifecycle timestamps
ALTER TABLE IF EXISTS public.workflow_instance
	ADD COLUMN IF NOT EXISTS drafted_at timestamp,
	ADD COLUMN IF NOT EXISTS rejected_at timestamp,
	ADD COLUMN IF NOT EXISTS revision_requested_at timestamp;

-- Initialize drafted_at for existing draft rows where missing
UPDATE public.workflow_instance
SET drafted_at = COALESCE(drafted_at, created_at)
WHERE status = 'draft'::public.workflow_status
  AND drafted_at IS NULL;

COMMIT;