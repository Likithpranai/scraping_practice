interface EventDetail {
    name: string;
    dateTime: string;
    location: string;
    price: string;
    status?: string;
    about?: string;
    url: string;
    imageUrl?: string;
}
declare class EventFoodService {
    baseUrl: string;
    private simulateHumanBehavior;
    private extractEventCards;
    private getEventDetails;
    scrapeEventsFromPage(pageNumber?: number): Promise<EventDetail[]>;
    scrapeEvents(pages?: number): Promise<EventDetail[]>;
    scrapeAdditionalPages(pageNumbers: number[]): Promise<EventDetail[]>;
}
declare const _default: EventFoodService;
export default _default;
//# sourceMappingURL=eventFood.service.d.ts.map