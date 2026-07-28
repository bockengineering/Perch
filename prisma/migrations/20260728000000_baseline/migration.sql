CREATE SCHEMA IF NOT EXISTS "public";

CREATE TYPE "ShopStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'DISABLED');
CREATE TYPE "FreeResetType" AS ENUM ('DAILY', 'ROLLING_24_HOURS');
CREATE TYPE "IntegrationStatus" AS ENUM ('UNTESTED', 'CONNECTED', 'FAILED');
CREATE TYPE "DailyFreeAllowanceStatus" AS ENUM ('CLAIMED', 'AUTHORIZED', 'FAILED', 'EXPIRED');
CREATE TYPE "PortalSessionStatus" AS ENUM ('OPEN', 'AUTHORIZED', 'PAYWALL', 'ERROR', 'EXPIRED');
CREATE TYPE "AccessGrantType" AS ENUM ('FREE_AUTO_WORKER', 'FREE_PORTAL_FAST_PATH', 'EMERGENCY_FREE', 'PAID', 'VOUCHER', 'CHECKOUT_GRACE', 'STAFF_COMP');
CREATE TYPE "AccessGrantStatus" AS ENUM ('PENDING', 'AUTHORIZED', 'FAILED', 'EXPIRED', 'REVOKED');
CREATE TYPE "OrderStatus" AS ENUM ('CREATED', 'CHECKOUT_STARTED', 'PAID', 'AUTHORIZED', 'FAILED', 'REFUNDED', 'CANCELED');
CREATE TYPE "VoucherStatus" AS ENUM ('ACTIVE', 'PAUSED', 'EXPIRED', 'DEPLETED');
CREATE TYPE "NetworkProviderType" AS ENUM ('UNIFI', 'MOCK');
CREATE TYPE "NetworkActionStatus" AS ENUM ('SUCCESS', 'FAILED');
CREATE TYPE "ShopRole" AS ENUM ('SHOP_OWNER', 'STAFF');
CREATE TYPE "PlatformRole" AS ENUM ('PLATFORM_ADMIN');
CREATE TYPE "AuditLogStatus" AS ENUM ('SUCCESS', 'FAILED');

CREATE TABLE "Shop" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Los_Angeles',
    "status" "ShopStatus" NOT NULL DEFAULT 'DRAFT',
    "freeMinutesPerDay" INTEGER NOT NULL DEFAULT 60,
    "freeResetType" "FreeResetType" NOT NULL DEFAULT 'DAILY',
    "freeResetHour" INTEGER NOT NULL DEFAULT 0,
    "checkoutGraceMinutes" INTEGER NOT NULL DEFAULT 5,
    "maxCheckoutGracePerDay" INTEGER NOT NULL DEFAULT 1,
    "platformFeeBps" INTEGER NOT NULL DEFAULT 2000,
    "stripeConnectedAccountId" TEXT,
    "stripeChargesEnabled" BOOLEAN NOT NULL DEFAULT false,
    "stripePayoutsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "brandLogoUrl" TEXT,
    "brandPrimaryColor" TEXT,
    "supportEmail" TEXT,
    "emergencyFreeUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Shop_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UniFiIntegration" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "apiBaseUrl" TEXT NOT NULL,
    "apiKeyEncrypted" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "siteName" TEXT NOT NULL,
    "allowedSsids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "connectionStatus" "IntegrationStatus" NOT NULL DEFAULT 'UNTESTED',
    "lastTestAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UniFiIntegration_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "clientMacHash" TEXT NOT NULL,
    "clientMacEncrypted" TEXT NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSsid" TEXT,
    "lastApMacHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DailyFreeAllowance" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "localDate" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "status" "DailyFreeAllowanceStatus" NOT NULL DEFAULT 'CLAIMED',
    "grantId" TEXT,
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DailyFreeAllowance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PortalSession" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "deviceId" TEXT,
    "rawQueryJson" JSONB NOT NULL,
    "ssid" TEXT,
    "apMacHash" TEXT,
    "originalUrl" TEXT,
    "ipHash" TEXT,
    "userAgentHash" TEXT,
    "status" "PortalSessionStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PortalSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AccessGrant" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "type" "AccessGrantType" NOT NULL,
    "status" "AccessGrantStatus" NOT NULL DEFAULT 'PENDING',
    "requestedMinutes" INTEGER NOT NULL,
    "authorizedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "unifiClientId" TEXT,
    "unifiActionStatus" TEXT,
    "unifiResponseJson" JSONB,
    "orderId" TEXT,
    "voucherRedemptionId" TEXT,
    "dailyFreeAllowanceId" TEXT,
    "failureReason" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AccessGrant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PricePlan" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PricePlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "pricePlanId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'CREATED',
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "platformFeeCents" INTEGER NOT NULL,
    "stripeConnectedAccountId" TEXT,
    "stripeCheckoutSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "stripeChargeId" TEXT,
    "paidAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Voucher" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "codeCiphertext" TEXT,
    "durationMinutes" INTEGER NOT NULL,
    "maxRedemptions" INTEGER NOT NULL,
    "redeemedCount" INTEGER NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "status" "VoucherStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Voucher_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VoucherRedemption" (
    "id" TEXT NOT NULL,
    "voucherId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "grantId" TEXT,
    "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VoucherRedemption_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "accountId" TEXT,
    "livemode" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "payloadJson" JSONB NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NetworkActionLog" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "deviceId" TEXT,
    "grantId" TEXT,
    "provider" "NetworkProviderType" NOT NULL,
    "action" TEXT NOT NULL,
    "requestJson" JSONB,
    "responseJson" JSONB,
    "status" "NetworkActionStatus" NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NetworkActionLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "supabaseUserId" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ShopMember" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ShopRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ShopMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlatformUser" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "PlatformRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlatformUser_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "shopId" TEXT,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "status" "AuditLogStatus" NOT NULL DEFAULT 'SUCCESS',
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Shop_slug_key" ON "Shop"("slug");
CREATE UNIQUE INDEX "UniFiIntegration_shopId_key" ON "UniFiIntegration"("shopId");
CREATE INDEX "Device_shopId_lastSeenAt_idx" ON "Device"("shopId", "lastSeenAt");
CREATE UNIQUE INDEX "Device_shopId_clientMacHash_key" ON "Device"("shopId", "clientMacHash");
CREATE INDEX "DailyFreeAllowance_shopId_localDate_idx" ON "DailyFreeAllowance"("shopId", "localDate");
CREATE INDEX "DailyFreeAllowance_deviceId_idx" ON "DailyFreeAllowance"("deviceId");
CREATE UNIQUE INDEX "DailyFreeAllowance_shopId_deviceId_localDate_key" ON "DailyFreeAllowance"("shopId", "deviceId", "localDate");
CREATE INDEX "PortalSession_shopId_idx" ON "PortalSession"("shopId");
CREATE INDEX "PortalSession_deviceId_idx" ON "PortalSession"("deviceId");
CREATE INDEX "AccessGrant_shopId_deviceId_status_expiresAt_idx" ON "AccessGrant"("shopId", "deviceId", "status", "expiresAt");
CREATE INDEX "AccessGrant_orderId_idx" ON "AccessGrant"("orderId");
CREATE INDEX "AccessGrant_deviceId_idx" ON "AccessGrant"("deviceId");
CREATE INDEX "PricePlan_shopId_active_sortOrder_idx" ON "PricePlan"("shopId", "active", "sortOrder");
CREATE INDEX "Order_shopId_status_createdAt_idx" ON "Order"("shopId", "status", "createdAt");
CREATE INDEX "Order_stripeCheckoutSessionId_idx" ON "Order"("stripeCheckoutSessionId");
CREATE INDEX "Order_stripePaymentIntentId_idx" ON "Order"("stripePaymentIntentId");
CREATE INDEX "Order_deviceId_idx" ON "Order"("deviceId");
CREATE INDEX "Order_pricePlanId_idx" ON "Order"("pricePlanId");
CREATE INDEX "Voucher_shopId_status_idx" ON "Voucher"("shopId", "status");
CREATE UNIQUE INDEX "Voucher_shopId_codeHash_key" ON "Voucher"("shopId", "codeHash");
CREATE INDEX "VoucherRedemption_shopId_redeemedAt_idx" ON "VoucherRedemption"("shopId", "redeemedAt");
CREATE INDEX "VoucherRedemption_deviceId_idx" ON "VoucherRedemption"("deviceId");
CREATE INDEX "VoucherRedemption_voucherId_idx" ON "VoucherRedemption"("voucherId");
CREATE INDEX "WebhookEvent_provider_eventType_createdAt_idx" ON "WebhookEvent"("provider", "eventType", "createdAt");
CREATE UNIQUE INDEX "WebhookEvent_provider_eventId_key" ON "WebhookEvent"("provider", "eventId");
CREATE INDEX "NetworkActionLog_shopId_createdAt_idx" ON "NetworkActionLog"("shopId", "createdAt");
CREATE INDEX "NetworkActionLog_status_createdAt_idx" ON "NetworkActionLog"("status", "createdAt");
CREATE INDEX "NetworkActionLog_deviceId_idx" ON "NetworkActionLog"("deviceId");
CREATE INDEX "NetworkActionLog_grantId_idx" ON "NetworkActionLog"("grantId");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_supabaseUserId_key" ON "User"("supabaseUserId");
CREATE INDEX "ShopMember_userId_idx" ON "ShopMember"("userId");
CREATE UNIQUE INDEX "ShopMember_shopId_userId_key" ON "ShopMember"("shopId", "userId");
CREATE UNIQUE INDEX "PlatformUser_userId_role_key" ON "PlatformUser"("userId", "role");
CREATE INDEX "AuditLog_shopId_createdAt_idx" ON "AuditLog"("shopId", "createdAt");
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

ALTER TABLE "UniFiIntegration" ADD CONSTRAINT "UniFiIntegration_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Device" ADD CONSTRAINT "Device_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DailyFreeAllowance" ADD CONSTRAINT "DailyFreeAllowance_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PortalSession" ADD CONSTRAINT "PortalSession_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PortalSession" ADD CONSTRAINT "PortalSession_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AccessGrant" ADD CONSTRAINT "AccessGrant_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AccessGrant" ADD CONSTRAINT "AccessGrant_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AccessGrant" ADD CONSTRAINT "AccessGrant_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PricePlan" ADD CONSTRAINT "PricePlan_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_pricePlanId_fkey" FOREIGN KEY ("pricePlanId") REFERENCES "PricePlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Voucher" ADD CONSTRAINT "Voucher_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VoucherRedemption" ADD CONSTRAINT "VoucherRedemption_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "Voucher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VoucherRedemption" ADD CONSTRAINT "VoucherRedemption_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NetworkActionLog" ADD CONSTRAINT "NetworkActionLog_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NetworkActionLog" ADD CONSTRAINT "NetworkActionLog_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "NetworkActionLog" ADD CONSTRAINT "NetworkActionLog_grantId_fkey" FOREIGN KEY ("grantId") REFERENCES "AccessGrant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ShopMember" ADD CONSTRAINT "ShopMember_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShopMember" ADD CONSTRAINT "ShopMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlatformUser" ADD CONSTRAINT "PlatformUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;
