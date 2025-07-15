import { Restaurant, Activity } from './data.models';
export interface ScrapeRequest {
    location: string;
    option: 'restaurants' | 'activities';
}
export interface ScrapeResponse<T = Restaurant | Activity> {
    success: boolean;
    data: T[];
    metadata: {
        location: string;
        option: string;
        total_count: number;
        strategies_used: string[];
        scraped_at: Date;
        processing_time_ms: number;
    };
    error?: string;
}
export interface ApiError {
    success: false;
    error: string;
    code: string;
    timestamp: Date;
}
export type LocationOption = 'restaurants' | 'activities';
export type SupportedLocation = 'hong-kong';
//# sourceMappingURL=api.types.d.ts.map