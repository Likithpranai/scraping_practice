import { IWorkflow } from '@/workflows/IWorkflow';
import { Restaurant } from '@/types/data.models';
import { OpenRiceHighestRatingStrategy } from '@/strategies/locations/hong-kong/restaurants/openrice.highest_rating.strategy';
import { HongKongRestaurantsMerger } from '@/mergers/locations/hong-kong-restaurants.merger';
import logger from '@/utils/logger';
import { OpenRiceMostBookmarkedStrategy } from '@/strategies/locations/hong-kong/restaurants/openrice.most_bookmarked.strategy';
import { OpenRiceMostPopularStrategy } from '@/strategies/locations/hong-kong/restaurants/openrice.most_popular';

export class HongKongRestaurantsWorkflow extends IWorkflow<Restaurant> {
  private merger: HongKongRestaurantsMerger;

  constructor() {
    super('hong-kong', 'restaurants');
    this.merger = new HongKongRestaurantsMerger();
  }

  async execute(): Promise<Restaurant[]> {
    logger.info(`Starting workflow: ${this.location}-${this.option}`);
    const startTime = Date.now();

    try {
      // Initialize strategies for this location:option pair
      const strategies = [
        new OpenRiceHighestRatingStrategy(),
        new OpenRiceMostBookmarkedStrategy(),
        new OpenRiceMostPopularStrategy(),
        // Add more strategies here as they're implemented
        // new GoogleMapsStrategy(),
        // new TripAdvisorStrategy(),
      ];

      logger.debug(`Executing ${strategies.length} strategies in parallel`);

      // Execute all strategies in parallel
      const results = await Promise.allSettled(
        strategies.map(strategy => strategy.get_info())
      );

      // Filter successful results
      const successfulResults = results
        .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
        .map(result => result.value);

      // Log any failed strategies
      const failedResults = results.filter(result => result.status === 'rejected');
      if (failedResults.length > 0) {
        logger.warn(`${failedResults.length} strategies failed`, {
          errors: failedResults.map(r => (r as PromiseRejectedResult).reason.message)
        });
      }

      if (successfulResults.length === 0) {
        throw new Error('All scraping strategies failed');
      }

      logger.debug(`Merging results from ${successfulResults.length} successful strategies`);

      // Merge results using the custom merger
      const mergedData = this.merger.merge(successfulResults);

      const processingTime = Date.now() - startTime;
      logger.info(`Completed workflow: ${this.location}-${this.option}`, {
        strategiesExecuted: strategies.length,
        strategiesSuccessful: successfulResults.length,
        finalRestaurantCount: mergedData.length,
        processingTimeMs: processingTime
      });

      return mergedData;

    } catch (error: any) {
      logger.error(`Workflow failed: ${this.location}-${this.option}`, { error: error.message });
      throw error;
    }
  }
}
