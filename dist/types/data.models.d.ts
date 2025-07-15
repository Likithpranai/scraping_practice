import { Restaurant } from './restaurant.model';
import { Activity } from './activity.model';
export type { Restaurant } from './restaurant.model';
export type { Activity } from './activity.model';
export type ScrapedData = Restaurant | Activity;
export interface ScrapingResult<T = ScrapedData> {
    data: T[];
    metadata: {
        strategy: string;
        location: string;
        option: string;
        scraped_at: Date;
        total_count: number;
        success_rate: number;
    };
}
//# sourceMappingURL=data.models.d.ts.map