import { Restaurant, Activity, ScrapingResult } from '@/types/data.models';

export abstract class IStrategy<T = Restaurant | Activity> {
  protected location: string;
  protected option: string;
  protected siteName: string;

  constructor(location: string, option: string, siteName: string) {
    this.location = location;
    this.option = option;
    this.siteName = siteName;
  }

  abstract get_info(): Promise<ScrapingResult<T>>;

  protected getStrategyName(): string {
    return `${this.location}-${this.option}-${this.siteName}`;
  }
}
