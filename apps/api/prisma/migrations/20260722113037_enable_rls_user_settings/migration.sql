-- UserSettings was added after the earlier RLS-enablement pass
-- (20260610083000_enable_rls_prisma_migrations) and was missed.
-- Same rationale as that migration: the app only accesses data through
-- Prisma/the Express API, never PostgREST, so no policies are opened here.
ALTER TABLE IF EXISTS public."UserSettings" ENABLE ROW LEVEL SECURITY;
