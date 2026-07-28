-- Bring existing shops onto the conservative launch defaults without
-- overwriting shops that have already customized either value.
ALTER TABLE "Shop"
  ALTER COLUMN "checkoutGraceMinutes" SET DEFAULT 5,
  ALTER COLUMN "maxCheckoutGracePerDay" SET DEFAULT 1;

UPDATE "Shop"
SET
  "checkoutGraceMinutes" = 5,
  "maxCheckoutGracePerDay" = 1
WHERE
  "checkoutGraceMinutes" = 10
  AND "maxCheckoutGracePerDay" = 20;

-- Remove sensitive values retained by versions that predate query sanitizing.
UPDATE "PortalSession"
SET
  "rawQueryJson" = "rawQueryJson" - 'id' - 'ap' - 'url',
  "originalUrl" = NULL;

-- Perch uses its server-side Prisma connection, not the Supabase Data API.
-- Revoke Data API roles and enable RLS as defense in depth for every app table.
DO $$
DECLARE
  app_table TEXT;
  api_role TEXT;
BEGIN
  FOREACH app_table IN ARRAY ARRAY[
    'Shop',
    'UniFiIntegration',
    'Device',
    'DailyFreeAllowance',
    'PortalSession',
    'AccessGrant',
    'PricePlan',
    'Order',
    'Voucher',
    'VoucherRedemption',
    'WebhookEvent',
    'NetworkActionLog',
    'User',
    'ShopMember',
    'PlatformUser',
    'AuditLog'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', app_table);

    FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role']
    LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
        EXECUTE format('REVOKE ALL ON TABLE public.%I FROM %I', app_table, api_role);
      END IF;
    END LOOP;
  END LOOP;

  FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
      EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %I', api_role);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM %I', api_role);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM %I', api_role);
    END IF;
  END LOOP;
END
$$;
