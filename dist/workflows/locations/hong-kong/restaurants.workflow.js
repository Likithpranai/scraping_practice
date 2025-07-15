"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HongKongRestaurantsWorkflow = void 0;
const IWorkflow_1 = require("@/workflows/IWorkflow");
const openrice_highest_rating_strategy_1 = require("@/strategies/locations/hong-kong/restaurants/openrice.highest_rating.strategy");
const hong_kong_restaurants_merger_1 = require("@/mergers/locations/hong-kong-restaurants.merger");
const logger_1 = __importDefault(require("@/utils/logger"));
const openrice_most_bookmarked_strategy_1 = require("@/strategies/locations/hong-kong/restaurants/openrice.most_bookmarked.strategy");
const openrice_most_popular_1 = require("@/strategies/locations/hong-kong/restaurants/openrice.most_popular");
class HongKongRestaurantsWorkflow extends IWorkflow_1.IWorkflow {
    constructor() {
        super('hong-kong', 'restaurants');
        this.merger = new hong_kong_restaurants_merger_1.HongKongRestaurantsMerger();
    }
    async execute() {
        logger_1.default.info(`Starting workflow: ${this.location}-${this.option}`);
        const startTime = Date.now();
        try {
            // Initialize strategies for this location:option pair
            const strategies = [
                new openrice_highest_rating_strategy_1.OpenRiceHighestRatingStrategy(),
                new openrice_most_bookmarked_strategy_1.OpenRiceMostBookmarkedStrategy(),
                new openrice_most_popular_1.OpenRiceMostPopularStrategy(),
                // Add more strategies here as they're implemented
                // new GoogleMapsStrategy(),
                // new TripAdvisorStrategy(),
            ];
            logger_1.default.debug(`Executing ${strategies.length} strategies in parallel`);
            // Execute all strategies in parallel
            const results = await Promise.allSettled(strategies.map(strategy => strategy.get_info()));
            // Filter successful results
            const successfulResults = results
                .filter((result) => result.status === 'fulfilled')
                .map(result => result.value);
            // Log any failed strategies
            const failedResults = results.filter(result => result.status === 'rejected');
            if (failedResults.length > 0) {
                logger_1.default.warn(`${failedResults.length} strategies failed`, {
                    errors: failedResults.map(r => r.reason.message)
                });
            }
            if (successfulResults.length === 0) {
                throw new Error('All scraping strategies failed');
            }
            logger_1.default.debug(`Merging results from ${successfulResults.length} successful strategies`);
            // Merge results using the custom merger
            const mergedData = this.merger.merge(successfulResults);
            const processingTime = Date.now() - startTime;
            logger_1.default.info(`Completed workflow: ${this.location}-${this.option}`, {
                strategiesExecuted: strategies.length,
                strategiesSuccessful: successfulResults.length,
                finalRestaurantCount: mergedData.length,
                processingTimeMs: processingTime
            });
            return mergedData;
        }
        catch (error) {
            logger_1.default.error(`Workflow failed: ${this.location}-${this.option}`, { error: error.message });
            throw error;
        }
    }
}
exports.HongKongRestaurantsWorkflow = HongKongRestaurantsWorkflow;
//# sourceMappingURL=restaurants.workflow.js.map