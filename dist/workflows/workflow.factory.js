"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowFactory = void 0;
const restaurants_workflow_1 = require("./locations/hong-kong/restaurants.workflow");
const logger_1 = __importDefault(require("@/utils/logger"));
class WorkflowFactory {
    static getWorkflow(location, option) {
        const workflowKey = `${location}-${option}`;
        logger_1.default.debug(`Creating workflow for: ${workflowKey}`);
        switch (workflowKey) {
            case 'hong-kong-restaurants':
                return new restaurants_workflow_1.HongKongRestaurantsWorkflow();
            // Add more workflows as they're implemented
            // case 'hong-kong-attractions':
            //   return new HongKongAttractionsWorkflow();
            // case 'tokyo-restaurants':
            //   return new TokyoRestaurantsWorkflow();
            default:
                throw new Error(`Unsupported workflow: ${workflowKey}. Available workflows: hong-kong-restaurants`);
        }
    }
    static getSupportedWorkflows() {
        return [
            'hong-kong-restaurants',
            // Add more as they're implemented
        ];
    }
    static isWorkflowSupported(location, option) {
        const workflowKey = `${location}-${option}`;
        return this.getSupportedWorkflows().includes(workflowKey);
    }
}
exports.WorkflowFactory = WorkflowFactory;
//# sourceMappingURL=workflow.factory.js.map