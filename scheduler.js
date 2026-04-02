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
      `SELECT * FROM jobs WHERE status='queued' ORDER BY created_at ASC LIMIT 1`
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
}

module.exports = { startScheduler };
