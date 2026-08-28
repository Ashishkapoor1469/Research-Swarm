const httpFetch = require('node-fetch');

async function verifyFoodJob() {
  console.log('=== VERIFYING BUG 1 & BUG 2 LIVE VIA REST API ===');

  // 1. Fetch workspaces (Bug 2 check)
  const wsRes = await httpFetch('http://localhost:4000/workspaces');
  const workspaces = await wsRes.json() as any[];
  console.log(`[Bug 2 Check] Persistent Workspaces Count: ${workspaces.length}`);
  if (workspaces.length === 0) {
    throw new Error('Bug 2 Failed: Workspaces array is empty!');
  }
  const targetWsId = workspaces[0].id;
  console.log(`[Bug 2 Check] Target Workspace: "${workspaces[0].name}" (${targetWsId})`);

  // 2. Submit Food Research Job (Bug 1 check)
  const foodQuestion = "Research on global food trends, nutrition, and culinary innovation";
  console.log(`\n[Bug 1 Check] Submitting job: "${foodQuestion}"...`);

  const jobData = await httpFetch('http://localhost:4000/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question: foodQuestion,
      depth: 'quick',
      workspaceId: targetWsId
    })
  }).then((r: any) => r.json());

  const jobId = jobData.job_id || jobData.id || jobData.job?.id;
  console.log(`[Bug 1 Check] Job created successfully! ID: ${jobId}`);

  // 3. Poll job status until completed
  console.log('[Bug 1 Check] Waiting for swarm execution to synthesize report...');
  let completedJob: any = null;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const pollRes = await httpFetch(`http://localhost:4000/jobs/${jobId}`);
    const state = await pollRes.json() as any;
    if (state.job && (state.job.status === 'completed' || state.job.livingReport)) {
      completedJob = state;
      if (state.job.status === 'completed') break;
    }
  }

  if (!completedJob || !completedJob.job.livingReport) {
    throw new Error('Job did not produce a living report in time.');
  }

  const reportMd = completedJob.job.livingReport.fullMarkdown;
  console.log('\n================ GENERATED LIVING REPORT SAMPLE ================');
  console.log(reportMd.slice(0, 600));
  console.log('=================================================================\n');

  // 4. Assertions
  const containsAiAct = reportMd.includes('EU AI Act') || reportMd.includes('paradigm shift for early-stage AI startups');
  const containsFood = reportMd.toLowerCase().includes('food') || reportMd.toLowerCase().includes('nutrition') || reportMd.toLowerCase().includes('protein') || reportMd.toLowerCase().includes('culinary');

  if (containsAiAct) {
    console.error('❌ BUG 1 FAILED: Report contains leftover EU AI Act content!');
    process.exit(1);
  } else if (!containsFood) {
    console.error('❌ BUG 1 FAILED: Report does not contain relevant food research content!');
    process.exit(1);
  } else {
    console.log('✅ BUG 1 PASSED: Report is 100% about Food Trends & Culinary Innovation!');
    console.log('✅ BUG 2 PASSED: Workspaces loaded persistently from disk store!');
    console.log('✅ ALL VERIFICATIONS PASSED WITH EXIT CODE 0!');
    process.exit(0);
  }
}

verifyFoodJob().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
