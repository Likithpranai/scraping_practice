/**
 * @file Defines the core data structure for a PartialRestaurant entity.
 */
import { RecognitionDetail } from './common.model';
/**
 * The primary interface for a PartialRestaurant object.
 */
export interface PartialRestaurant {
    /**
     * The primary, English-language name of the establishment.
     * @example "Yat Lok"
     */
    name: string;
    /**
     * The full, formatted mailing address of the restaurant.
     * @example "Yat Lok, G/F, 34-38 Stanley Street, Central, Hong Kong"
     */
    address: string;
    /**
       * A collection of awards, accolades, or notable mentions from various sources.
       * The key is the source (e.g., "Michelin Guide"), and the value is a `RecognitionDetail` object.
       * If this is from a scraping strategy result, it will only have one key.
       * If this is from a merger, it may have multiple keys.
       */
    recognition: Record<string, RecognitionDetail>;
}
//# sourceMappingURL=restaurant.partial.model.d.ts.map