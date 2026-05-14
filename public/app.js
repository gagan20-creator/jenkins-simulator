async function loadWorkers() {

  try {

    const res = await fetch('/workers');

    const data = await res.json();

    let html = '';

    data.workers.forEach(worker => {

      html += `
        <div class="worker-box">

          <strong>${worker.name}</strong><br>

          Languages:
          ${worker.languages.join(', ')}
          <br>

          Status:
          <b>${worker.status}</b>

        </div>
      `;

    });

    document.getElementById('workers').innerHTML = html;

  } catch (err) {

    document.getElementById('workers').innerHTML =
      'Error loading workers';

  }
}

async function loadJobs() {

  try {

    const res = await fetch('/jobs');

    const data = await res.json();

    const q1 = [];
    const q2 = [];
    const q3 = [];
    const q4 = [];
    const q5 = [];

    let activeHtml = '';

    data.jobs.forEach(job => {

      const queueCard = `
        <div class="queue-job">

          <strong>#${job.id}</strong><br>

          ${job.repo}<br>

          ${job.branch}<br>

          <b>${job.status}</b>

        </div>
      `;

      // Queue lanes
      if (job.role === 'admin')
        q1.push(queueCard);

      else if (job.role === 'teamlead')
        q2.push(queueCard);

      else if (job.role === 'developer')
        q3.push(queueCard);

      else if (job.role === 'employee')
        q4.push(queueCard);

      else
        q5.push(queueCard);

      // Active jobs
      if (job.status === 'running') {

        const progress =
          Math.floor(Math.random() * 100);

        activeHtml += `
          <div class="active-job">

            <strong>
              ${job.role} • Job #${job.id}
            </strong>

            <br><br>

            ${job.repo}
            (${job.branch})

            <br><br>

            <div class="stage-grid">

              <div class="stage done">
                Checkout
              </div>

              <div class="stage done">
                Install
              </div>

              <div class="stage running">
                Build
              </div>

              <div class="stage">
                Test
              </div>

              <div class="stage">
                Deploy
              </div>

            </div>

            <div class="progress-bar">

              <div
                class="progress-fill"
                style="width:${progress}%"
              ></div>

            </div>

          </div>
        `;
      }

    });

    document.getElementById('q1Jobs').innerHTML =
      q1.join('');

    document.getElementById('q2Jobs').innerHTML =
      q2.join('');

    document.getElementById('q3Jobs').innerHTML =
      q3.join('');

    document.getElementById('q4Jobs').innerHTML =
      q4.join('');

    document.getElementById('q5Jobs').innerHTML =
      q5.join('');

    document.getElementById('activeJobs').innerHTML =
      activeHtml || 'No active jobs';

  } catch (err) {

    console.error(err);

  }
}

async function loadLogs() {

  const jobId =
    document.getElementById('jobId').value;

  if (!jobId) {

    alert('Please enter Job ID');

    return;
  }

  try {

    const res =
      await fetch(`/jobs/${jobId}`);

    const data =
      await res.json();

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

}, 3000);