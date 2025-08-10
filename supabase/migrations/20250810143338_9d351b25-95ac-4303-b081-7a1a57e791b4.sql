-- Ensure all public views run with caller's permissions
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT format('%I.%I', n.nspname, c.relname) AS view_fqn
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'v' AND n.nspname = 'public'
  LOOP
    EXECUTE format('ALTER VIEW %s SET (security_invoker = on);', r.view_fqn);
  END LOOP;
END $$;