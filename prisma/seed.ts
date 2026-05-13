import { PrismaClient } from "@prisma/client";
import { seedDemoData } from "../lib/services/demo-seed";

const prisma = new PrismaClient();

async function main() {
  await seedDemoData(prisma);
  console.log("Seeded Demo Cafe at /p/demo-cafe");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
