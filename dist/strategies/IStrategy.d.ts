import { Restaurant, Activity, ScrapingResult } from '@/types/data.models';
export declare abstract class IStrategy<T = Restaurant | Activity> {
    protected location: string;
    protected option: string;
    protected siteName: string;
    constructor(location: string, option: string, siteName: string);
    abstract get_info(): Promise<ScrapingResult<T>>;
    protected getStrategyName(): string;
}
//# sourceMappingURL=IStrategy.d.ts.map