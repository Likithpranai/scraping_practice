/**
 * @file Defines common, reusable data structures and type definitions used across
 * different data models like Restaurant and Activity.
 */
/**
 * Defines the possible categories for classifying the type of experience offered.
 * This is a distribution of 100 scores among the tags.
 */
export type TagTypeCategory = 'Food' | 'Art & Culture' | 'History' | 'Nature' | 'Leisure' | 'Adventure' | 'Shopping' | 'Entertainment' | 'Photography' | 'Sports' | 'Hidden Gems' | 'Wellness' | 'Nightlife' | 'Educational';
/**
 * Defines the possible budget levels.
 * This is a one-hot encoding where only one tag can be active (1).
 */
export type TagBudgetCategory = 'Free' | 'Budget friendly' | 'Moderately priced' | 'High-end' | 'Luxury';
/**
 * Defines the suitability for different social groups.
 * This is a distribution of 100 scores among the tags.
 */
export type TagGroupCategory = 'Date' | 'Friends' | 'Family' | 'Colleagues' | 'Business';
/**
 * Represents the details of a specific recognition, award, or notable mention.
 * This structure allows for a descriptive text and an optional source URL.
 */
export interface RecognitionDetail {
    /**
     * The source of the recognition, such as "Michelin Guide", "Tripadvisor", etc.
     * @example "Michelin Guide"
     * @example "Time Out"
     */
    source: string;
    /**
     * The descriptive text of the recognition.
     * @example "Listed as one of Hong Kong's most unique cultural festivals"
     * @example "Bib Gourmand Award 2023"
     */
    text: string;
    /**
     * An optional URL pointing to the source of the recognition for verification.
     * Can be null if no direct link is available.
     * @example "https://www.unesco...."
     */
    url: string | null;
}
//# sourceMappingURL=common.model.d.ts.map