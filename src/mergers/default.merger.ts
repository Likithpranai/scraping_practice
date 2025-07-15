import { IMerger } from './IMerger';
import { ScrapedData, ScrapingResult } from '@/types/data.models';
import logger from '@/utils/logger';

export class DefaultMerger extends IMerger {
  merge(results: ScrapingResult[]): ScrapedData[] {
    logger.debug('Starting default merge process', { resultCount: results.length });
    
    const mergedMap = new Map<string, ScrapedData>();
    
    // Flatten all results and create a map to handle duplicates
    for (const result of results) {
      for (const item of result.data) {
        const key = this.generateUniqueKey(item);
        
        if (!mergedMap.has(key)) {
          mergedMap.set(key, item);
        } else {
          // If duplicate exists, keep the one with more complete data
          const existing = mergedMap.get(key)!;
          const merged = this.mergeItems(existing, item);
          mergedMap.set(key, merged);
        }
      }
    }
    
    const finalResults = Array.from(mergedMap.values());
    logger.debug('Completed default merge process', { 
      inputItems: results.reduce((sum, r) => sum + r.data.length, 0),
      outputItems: finalResults.length 
    });
    
    return finalResults;
  }
  
  private mergeItems(existing: ScrapedData, newItem: ScrapedData): ScrapedData {
    // Simple merge strategy: prefer non-empty values from newItem, fallback to existing
    const merged: any = { ...existing };
    
    Object.keys(newItem).forEach(key => {
      const newValue = (newItem as any)[key];
      const existingValue = merged[key];
      
      // Prefer non-empty values
      if (newValue && (!existingValue || this.isEmptyValue(existingValue))) {
        merged[key] = newValue;
      }
    });
    
    return merged;
  }
  
  private isEmptyValue(value: any): boolean {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string' && value.trim() === '') return true;
    if (Array.isArray(value) && value.length === 0) return true;
    if (typeof value === 'object' && Object.keys(value).length === 0) return true;
    return false;
  }
}
