import { IMerger } from '../IMerger';
import { Restaurant } from '@/types/restaurant.model';
import { ScrapingResult } from '@/types/data.models';
export declare class HongKongRestaurantsMerger extends IMerger<Restaurant> {
    merge(results: ScrapingResult<Restaurant>[]): Restaurant[];
    private generateRestaurantKey;
    private findCandidates;
    private intelligentMerge;
}
//# sourceMappingURL=hong-kong-restaurants.merger.d.ts.map