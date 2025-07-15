import { IWorkflow } from './IWorkflow';
import { SupportedLocation, LocationOption } from '@/types/api.types';
export declare class WorkflowFactory {
    static getWorkflow(location: SupportedLocation, option: LocationOption): IWorkflow;
    static getSupportedWorkflows(): string[];
    static isWorkflowSupported(location: string, option: string): boolean;
}
//# sourceMappingURL=workflow.factory.d.ts.map