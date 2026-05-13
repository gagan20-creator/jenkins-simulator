// ============================================================
// SCHEDULER — picks jobs from queue and assigns to workers
// ============================================================

const pool = require('./db');
const { findWorker, executeJob } = require('./workers');

let schedulerRunning = false;

async function runScheduler() {
  if (schedulerRunning) return;
  schedulerRunning = true;

  try {
    // Fetch oldest queued job
    const result = await pool.query(
      `SELECT * FROM jobs WHERE status='queued' ORDER BY effective_priority ASC, created_at ASC LIMIT 1`
    );

    if (result.rows.length === 0) {
      // No jobs in queue
      schedulerRunning = false;
      return;
    }

    const job = result.rows[0];

    // Find a suitable worker
    const worker = findWorker(job.language);

    if (!worker) {
      console.log(`[Scheduler] No available worker for language: ${job.language}. Will retry...`);
      schedulerRunning = false;
      return;
    }

    console.log(`[Scheduler] Assigning job #${job.id} to ${worker.name}`);

    // Execute job asynchronously (don't await — let it run in background)
    executeJob(job, worker).catch(err => {
      console.error(`[Scheduler] Job #${job.id} crashed:`, err.message);
      worker.busy = false;
    });

  } catch (err) {
    console.error('[Scheduler] Error:', err.message);
  }

  schedulerRunning = false;
}

// Run scheduler every 3 seconds
function startScheduler() {
  console.log('[Scheduler] Started — polling every 3 seconds');
  setInterval(runScheduler, 3000);
  setInterval(promoteStarvingJobs, 10000);
}
async function promoteStarvingJobs() {

  try {

    const result = await pool.query(`
      UPDATE jobs
      SET effective_priority =
          effective_priority - 1

      WHERE status='queued'
      AND effective_priority > 1

      AND NOW() - created_at >
          interval '2 minutes'

      RETURNING id
    `);

    if (result.rows.length > 0) {

      result.rows.forEach(job => {

        console.log(
          `[Starvation Prevention] Promoted Job #${job.id}`
        );

      });

    }

  } catch (err) {

    console.error(
      '[Starvation Prevention Error]',
      err.message
    );

  }

}
module.exports = { startScheduler, promoteStarvingJobs };
