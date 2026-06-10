-- Supabase exposes the public schema to PostgREST checks, so every table in
-- this schema should have RLS enabled. The app accesses data through the API
-- and Prisma, so no PostgREST policies are opened here.
ALTER TABLE IF EXISTS public._prisma_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Schedule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."BlockTemplate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."TemplateHabit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."TemplateTask" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."ScheduleBlock" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."BlockInstance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."HabitCompletion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."TaskCompletion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."JournalEntry" ENABLE ROW LEVEL SECURITY;
