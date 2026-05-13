async function loadWorkers() {
  try {
    const res = await fetch('/workers');
    const data = await res.json();

    let html = '';

    data.workers.forEach(worker => {
      html += `
        <div class="worker-box">
          <strong>${worker.name}</strong><br>
          Languages: ${worker.languages.join(', ')}<br>
          Status: <b>${worker.status}</b>
        </div>
      `;
    });

    document.getElementById('workers').innerHTML = html;
  } catch (err) {
    document.getElementById('workers').innerHTML = 'Error loading workers';
  }
}

async function loadJobs() {
  try {
    const res = await fetch('/jobs');
    const data = await res.json();

    let html = '';

    data.jobs.forEach(job => {
      html += `
        <div class="job-box">
          <strong>Job #${job.id}</strong><br>
          Repo: ${job.repo}<br>
          Branch: ${job.branch}<br>
          Language: ${job.language}<br>
          Status: <b>${job.status}</b><br>
          Role: ${job.role || 'N/A'}<br>
          Priority: ${job.priority || 'N/A'}<br>
          Worker: ${job.worker_name || 'Not assigned yet'}
        </div>
      `;
    });

    document.getElementById('jobs').innerHTML = html;
  } catch (err) {
    document.getElementById('jobs').innerHTML = 'Error loading jobs';
  }
}

async function loadLogs() {
  const jobId = document.getElementById('jobId').value;

  if (!jobId) {
    alert('Please enter Job ID');
    return;
  }

  try {
    const res = await fetch(`/jobs/${jobId}`);
    const data = await res.json();

    document.getElementById('logs').textContent =
      data.logs || 'No logs available yet.';
  } catch (err) {
    document.getElementById('logs').textContent =
      'Error loading logs';
  }
}

loadWorkers();
loadJobs();

setInterval(() => {
  loadWorkers();
  loadJobs();
}, 5000);
