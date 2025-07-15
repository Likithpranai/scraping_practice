import { IMerger } from './IMerger';
import { ScrapedData, ScrapingResult } from '@/types/data.models';
export declare class DefaultMerger extends IMerger {
    merge(results: ScrapingResult[]): ScrapedData[];
    private mergeItems;
    private isEmptyValue;
}
//# sourceMappingURL=default.merger.d.ts.map