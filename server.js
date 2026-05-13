// ============================================================
// SERVER.JS — Jenkins Master
// Receives webhooks, manages jobs, exposes REST API
// ============================================================
const { calculatePriority } =
require('./roleManager');
require('dotenv').config();
const express = require('express');
const pool = require('./db');
const { startScheduler } = require('./scheduler');
const { getWorkerStatus } = require('./workers');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

// ── Pretty JSON responses ──────────────────────────────────
app.set('json spaces', 2);

// ── Health check ───────────────────────────────────────────


// ── WEBHOOK ENDPOINT ───────────────────────────────────────
// This is what GitHub would call on a code push
app.post('/webhook', async (req, res) => {
  try {
    const body = req.body;

    // Support real GitHub webhooks OR our simulated ones
    const repo = body.repository?.full_name || body.repo || 'unknown/repo';
    const branch = body.ref?.replace('refs/heads/', '') || body.branch || 'main';
    const language = body.language || detectLanguage(repo);
    const role = body.role || 'intern';

    const priority =
      calculatePriority(role, branch); 

    console.log(`\n[Webhook] Push received → ${repo} (${branch}) [${language}]`);

    // Add job to PostgreSQL queue
    const result = await pool.query(
      `INSERT INTO jobs (repo, branch, language, status)
       VALUES ($1, $2, $3, 'queued') RETURNING *`,
      [repo, branch, language]
    );

    const job = result.rows[0];
    console.log(`[Webhook] Job #${job.id} added to queue`);

    res.status(201).json({
      message: 'Job queued successfully',
      job_id: job.id,
      repo,
      branch,
      language,
      status: 'queued',
    });

  } catch (err) {
    console.error('[Webhook] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET ALL JOBS ───────────────────────────────────────────
app.get('/jobs', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, repo, branch, language, status, worker_name,
              created_at, started_at, completed_at
       FROM jobs ORDER BY created_at DESC`
    );
    res.json({ total: result.rowCount, jobs: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET SINGLE JOB WITH LOGS ───────────────────────────────
app.get('/jobs/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM jobs WHERE id = $1`, [req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Job not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── FILTER BY STATUS ───────────────────────────────────────
app.get('/jobs/status/:status', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, repo, branch, language, status, worker_name, created_at
       FROM jobs WHERE status = $1 ORDER BY created_at DESC`,
      [req.params.status]
    );
    res.json({ total: result.rowCount, jobs: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── WORKER STATUS ─────────────────────────────────────────
app.get('/workers', (req, res) => {
  res.json({ workers: getWorkerStatus() });
});

// ── CLEAR ALL JOBS ────────────────────────────────────────
app.delete('/jobs/clear', async (req, res) => {
  await pool.query(`DELETE FROM jobs`);
  res.json({ message: 'All jobs cleared' });
});

// ── SIMULATE RANDOM JOB ARRIVALS ─────────────────────────
// Creates 5 random jobs at random intervals (mimics real CI traffic)
app.post('/simulate', async (req, res) => {
  const count = parseInt(req.body.count) || 5;
  const repos = [
    { repo: 'company/backend-api', language: 'python' },
    { repo: 'company/frontend-app', language: 'javascript' },
    { repo: 'company/auth-service', language: 'java' },
    { repo: 'company/data-pipeline', language: 'python' },
    { repo: 'company/mobile-app', language: 'javascript' },
    { repo: 'company/infra-scripts', language: 'general' },
    { repo: 'company/payment-svc', language: 'java' },
    { repo: 'company/notification-svc', language: 'node' },
  ];

  const created = [];

  for (let i = 0; i < count; i++) {
    // Random delay between arrivals (0 – 3 seconds) to simulate real traffic
    await sleep(Math.random() * 3000);

    const pick = repos[Math.floor(Math.random() * repos.length)];
    const branch = randomBranch();

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

    console.log(`[Simulate] Created job #${result.rows[0].id} → ${pick.repo} [${pick.language}]`);
    created.push({ id: result.rows[0].id, repo: pick.repo, language: pick.language, branch });
  }

  res.json({ message: `${count} jobs simulated`, jobs: created });
});

// ── HELPERS ───────────────────────────────────────────────
function detectLanguage(repo) {
  const r = repo.toLowerCase();
  if (r.includes('python') || r.includes('django') || r.includes('flask')) return 'python';
  if (r.includes('java') || r.includes('spring')) return 'java';
  if (r.includes('node') || r.includes('express')) return 'node';
  if (r.includes('react') || r.includes('vue') || r.includes('frontend')) return 'javascript';
  return 'general';
}

function randomBranch() {
  const branches = ['main', 'develop', 'feature/login', 'feature/dashboard', 'hotfix/payment'];
  return branches[Math.floor(Math.random() * branches.length)];
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── START ─────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n╔═══════════════════════════════════════╗`);
  console.log(`║   Jenkins Simulator — Master Server   ║`);
  console.log(`╚═══════════════════════════════════════╝`);
  console.log(`► Running on http://localhost:${PORT}`);
  console.log(`► Endpoints available — visit http://localhost:${PORT}\n`);
  startScheduler();
});
// demo update 2
