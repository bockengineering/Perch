import { PrismaClient } from "@prisma/client";

declare global {
  var __perchPrisma: PrismaClient | undefined;
}

export function getPrisma() {
  if (!globalThis.__perchPrisma) {
    globalThis.__perchPrisma = new PrismaClient({
      log: process.env.PRISMA_QUERY_LOG === "true" ? ["query", "error", "warn"] : ["error"],
    });
  }

  return globalThis.__perchPrisma;
}
