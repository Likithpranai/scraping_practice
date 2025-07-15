interface EventDetail {
    title: string;
    description?: string;
    date?: string;
    location?: string;
    price?: string;
    organizer?: string;
    url: string;
    additionalDetails?: Record<string, string>;
}
declare class SiteContentService {
    private url;
    /**
     * Simulates human-like behavior on a page
     */
    private simulateHumanBehavior;
    /**
     * Extract event details from an individual event page
     */
    private extractEventDetails;
    /**
     * Get all event links from the main page
     */
    private getEventLinks;
    /**
     * Navigate to the next page using a direct and forceful approach
     */
    private goToNextPage;
    /**
     * Launch a browser instance with stealth plugin
     */
    private launchBrowser;
    /**
     * Navigate to a specific page by manipulating the pagination input field
     * This focuses specifically on the input field with class '.toggle-page_input'
     */
    private goToSpecificPage;
    /**
     * Helper function to retry operations with exponential backoff
     */
    private retryOperation;
    /**
     * Get content from the main events page and extract details from individual event pages
     * with improved error handling and retry logic
     */
    getSiteContent(url?: string, maxEvents?: number, startPage?: number): Promise<{
        events: EventDetail[];
    }>;
}
declare const _default: SiteContentService;
export default _default;
//# sourceMappingURL=siteContent.service.d.ts.map