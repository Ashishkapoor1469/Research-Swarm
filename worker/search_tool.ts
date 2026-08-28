import { GeminiService, WorkerSearchResult } from '../lib/gemini';

/**
 * Worker search tool integration wrapper.
 * Invokes Gemini 2.5 Flash with Google Search grounding tool to gather factual web evidence.
 * 
 * @param subquestion Target sub-question to research
 * @param searchHint Keyword or domain search strategy hint
 */
export async function performWorkerResearch(subquestion: string, searchHint: string): Promise<WorkerSearchResult> {
  console.log(`[Worker Search Tool] Executing grounded research query: "${subquestion}" (Hint: "${searchHint}")`);
  return await GeminiService.executeWorkerSearch(subquestion, searchHint);
}
