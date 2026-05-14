// ============================================================
// SERVER.JS — Jenkins Master
// Receives webhooks, manages jobs, exposes REST API
// ============================================================

const { calculatePriority } =
require('./roleManager');

require('dotenv').config();

const express = require('express');

const pool = require('./db');

const { startScheduler } =
require('./scheduler');

const { getWorkerStatus } =
require('./workers');

const app = express();

const PORT =
  process.env.PORT || 3000;

app.use(express.json());

app.use(express.static('public'));

// Pretty JSON responses
app.set('json spaces', 2);

// ============================================================
// WEBHOOK ENDPOINT
// ============================================================

app.post('/webhook', async (req, res) => {

  try {

    const body = req.body;

    // ========================================================
    // REPO + BRANCH
    // ========================================================

    const repo =
      body.repository?.full_name ||
      body.repo ||
      'unknown/repo';

    const branch =
      body.ref?.replace('refs/heads/', '') ||
      body.branch ||
      'main';

    // ========================================================
    // AUTO LANGUAGE DETECTION
    // ========================================================

    const language =
      body.language ||
      detectLanguage(repo, body);

    // ========================================================
    // AUTO ROLE DETECTION FROM COMMIT MESSAGE
    // ========================================================

    const commitMessage =
      body.head_commit?.message?.toLowerCase() || '';

    let role = 'intern';

    if (commitMessage.includes('[admin]')) {

      role = 'admin';

    } else if (
      commitMessage.includes('[teamlead]')
    ) {

      role = 'teamlead';

    } else if (
      commitMessage.includes('[developer]')
    ) {

      role = 'developer';

    } else if (
      commitMessage.includes('[employee]')
    ) {

      role = 'employee';

    }

    // ========================================================
    // PRIORITY CALCULATION
    // ========================================================

    const priority =
      calculatePriority(role, branch);

    console.log(
      `\n[Webhook] Push received → ${repo} (${branch}) [${language}]`
    );

    console.log(
      `[Webhook] Role: ${role} | Priority: ${priority}`
    );

    // ========================================================
    // STORE JOB IN DATABASE
    // ========================================================

    const result = await pool.query(
`
INSERT INTO jobs (
  repo,
  branch,
  language,
  role,
  priority,
  effective_priority,
  status
)
VALUES ($1,$2,$3,$4,$5,$6,'queued')
RETURNING *
`,
[
  repo,
  branch,
  language,
  role,
  priority,
  priority
]
    );

    const job = result.rows[0];

    console.log(
      `[Webhook] Job #${job.id} added to queue`
    );

    // ========================================================
    // RESPONSE
    // ========================================================

    res.status(201).json({

      message: 'Job queued successfully',

      job_id: job.id,

      repo,
      branch,
      language,
      role,
      priority,

      status: 'queued'

    });

  } catch (err) {

    console.error(
      '[Webhook] Error:',
      err.message
    );

    res.status(500).json({
      error: err.message
    });

  }

});

// ============================================================
// GET ALL JOBS
// ============================================================

app.get('/jobs', async (req, res) => {

  try {

    const result = await pool.query(
`
SELECT
  id,
  repo,
  branch,
  language,
  role,
  priority,
  status,
  worker_name,
  created_at,
  started_at,
  completed_at

FROM jobs

ORDER BY created_at DESC
`
    );

    res.json({
      total: result.rowCount,
      jobs: result.rows
    });

  } catch (err) {

    res.status(500).json({
      error: err.message
    });

  }

});

// ============================================================
// GET SINGLE JOB
// ============================================================

app.get('/jobs/:id', async (req, res) => {

  try {

    const result = await pool.query(
      `SELECT * FROM jobs WHERE id=$1`,
      [req.params.id]
    );

    if (result.rowCount === 0) {

      return res.status(404).json({
        error: 'Job not found'
      });

    }

    res.json(result.rows[0]);

  } catch (err) {

    res.status(500).json({
      error: err.message
    });

  }

});

// ============================================================
// FILTER BY STATUS
// ============================================================

app.get('/jobs/status/:status', async (req, res) => {

  try {

    const result = await pool.query(
`
SELECT
  id,
  repo,
  branch,
  language,
  role,
  priority,
  status,
  worker_name,
  created_at

FROM jobs

WHERE status=$1

ORDER BY created_at DESC
`,
      [req.params.status]
    );

    res.json({
      total: result.rowCount,
      jobs: result.rows
    });

  } catch (err) {

    res.status(500).json({
      error: err.message
    });

  }

});

// ============================================================
// WORKERS
// ============================================================

app.get('/workers', (req, res) => {

  res.json({
    workers: getWorkerStatus()
  });

});

// ============================================================
// CLEAR JOBS
// ============================================================

app.delete('/jobs/clear', async (req, res) => {

  await pool.query(`DELETE FROM jobs`);

  res.json({
    message: 'All jobs cleared'
  });

});

// ============================================================
// SIMULATE RANDOM JOBS
// ============================================================

app.post('/simulate', async (req, res) => {

  const count =
    parseInt(req.body.count) || 5;

  const repos = [

    {
      repo: 'company/backend-api',
      language: 'python'
    },

    {
      repo: 'company/frontend-app',
      language: 'javascript'
    },

    {
      repo: 'company/auth-service',
      language: 'java'
    },

    {
      repo: 'company/mobile-app',
      language: 'node'
    },

    {
      repo: 'company/infra-scripts',
      language: 'general'
    }

  ];

  const created = [];

  for (let i = 0; i < count; i++) {

    await sleep(Math.random() * 3000);

    const pick =
      repos[Math.floor(Math.random() * repos.length)];

    const branch =
      randomBranch();

    const result = await pool.query(
`
INSERT INTO jobs (
  repo,
  branch,
 language,
  role,
  priority,
  effective_priority,
  status
)
VALUES ($1,$2,$3,$4,$5,$6,'queued')
RETURNING *
`,
[
  pick.repo,
  branch,
  pick.language,
  'developer',
  3,
  3
]
    );

    console.log(
      `[Simulate] Created job #${result.rows[0].id} → ${pick.repo}`
    );

    created.push(result.rows[0]);

  }

  res.json({
    message: `${count} jobs simulated`,
    jobs: created
  });

});

// ============================================================
// AUTO LANGUAGE DETECTION
// ============================================================

function detectLanguage(repo, body = {}) {

  const commits =
    body.commits || [];

  const changedFiles = [];

  commits.forEach(commit => {

    changedFiles.push(
      ...(commit.added || []),
      ...(commit.modified || [])
    );

  });

  const files =
    changedFiles.join(' ').toLowerCase();

  // Python
  if (
    files.includes('requirements.txt') ||
    files.includes('.py')
  ) {
    return 'python';
  }

  // Node
  if (
    files.includes('package.json') ||
    files.includes('.js')
  ) {
    return 'node';
  }

  // Java
  if (
    files.includes('pom.xml') ||
    files.includes('.java')
  ) {
    return 'java';
  }

  // Fallback repo detection
  const r =
    repo.toLowerCase();

  if (r.includes('python'))
    return 'python';

  if (r.includes('node'))
    return 'node';

  if (r.includes('java'))
    return 'java';

  return 'general';
}

// ============================================================
// RANDOM BRANCH
// ============================================================

function randomBranch() {

  const branches = [
    'main',
    'develop',
    'feature/login',
    'feature/dashboard',
    'hotfix/payment'
  ];

  return branches[
    Math.floor(Math.random() * branches.length)
  ];

}

// ============================================================
// SLEEP
// ============================================================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================
// START SERVER
// ============================================================

app.listen(PORT, () => {

  console.log(`\n╔═══════════════════════════════════════╗`);

  console.log(`║   Jenkins Simulator — Master Server   ║`);

  console.log(`╚═══════════════════════════════════════╝`);

  console.log(`► Running on http://localhost:${PORT}`);

  console.log(`► Endpoints available — visit http://localhost:${PORT}\n`);

  startScheduler();

});