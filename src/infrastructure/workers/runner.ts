// ─── Stayflexi Background Worker Execution Loop ──────────────────────────────
// Periodically polls the database for pending background jobs and processes them.
// Supports graceful shutdown on SIGINT/SIGTERM.
// ─────────────────────────────────────────────────────────────────────────────

import { jobService } from "@modules/jobs/container";

console.log("=========================================");
console.log(" Stayflexi Background Worker Active");
console.log("=========================================");
console.log(`Current Time: ${new Date().toISOString()}`);
console.log("Worker Status: RUNNING");
console.log("=========================================");

let running = true;
const pollIntervalMs = 5000; // Poll every 5 seconds

async function start() {
  while (running) {
    try {
      const result = await jobService.processPendingJobs();
      if (result.processed > 0 || result.failed > 0) {
        console.log(`[Worker] Processed: ${result.processed}, Failed: ${result.failed}`);
      }
    } catch (error) {
      console.error("[Worker] Error processing jobs:", error);
    }
    
    // Wait for next polling interval
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
  console.log("[Worker] Gracefully shut down.");
}

// Graceful shutdown handlers
process.on("SIGINT", () => {
  console.log("[Worker] SIGINT received. Shutting down gracefully...");
  running = false;
});

process.on("SIGTERM", () => {
  console.log("[Worker] SIGTERM received. Shutting down gracefully...");
  running = false;
});

start().catch((err) => {
  console.error("[Worker] Fatal error in execution loop:", err);
  process.exit(1);
});
