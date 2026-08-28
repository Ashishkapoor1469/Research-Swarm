import { dbStore } from '../lib/firestore';

async function runMigration() {
  console.log('===================================================');
  console.log('📦 ONE-TIME MIGRATION: UNCATEGORIZED WORKSPACE ASSIGNMENT');
  console.log('===================================================\n');

  const ownerId = 'user-default';

  // 1. Get or create Uncategorized workspace
  const workspaces = await dbStore.listWorkspaces(ownerId);
  let uncategorizedWs = workspaces.find(w => w.name === 'Uncategorized');

  if (!uncategorizedWs) {
    console.log('Creating default "Uncategorized" workspace...');
    uncategorizedWs = await dbStore.createWorkspace(
      ownerId,
      'Uncategorized',
      'Default workspace for legacy research files created before workspaces were introduced.',
      '#a39e93'
    );
    console.log(`Created workspace: [${uncategorizedWs.id}] "${uncategorizedWs.name}"`);
  } else {
    console.log(`Found existing "Uncategorized" workspace: [${uncategorizedWs.id}]`);
  }

  // 2. Fetch all jobs and find orphaned jobs without workspaceId
  const allJobs = await dbStore.listJobsInWorkspace(''); // or fetch orphaned
  let migratedCount = 0;

  for (const job of allJobs) {
    if (!job.workspaceId) {
      console.log(`Migrating orphaned job [${job.id}]: "${job.question.slice(0, 50)}..." -> Workspace [${uncategorizedWs.id}]`);
      await dbStore.updateJob(job.id, { workspaceId: uncategorizedWs.id });
      migratedCount++;
    }
  }

  if (migratedCount > 0) {
    await dbStore.updateWorkspaceFileCount(uncategorizedWs.id, migratedCount);
  }

  console.log('\n================ MIGRATION COMPLETE ================');
  console.log(`Total Orphaned Jobs Migrated: ${migratedCount}`);
  console.log(`Uncategorized Workspace File Count: ${uncategorizedWs.fileCount + migratedCount}`);
  console.log('====================================================\n');

  process.exit(0);
}

runMigration().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
