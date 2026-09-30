-- Remove tickets created during a demo run. Related reports, media and history
-- rows are removed by the ticket foreign-key cascades. Supabase Storage files
-- are intentionally left untouched; they can be cleaned up separately.
DELETE FROM tickets
WHERE is_demo = FALSE;
