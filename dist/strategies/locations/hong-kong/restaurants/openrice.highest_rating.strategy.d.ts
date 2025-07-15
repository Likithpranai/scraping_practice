import { IStrategy } from '@/strategies/IStrategy';
import { Restaurant } from '@/types/restaurant.model';
import { ScrapingResult } from '@/types/data.models';
export declare class OpenRiceHighestRatingStrategy extends IStrategy<Restaurant> {
    private readonly baseUrl;
    constructor();
    get_info(): Promise<ScrapingResult<Restaurant>>;
}
//# sourceMappingURL=openrice.highest_rating.strategy.d.ts.map