-- Same rationale as 20260610083000_enable_rls_prisma_migrations: Supabase
-- exposes the public schema to PostgREST, so every table in this schema should
-- have RLS enabled. The app accesses data through the API and Prisma, so no
-- PostgREST policies are opened here.
ALTER TABLE IF EXISTS public."PushSubscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."NotificationPreference" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."NotificationLog" ENABLE ROW LEVEL SECURITY;
