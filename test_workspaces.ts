import { dbStore } from './lib/firestore';
import { v4 as uuidv4 } from 'uuid';

async function runWorkspacesTestSuite() {
  console.log('===============================================================');
  console.log('🧪 WORKSPACES FEATURE VERIFICATION TEST SUITE');
  console.log('===============================================================\n');

  const ownerId = 'user-test-workspaces';

  // 1. Create Workspace
  console.log('1. Creating test workspace "Food Research"...');
  const ws = await dbStore.createWorkspace(ownerId, 'Food Research', 'Collection of food industry analysis reports', '#d97745');
  console.log(`✓ Workspace created: ID=[${ws.id}], Name="${ws.name}", Initial fileCount=${ws.fileCount}`);

  if (ws.fileCount !== 0) {
    throw new Error(`Expected initial fileCount=0, got ${ws.fileCount}`);
  }

  // 2. Create Job 1 in workspace
  console.log('\n2. Creating Job 1 ("Global street food trends") in workspace...');
  const job1Id = `job-test-ws-1-${uuidv4().slice(0, 8)}`;
  await dbStore.createJob({
    id: job1Id,
    workspaceId: ws.id,
    fileName: 'Global street food trends',
    question: 'What are the global street food culinary trends for 2026?',
    depth: 'quick',
    status: 'planning',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tasksTotal: 0,
    tasksCompleted: 0,
    maxTasks: 10,
    maxDurationMinutes: 30,
    replanningCount: 0,
    activityLog: []
  });

  // 3. Create Job 2 in workspace
  console.log('3. Creating Job 2 ("Plant-based protein market") in workspace...');
  const job2Id = `job-test-ws-2-${uuidv4().slice(0, 8)}`;
  await dbStore.createJob({
    id: job2Id,
    workspaceId: ws.id,
    fileName: 'Plant-based protein market',
    question: 'What is the market outlook for alternative plant-based proteins?',
    depth: 'quick',
    status: 'planning',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tasksTotal: 0,
    tasksCompleted: 0,
    maxTasks: 10,
    maxDurationMinutes: 30,
    replanningCount: 0,
    activityLog: []
  });

  // 4. Confirm fileCount is 2
  const updatedWs1 = await dbStore.getWorkspace(ws.id);
  console.log(`\n4. Checking fileCount on workspace [${ws.id}]...`);
  console.log(`✓ fileCount = ${updatedWs1?.fileCount}`);
  if (updatedWs1?.fileCount !== 2) {
    throw new Error(`Expected fileCount=2, got ${updatedWs1?.fileCount}`);
  }

  // 5. Confirm listJobsInWorkspace returns both jobs
  console.log('\n5. Listing jobs in workspace...');
  const jobsInWs = await dbStore.listJobsInWorkspace(ws.id);
  console.log(`✓ Retrieved ${jobsInWs.length} jobs in workspace: ${jobsInWs.map(j => j.fileName).join(', ')}`);
  if (jobsInWs.length !== 2) {
    throw new Error(`Expected 2 jobs in workspace, got ${jobsInWs.length}`);
  }

  // 6. Delete Job 1 -> confirm fileCount decrements to 1
  console.log(`\n6. Deleting Job 1 [${job1Id}]...`);
  await dbStore.deleteJob(job1Id);
  const updatedWs2 = await dbStore.getWorkspace(ws.id);
  console.log(`✓ fileCount after Job 1 deletion = ${updatedWs2?.fileCount}`);
  if (updatedWs2?.fileCount !== 1) {
    throw new Error(`Expected fileCount=1 after single job deletion, got ${updatedWs2?.fileCount}`);
  }

  // 7. Delete Workspace with confirm=true -> confirm cascade-delete removed remaining job
  console.log(`\n7. Cascade-deleting workspace [${ws.id}] with confirm=true...`);
  await dbStore.deleteWorkspace(ws.id, true);

  const deletedWs = await dbStore.getWorkspace(ws.id);
  const deletedJob2 = await dbStore.getJob(job2Id);
  console.log(`✓ Workspace exists after deletion?: ${deletedWs !== null ? 'YES' : 'NO'}`);
  console.log(`✓ Remaining Job 2 exists after cascade-delete?: ${deletedJob2 !== null ? 'YES' : 'NO'}`);

  if (deletedWs !== null || deletedJob2 !== null) {
    throw new Error('Cascade-delete failed: workspace or remaining job still exists.');
  }

  console.log('\n===============================================================');
  console.log('✅ ALL WORKSPACES FEATURE VERIFICATION TESTS PASSED WITH EXIT CODE 0!');
  console.log('===============================================================\n');

  process.exit(0);
}

runWorkspacesTestSuite().catch(err => {
  console.error('Workspaces test error:', err);
  process.exit(1);
});
