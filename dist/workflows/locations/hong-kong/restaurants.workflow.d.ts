import { IWorkflow } from '@/workflows/IWorkflow';
import { Restaurant } from '@/types/data.models';
export declare class HongKongRestaurantsWorkflow extends IWorkflow<Restaurant> {
    private merger;
    constructor();
    execute(): Promise<Restaurant[]>;
}
//# sourceMappingURL=restaurants.workflow.d.ts.map