import { ScrapedData } from '@/types/data.models';
export declare abstract class IWorkflow<T = ScrapedData> {
    protected location: string;
    protected option: string;
    constructor(location: string, option: string);
    abstract execute(): Promise<T[]>;
}
//# sourceMappingURL=IWorkflow.d.ts.map