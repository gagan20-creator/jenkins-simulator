// ============================================================
// WORKERS — 4 simulated workers with language specialization
// ============================================================

const pool = require('./db');

const WORKERS = [
  {
    id: 1,
    name: 'Worker-Python',
    languages: ['python'],
    busy: false,
    load: 0
  },

  {
    id: 2,
    name: 'Worker-Node',
    languages: ['javascript', 'node'],
    busy: false,
    load: 0
  },

  {
    id: 3,
    name: 'Worker-Java',
    languages: ['java'],
    busy: false,
    load: 0
  },

  {
    id: 4,
    name: 'Worker-General',
    languages: ['general', '*'],
    busy: false,
    load: 0
  },
];

// ============================================================
// FIND BEST AVAILABLE WORKER
// ============================================================

function findWorker(language) {

  const lang = (language || 'general').toLowerCase();

  // Exact specialist worker
  const specialist = WORKERS.find(
    w => !w.busy && w.languages.includes(lang)
  );

  if (specialist)
    return specialist;

  // General fallback worker
  const general = WORKERS.find(
    w => !w.busy && w.languages.includes('*')
  );

  if (general)
    return general;

  return null;
}

// ============================================================
// GET WORKER STATUS
// ============================================================

function getWorkerStatus() {

  return WORKERS.map(w => ({

    id: w.id,
    name: w.name,
    languages: w.languages,
    status: w.busy ? 'busy' : 'idle',
    load: w.load

  }));

}

// ============================================================
// EXECUTE JOB
// ============================================================

async function executeJob(job, worker) {

  worker.busy = true;
  worker.load++;

  console.log(
    `\n[${worker.name}] ► Starting job #${job.id} (${job.language}) from ${job.repo}`
  );

  // Mark running
  await pool.query(
    `
    UPDATE jobs
    SET status='running',
        worker_id=$1,
        worker_name=$2,
        started_at=NOW()
    WHERE id=$3
    `,
    [worker.id, worker.name, job.id]
  );

  // Simulated execution time
  const execTime =
    Math.floor(Math.random() * 15000) + 5000;

  const steps =
    generateBuildSteps(job.language);

  let logs =
    `[${new Date().toISOString()}] Job started on ${worker.name}\n`;

  logs +=
    `[INFO] Repo: ${job.repo}  Branch: ${job.branch}\n`;

  logs +=
    `[INFO] Language: ${job.language}\n\n`;

  // Execute stages
  for (let i = 0; i < steps.length; i++) {

    await sleep(execTime / steps.length);

    const stepLog =
      `[STEP ${i + 1}/${steps.length}] ${steps[i]}\n`;

    logs += stepLog;

    process.stdout.write(stepLog);

    await pool.query(
      `UPDATE jobs SET logs=$1 WHERE id=$2`,
      [logs, job.id]
    );
  }

  // Random failure simulation
  const didFail = Math.random() < 0.10;

  const finalStatus =
    didFail ? 'failed' : 'completed';

  const finalLog =
    didFail
      ? `\n[ERROR] Build failed due to simulated error!\n`
      : `\n[SUCCESS] Build completed successfully!\n`;

  logs += finalLog;

  console.log(
    `[${worker.name}] ✓ Job #${job.id} → ${finalStatus.toUpperCase()}`
  );

  await pool.query(
    `
    UPDATE jobs
    SET status=$1,
        logs=$2,
        completed_at=NOW()
    WHERE id=$3
    `,
    [finalStatus, logs, job.id]
  );

  worker.load--;
  worker.busy = false;
}

// ============================================================
// PIPELINE STAGES
// ============================================================

function generateBuildSteps(language) {

  const lang = (language || 'general').toLowerCase();

  const steps = {

    python: [
      'Checkout Stage',
      'Install Dependencies Stage',
      'Build Stage',
      'Test Stage',
      'Coverage Stage',
      'Docker Build Stage',
      'Push Artifact Stage',
      'Deploy Stage'
    ],

    javascript: [
      'Checkout Stage',
      'Install NPM Packages Stage',
      'Lint Stage',
      'Unit Test Stage',
      'Build Frontend Stage',
      'Deploy Stage'
    ],

    node: [
      'Checkout Stage',
      'Install NPM Packages Stage',
      'Lint Stage',
      'Unit Test Stage',
      'Build Frontend Stage',
      'Deploy Stage'
    ],

    java: [
      'Checkout Stage',
      'Resolve Maven Dependencies Stage',
      'Compile Stage',
      'JUnit Test Stage',
      'Package JAR Stage',
      'Dockerize Stage',
      'Deploy Stage'
    ],

    general: [
      'Checkout Stage',
      'Install Dependencies Stage',
      'Build Stage',
      'Test Stage',
      'Deploy Stage'
    ],
  };

  return steps[lang] || steps['general'];
}

// ============================================================
// SLEEP
// ============================================================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  findWorker,
  executeJob,
  getWorkerStatus,
  WORKERS
};