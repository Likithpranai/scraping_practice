import { ScrapedData } from '@/types/data.models';

export abstract class IWorkflow<T = ScrapedData> {
  protected location: string;
  protected option: string;

  constructor(location: string, option: string) {
    this.location = location;
    this.option = option;
  }

  abstract execute(): Promise<T[]>;
}
