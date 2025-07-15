import { IWorkflow } from './IWorkflow';
import { HongKongRestaurantsWorkflow } from './locations/hong-kong/restaurants.workflow';
import { SupportedLocation, LocationOption } from '@/types/api.types';
import logger from '@/utils/logger';

export class WorkflowFactory {
  static getWorkflow(location: SupportedLocation, option: LocationOption): IWorkflow {
    const workflowKey = `${location}-${option}`;
    
    logger.debug(`Creating workflow for: ${workflowKey}`);

    switch (workflowKey) {
      case 'hong-kong-restaurants':
        return new HongKongRestaurantsWorkflow();
      
      // Add more workflows as they're implemented
      // case 'hong-kong-attractions':
      //   return new HongKongAttractionsWorkflow();
      // case 'tokyo-restaurants':
      //   return new TokyoRestaurantsWorkflow();
      
      default:
        throw new Error(`Unsupported workflow: ${workflowKey}. Available workflows: hong-kong-restaurants`);
    }
  }

  static getSupportedWorkflows(): string[] {
    return [
      'hong-kong-restaurants',
      // Add more as they're implemented
    ];
  }

  static isWorkflowSupported(location: string, option: string): boolean {
    const workflowKey = `${location}-${option}`;
    return this.getSupportedWorkflows().includes(workflowKey);
  }
}
