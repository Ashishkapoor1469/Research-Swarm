import { globalExternalApiCircuitBreaker } from '../lib/circuit_breaker';

/**
 * Exponential backoff retry handler integrated with Circuit Breaker pattern.
 * If the global external API circuit breaker is OPEN, retries fail fast immediately
 * to avoid hammering failing external dependencies.
 */
export async function retryWithExponentialBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  initialDelayMs: number = 1000,
  onAttemptFailed?: (attempt: number, error: Error) => void
): Promise<T> {
  let attempt = 1;
  let delay = initialDelayMs;

  while (attempt <= maxAttempts) {
    try {
      // Execute function wrapped in Circuit Breaker check
      return await globalExternalApiCircuitBreaker.execute(fn);
    } catch (err) {
      if (onAttemptFailed) {
        onAttemptFailed(attempt, err as Error);
      }
      if (attempt >= maxAttempts) {
        throw err;
      }
      
      // If Circuit Breaker is OPEN, fail fast without waiting for retry loop
      if (globalExternalApiCircuitBreaker.getState() === 'OPEN') {
        console.error(`[Worker Retry] Circuit Breaker is OPEN. Aborting retries for fast failure.`);
        throw err;
      }

      console.warn(`[Worker Retry] Attempt ${attempt}/${maxAttempts} failed: ${(err as Error).message}. Retrying in ${delay}ms...`);
      await new Promise(res => setTimeout(res, delay));
      delay *= 2;
      attempt++;
    }
  }

  throw new Error(`Failed after ${maxAttempts} attempts.`);
}
