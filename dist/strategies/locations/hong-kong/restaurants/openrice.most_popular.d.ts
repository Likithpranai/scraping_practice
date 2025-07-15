import { IStrategy } from '@/strategies/IStrategy';
import { Restaurant } from '@/types/restaurant.model';
import { ScrapingResult } from '@/types/data.models';
export declare class OpenRiceMostPopularStrategy extends IStrategy<Restaurant> {
    private readonly baseUrl;
    constructor();
    get_info(): Promise<ScrapingResult<Restaurant>>;
}
//# sourceMappingURL=openrice.most_popular.d.ts.map