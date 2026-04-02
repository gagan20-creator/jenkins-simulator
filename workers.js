// ============================================================
// WORKERS — 4 simulated workers with language specialization
// ============================================================

const pool = require('./db');

const WORKERS = [
  { id: 1, name: 'Worker-Python',  languages: ['python'],          busy: false },
  { id: 2, name: 'Worker-Node',    languages: ['javascript','node'],busy: false },
  { id: 3, name: 'Worker-Java',    languages: ['java'],             busy: false },
  { id: 4, name: 'Worker-General', languages: ['general','*'],      busy: false },
];

// Find the best available worker for a given language
function findWorker(language) {
  const lang = (language || 'general').toLowerCase();

  // First try: exact language match
  const specialist = WORKERS.find(
    w => !w.busy && w.languages.includes(lang)
  );
  if (specialist) return specialist;

  // Second try: general worker
  const general = WORKERS.find(
    w => !w.busy && w.languages.includes('*')
  );
  if (general) return general;

  // No worker available
  return null;
}

// Get status of all workers
function getWorkerStatus() {
  return WORKERS.map(w => ({
    id: w.id,
    name: w.name,
    languages: w.languages,
    status: w.busy ? 'busy' : 'idle',
  }));
}

// Simulate executing a job on a worker
async function executeJob(job, worker) {
  worker.busy = true;
  console.log(`\n[${worker.name}] ► Starting job #${job.id} (${job.language}) from ${job.repo}`);

  // Mark job as 'running' in DB
  await pool.query(
    `UPDATE jobs SET status='running', worker_id=$1, worker_name=$2, started_at=NOW() WHERE id=$3`,
    [worker.id, worker.name, job.id]
  );

  // Simulate random execution time (5 – 20 seconds)
  const execTime = Math.floor(Math.random() * 15000) + 5000;
  const steps = generateBuildSteps(job.language);

  // Stream logs step by step
  let logs = `[${new Date().toISOString()}] Job started on ${worker.name}\n`;
  logs += `[INFO] Repo: ${job.repo}  Branch: ${job.branch}\n`;
  logs += `[INFO] Language: ${job.language}\n\n`;

  for (let i = 0; i < steps.length; i++) {
    await sleep(execTime / steps.length);
    const stepLog = `[STEP ${i+1}/${steps.length}] ${steps[i]}\n`;
    logs += stepLog;
    process.stdout.write(stepLog);
    // Update logs in DB progressively
    await pool.query(`UPDATE jobs SET logs=$1 WHERE id=$2`, [logs, job.id]);
  }

  // Randomly fail 10% of jobs to simulate real-world behavior
  const didFail = Math.random() < 0.10;
  const finalStatus = didFail ? 'failed' : 'completed';
  const finalLog = didFail
    ? `\n[ERROR] Build failed due to a simulated error!\n`
    : `\n[SUCCESS] Build completed successfully!\n`;

  logs += finalLog;
  console.log(`[${worker.name}] ✓ Job #${job.id} → ${finalStatus.toUpperCase()}`);

  await pool.query(
    `UPDATE jobs SET status=$1, logs=$2, completed_at=NOW() WHERE id=$3`,
    [finalStatus, logs, job.id]
  );

  worker.busy = false;
}

// Generate realistic build steps based on language
function generateBuildSteps(language) {
  const lang = (language || 'general').toLowerCase();

  const steps = {
    python: [
      'Cloning repository...',
      'Setting up Python virtual environment',
      'Installing dependencies: pip install -r requirements.txt',
      'Running linter: flake8 .',
      'Running unit tests: pytest tests/',
      'Generating coverage report',
      'Building Docker image',
      'Pushing to registry',
    ],
    javascript: [
      'Cloning repository...',
      'Installing dependencies: npm install',
      'Running linter: eslint src/',
      'Running tests: npm test',
      'Building application: npm run build',
      'Running integration tests',
      'Pushing build artifacts',
    ],
    node: [
      'Cloning repository...',
      'Installing dependencies: npm ci',
      'Running linter: eslint .',
      'Running unit tests: jest --coverage',
      'Building: npm run build',
      'Pushing build artifacts',
    ],
    java: [
      'Cloning repository...',
      'Running: mvn clean install',
      'Running unit tests: mvn test',
      'Running SonarQube analysis',
      'Building JAR artifact',
      'Pushing to Nexus repository',
    ],
    general: [
      'Cloning repository...',
      'Detecting build system...',
      'Installing dependencies',
      'Running tests',
      'Building artifacts',
      'Deployment step',
    ],
  };

  return steps[lang] || steps['general'];
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { findWorker, executeJob, getWorkerStatus, WORKERS };
