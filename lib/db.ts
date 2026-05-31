import { PrismaClient } from "@prisma/client";
import { applyDatabaseUrlAlias } from "@/lib/env";

declare global {
  var __perchPrisma: PrismaClient | undefined;
}

export function getPrisma() {
  if (!globalThis.__perchPrisma) {
    applyDatabaseUrlAlias();
    globalThis.__perchPrisma = new PrismaClient({
      log: process.env.PRISMA_QUERY_LOG === "true" ? ["query", "error", "warn"] : ["error"],
    });
  }

  return globalThis.__perchPrisma;
}
