-- ==============================================================================
-- LOCALFIT STAGE 6 MIGRATION: Optional AI Estimate Tracking on Food Logs
-- ==============================================================================

ALTER TABLE public.food_logs 
ADD COLUMN IF NOT EXISTS is_ai_estimate BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.food_logs.is_ai_estimate IS 'Indicates whether this entry was created using the AI Food Photo Scanner';
