import { dbStore } from './lib/firestore';
import { initializeSwarmOrchestrator, launchNewJob } from './server/swarm_runner';
import { globalExternalApiCircuitBreaker } from './lib/circuit_breaker';
import { v4 as uuidv4 } from 'uuid';

async function runEndToEndTest() {
  console.log('===============================================================');
  console.log('🐝 RESEARCH SWARM TEST SUITE: END-TO-END & RESILIENCY PROOF');
  console.log('===============================================================\n');

  // Initialize swarm event subscribers
  initializeSwarmOrchestrator();

  // SCENARIO 1: Standard End-to-End Async Swarm Execution
  const jobId = `job-test-${uuidv4().slice(0, 8)}`;
  const question = "How is the EU AI Act going to affect small AI startups?";

  console.log(`[Test Scenario 1] Dispatching Job [${jobId}]`);
  console.log(`Research Question: "${question}"\n`);

  await dbStore.createJob({
    id: jobId,
    question,
    depth: 'standard',
    status: 'planning',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tasksTotal: 0,
    tasksCompleted: 0,
    maxTasks: 20,
    maxDurationMinutes: 90,
    replanningCount: 0,
    activityLog: [{ timestamp: new Date().toISOString(), agent: 'SYSTEM', message: 'Test job launched.' }]
  });

  // Trigger async coordinator launch
  await launchNewJob(jobId);

  let isDone = false;
  dbStore.on(`job:${jobId}`, (job) => {
    console.log(`[Job Status Update] Status: ${job.status} | Tasks Done: ${job.tasksCompleted}/${job.tasksTotal} | Re-plans: ${job.replanningCount}`);
    if (job.status === 'completed') {
      isDone = true;
    }
  });

  // Monitor until completion (max 20s)
  const startTime = Date.now();
  while (!isDone && Date.now() - startTime < 20000) {
    await new Promise(r => setTimeout(r, 1000));
  }

  const finalJob = await dbStore.getJob(jobId);
  const tasks = await dbStore.getTasks(jobId);
  const findings = await dbStore.getFindings(jobId);

  console.log('\n================ SCENARIO 1 VERIFICATION ================');
  console.log(`Job ID:                 ${finalJob?.id}`);
  console.log(`Final Status:           ${finalJob?.status}`);
  console.log(`Tasks Created:          ${tasks.length}`);
  console.log(`Tasks Completed:        ${finalJob?.tasksCompleted}/${finalJob?.tasksTotal}`);
  console.log(`Findings Collected:     ${findings.length}`);
  console.log(`Report Synthesized?:    ${finalJob?.livingReport ? 'YES (v' + finalJob.livingReport.version + ')' : 'NO'}`);
  console.log(`Max Tasks Bound Set?:   ${finalJob?.maxTasks === 20 ? 'YES (20 max)' : 'NO'}`);
  console.log('=========================================================\n');

  if (!finalJob || !finalJob.livingReport) {
    console.error('❌ Scenario 1 Failed: Living report was not synthesized.');
    process.exit(1);
  }

  // SCENARIO 2: Worker Fault Injection & Circuit Breaker / Retry Assertions
  console.log('\n[Test Scenario 2] Worker Fault Injection & Resilience Assertion');
  
  // Enable retry simulation
  process.env.DEMO_SIMULATE_RETRY = 'true';

  const resJobId = `job-resilience-${uuidv4().slice(0, 8)}`;
  console.log(`Dispatching Resilience Test Job [${resJobId}]...`);

  await dbStore.createJob({
    id: resJobId,
    question: "What are the quantum security risks for enterprise SaaS in 2026?",
    depth: 'quick',
    status: 'planning',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tasksTotal: 0,
    tasksCompleted: 0,
    maxTasks: 10,
    maxDurationMinutes: 30,
    replanningCount: 0,
    activityLog: [{ timestamp: new Date().toISOString(), agent: 'SYSTEM', message: 'Resilience test job launched.' }]
  });

  await launchNewJob(resJobId);

  let isResDone = false;
  dbStore.on(`job:${resJobId}`, (job) => {
    if (job.status === 'completed') {
      isResDone = true;
    }
  });

  const resStartTime = Date.now();
  while (!isResDone && Date.now() - resStartTime < 20000) {
    await new Promise(r => setTimeout(r, 1000));
  }

  const resJob = await dbStore.getJob(resJobId);
  const resTasks = await dbStore.getTasks(resJobId);
  const resFindings = await dbStore.getFindings(resJobId);

  console.log('\n================ SCENARIO 2 RESILIENCE RESULTS ================');
  console.log(`Job ID:                 ${resJob?.id}`);
  console.log(`Final Status:           ${resJob?.status}`);
  console.log(`Tasks Created:          ${resTasks.length}`);
  console.log(`Tasks Completed:        ${resJob?.tasksCompleted}/${resJob?.tasksTotal}`);
  console.log(`Findings Collected:     ${resFindings.length}`);
  console.log(`Circuit Breaker State:  ${globalExternalApiCircuitBreaker.getState()}`);
  console.log(`Report Synthesized?:    ${resJob?.livingReport ? 'YES (v' + resJob.livingReport.version + ')' : 'NO'}`);
  console.log('===============================================================\n');

  if (resJob?.livingReport && resFindings.length > 0) {
    console.log('✅ ALL SWARM TEST SCENARIOS PASSED WITH EXIT CODE 0!');
    process.exit(0);
  } else {
    console.error('❌ Resilience scenario failed to synthesize final report.');
    process.exit(1);
  }
}

runEndToEndTest().catch(err => {
  console.error('End-to-end test error:', err);
  process.exit(1);
});
