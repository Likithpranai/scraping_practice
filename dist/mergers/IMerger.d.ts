import { ScrapedData, ScrapingResult } from '@/types/data.models';
export declare abstract class IMerger<T = ScrapedData> {
    abstract merge(results: ScrapingResult<T>[]): T[];
    protected generateUniqueKey(item: T): string;
}
//# sourceMappingURL=IMerger.d.ts.map