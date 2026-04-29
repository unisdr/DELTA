-- Custom SQL migration file, put your code below! --

BEGIN;

-- Phase 1: Create new workflow schema

-- Create workflow_status enum type
CREATE TYPE public.workflow_status AS ENUM (
    'draft',
    'submitted',
    'revision_requested',
    'approved',
    'rejected',
    'published'
);

-- Create workflow_instance table
CREATE TABLE IF NOT EXISTS public.workflow_instance (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    entity_id uuid NOT NULL,
    entity_type text NOT NULL CHECK (entity_type IN ('hazardous_event', 'disaster_event')),
    status public.workflow_status NOT NULL DEFAULT 'draft',
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP,
    submitted_at timestamp,
    approved_at timestamp,
    published_at timestamp,
    UNIQUE(entity_type, entity_id)
);

-- Create workflow_history table
CREATE TABLE IF NOT EXISTS public.workflow_history (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    workflow_instance_id uuid NOT NULL REFERENCES public.workflow_instance (id) ON DELETE CASCADE,
    from_status public.workflow_status,
    to_status public.workflow_status NOT NULL,
    action_by uuid REFERENCES public."user" (id),
    comment text,
    created_at timestamp NOT NULL DEFAULT now()
);

-- Create workflow_notified table
CREATE TABLE IF NOT EXISTS public.workflow_notified (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    workflow_instance_id uuid NOT NULL REFERENCES public.workflow_instance (id) ON DELETE CASCADE,
    notified_user_id uuid REFERENCES public."user" (id),
    notified_by_user_id uuid REFERENCES public."user" (id),
    notified_at timestamp NOT NULL DEFAULT now(),
    notification_message text
);

-- Create indexes for workflow_instance
CREATE INDEX IF NOT EXISTS idx_workflow_entity ON public.workflow_instance(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_workflow_status ON public.workflow_instance(status);

-- Phase 2: Backfill data from existing records

-- Backfill workflow_instance for hazardous_event records
INSERT INTO public.workflow_instance (entity_id, entity_type, status, created_at, updated_at, submitted_at, approved_at, published_at)
SELECT
    id,
    'hazardous_event'::text,
    CASE 
        WHEN approval_status = 'draft' THEN 'draft'::public.workflow_status
        WHEN approval_status = 'waiting-for-validation' THEN 'submitted'::public.workflow_status
        WHEN approval_status = 'needs-revision' THEN 'revision_requested'::public.workflow_status
        WHEN approval_status = 'validated' THEN 'approved'::public.workflow_status
        WHEN approval_status = 'published' THEN 'published'::public.workflow_status
        ELSE 'draft'::public.workflow_status
    END,
    created_at,
    updated_at,
    submitted_at,
    validated_at,
    published_at
FROM public.hazardous_event
ON CONFLICT DO NOTHING;

-- Backfill workflow_instance for disaster_event records
INSERT INTO public.workflow_instance (entity_id, entity_type, status, created_at, updated_at, submitted_at, approved_at, published_at)
SELECT
    id,
    'disaster_event'::text,
    CASE 
        WHEN approval_status = 'draft' THEN 'draft'::public.workflow_status
        WHEN approval_status = 'waiting-for-validation' THEN 'submitted'::public.workflow_status
        WHEN approval_status = 'needs-revision' THEN 'revision_requested'::public.workflow_status
        WHEN approval_status = 'validated' THEN 'approved'::public.workflow_status
        WHEN approval_status = 'published' THEN 'published'::public.workflow_status
        ELSE 'draft'::public.workflow_status
    END,
    created_at,
    updated_at,
    NULL,
    validated_at,
    published_at
FROM public.disaster_event
ON CONFLICT DO NOTHING;

-- Phase 3: Backfill workflow_history with seed records

-- Insert initial history records for hazardous_event
INSERT INTO public.workflow_history (workflow_instance_id, from_status, to_status, action_by, created_at)
SELECT
    wi.id,
    NULL::public.workflow_status,
    wi.status,
    COALESCE(he.submitted_by_user_id, he.validated_by_user_id, he.published_by_user_id, he.created_by_user_id),
    wi.created_at
FROM public.workflow_instance wi
JOIN public.hazardous_event he ON he.id = wi.entity_id
WHERE wi.entity_type = 'hazardous_event';

-- Insert initial history records for disaster_event
INSERT INTO public.workflow_history (workflow_instance_id, from_status, to_status, action_by, created_at)
SELECT
    wi.id,
    NULL::public.workflow_status,
    wi.status,
    COALESCE(de.validated_by_user_id, de.published_by_user_id, de.created_by_user_id),
    wi.created_at
FROM public.workflow_instance wi
JOIN public.disaster_event de ON de.id = wi.entity_id
WHERE wi.entity_type = 'disaster_event';

-- Phase 4: Drop legacy structures

-- Drop legacy tables that are no longer needed
DROP TABLE IF EXISTS public.entity_validation_assignment CASCADE;
DROP TABLE IF EXISTS public.entity_validation_rejection CASCADE;

-- Drop legacy enum type
DROP TYPE IF EXISTS public.entity_validation_type CASCADE;

-- Remove legacy approval columns from hazardous_event
ALTER TABLE IF EXISTS public.hazardous_event
    DROP COLUMN IF EXISTS approval_status,
    DROP COLUMN IF EXISTS submitted_by_user_id,
    DROP COLUMN IF EXISTS submitted_at,
    DROP COLUMN IF EXISTS validated_by_user_id,
    DROP COLUMN IF EXISTS validated_at,
    DROP COLUMN IF EXISTS published_by_user_id,
    DROP COLUMN IF EXISTS published_at;

-- Remove legacy approval columns from disaster_event
ALTER TABLE IF EXISTS public.disaster_event
    DROP COLUMN IF EXISTS approval_status,
    DROP COLUMN IF EXISTS validated_by_user_id,
    DROP COLUMN IF EXISTS validated_at,
    DROP COLUMN IF EXISTS published_by_user_id,
    DROP COLUMN IF EXISTS published_at;

COMMIT;