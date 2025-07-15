import { ScrapedData, ScrapingResult } from '@/types/data.models';

export abstract class IMerger<T = ScrapedData> {
  abstract merge(results: ScrapingResult<T>[]): T[];
  
  protected generateUniqueKey(item: T): string {
    // Default implementation - can be overridden
    const name = (item as any).name?.toLowerCase().replace(/\s+/g, '') || '';
    const address = (item as any).address?.toLowerCase().replace(/\s+/g, '') || '';
    return `${name}-${address}`;
  }
}
