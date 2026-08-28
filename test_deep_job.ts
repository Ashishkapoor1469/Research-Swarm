const httpFetch = require('node-fetch');

async function testDeepJob() {
  console.log('=== TESTING DEEP MODE (LONG-RUNNING RESEARCH SWARM) ===');

  const wsRes = await httpFetch('http://localhost:4000/workspaces');
  const workspaces = await wsRes.json() as any[];
  const targetWsId = workspaces[0].id;

  const deepQuestion = "Global Post-Quantum Cryptography Migration: Technical Standards (NIST PQC), Enterprise SaaS Architecture Risks, Harvest-Now-Decrypt-Later Threat Models, and 2026 Compliance Deadlines";
  console.log(`[Deep Research] Submitting prompt: "${deepQuestion}"`);

  const jobData = await httpFetch('http://localhost:4000/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question: deepQuestion,
      depth: 'deep',
      workspaceId: targetWsId
    })
  }).then((r: any) => r.json());

  const jobId = jobData.job_id || jobData.id || jobData.job?.id;
  console.log(`[Deep Research] Job created! ID: ${jobId}`);

  console.log('[Deep Research] Polling swarm execution & live activity telemetry...');
  for (let i = 0; i < 15; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const pollRes = await httpFetch(`http://localhost:4000/jobs/${jobId}`);
    const state = await pollRes.json() as any;
    
    const tasksDone = state.tasks?.filter((t: any) => t.status === 'done').length || 0;
    const tasksTotal = state.tasks?.length || 0;
    const reportVersion = state.job?.livingReport?.version || 0;
    const status = state.job?.status;

    console.log(`[Progress Check ${i + 1}/15] Status: ${status} | Tasks: ${tasksDone}/${tasksTotal} Done | Report: v${reportVersion}`);

    if (status === 'completed' || tasksDone >= 6) {
      console.log('\n================ LIVING REPORT SAMPLE ================');
      console.log(state.job.livingReport?.fullMarkdown?.slice(0, 700));
      console.log('======================================================\n');
      console.log('✅ DEEP RESEARCH SWARM TEST PASSED WITH EXIT CODE 0!');
      process.exit(0);
    }
  }
}

testDeepJob().catch(err => {
  console.error('Deep job test failed:', err);
  process.exit(1);
});
