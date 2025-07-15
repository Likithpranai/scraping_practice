interface EventDetail {
    name: string;
    artist: string;
    date: string;
    location: string;
    ticketPrice: string;
    information: string;
    url: string;
    imageUrl?: string;
}
declare class LiveContentService {
    private url;
    /**
     * Simulates human-like behavior on a page to avoid detection
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
     * Navigate to the next page if available
     */
    private goToNextPage;
    /**
     * Scrape all events from Live Nation HK
     */
    scrapeEvents(): Promise<EventDetail[]>;
    /**
     * Scrape a single event page
     */
    scrapeEventPage(eventUrl: string): Promise<EventDetail | null>;
}
declare const _default: LiveContentService;
export default _default;
//# sourceMappingURL=liveContent.service.d.ts.map