import { AuditLogStatus, type Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/db";
import type { Actor } from "@/lib/auth/basic";

export async function logAudit(input: {
  actor?: Actor;
  shopId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  status?: AuditLogStatus;
  metadata?: unknown;
}) {
  try {
    await getPrisma().auditLog.create({
      data: {
        shopId: input.shopId ?? undefined,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        status: input.status ?? AuditLogStatus.SUCCESS,
        metadataJson:
          input.metadata === undefined
            ? undefined
            : (JSON.parse(JSON.stringify(input.metadata)) as Prisma.InputJsonValue),
      },
    });
  } catch {
    // Audit logging should be best-effort for MVP admin actions.
  }
}
