import { dbStore } from '../lib/firestore';
import { GeminiService } from '../lib/gemini';
import { LivingReport } from '../lib/types';

/**
 * Synthesizer Agent living report generator.
 * Aggregates all completed worker findings, clusters them into logical themes,
 * formats hyperlinked inline citations, tracks open sub-questions, and updates
 * the living Markdown report in Firestore.
 * 
 * @param jobId The unique ID of the target ResearchJob
 */
export async function runSynthesizer(jobId: string): Promise<LivingReport | null> {
  const traceId = jobId;
  const job = await dbStore.getJob(jobId);
  if (!job) return null;

  console.log(`[Synthesizer Agent] [traceId=${traceId}] Re-synthesizing living report for Job [${jobId}]...`);
  await dbStore.addActivityLog(jobId, 'SYNTHESIZER', 'Re-clustering findings into themes and updating living Markdown report with citations...', { traceId });

  const findings = await dbStore.getFindings(jobId);
  const tasks = await dbStore.getTasks(jobId);
  
  const pendingOrRunningTasks = tasks.filter(t => t.status === 'pending' || t.status === 'running');
  const openSubquestions = pendingOrRunningTasks.map(t => t.subquestion);

  const previousVersion = job.livingReport ? job.livingReport.version : 0;
  const currentVersion = previousVersion + 1;

  const synthesis = await GeminiService.generateLivingReport(job.question, findings, openSubquestions);

  const report: LivingReport = {
    version: currentVersion,
    executiveSummary: synthesis.executiveSummary,
    themes: synthesis.themes,
    stillInvestigating: openSubquestions,
    fullMarkdown: synthesis.fullMarkdown,
    updatedAt: new Date().toISOString()
  };

  await dbStore.updateLivingReport(jobId, report);

  const isFinal = pendingOrRunningTasks.length === 0 && tasks.length > 0;
  if (isFinal) {
    await dbStore.updateJob(jobId, { status: 'completed' });
    await dbStore.addActivityLog(
      jobId, 
      'SYNTHESIZER', 
      `🎉 Final Synthesis Complete! Published Report v${currentVersion} with ${findings.length} findings, ${report.themes.length} themes, and full inline citations.`
    );
  } else {
    await dbStore.addActivityLog(
      jobId, 
      'SYNTHESIZER', 
      `📝 Living Report v${currentVersion} updated. ${openSubquestions.length} open sub-questions still being researched by worker fleet.`
    );
  }

  return report;
}
