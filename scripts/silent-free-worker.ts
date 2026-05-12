import { workerPollIntervalSeconds } from "@/lib/env";
import { runSilentFreeAccessTick } from "@/lib/services/silent-free-worker";

async function main() {
  const intervalMs = workerPollIntervalSeconds() * 1000;
  console.log(`Perch silent free access worker polling every ${intervalMs / 1000}s`);

  for (;;) {
    try {
      const results = await runSilentFreeAccessTick();
      console.log(JSON.stringify({ at: new Date().toISOString(), results }));
    } catch (error) {
      console.error(error);
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

void main();
