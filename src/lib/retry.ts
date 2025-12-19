import { sleep } from './utils';

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Check if it's a rate limit error
      if (error.status === 429 || error.message?.includes('429')) {
        const delay = initialDelay * Math.pow(2, i); // Exponential backoff
        console.log(`Rate limited, retrying in ${delay}ms...`);
        await sleep(delay);
        continue;
      }
      
      // If not rate limit, throw immediately
      throw error;
    }
  }
  
  throw lastError!;
}
