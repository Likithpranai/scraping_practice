interface EventDetail {
    name: string;
    artist: string;
    date: string;
    showTime: string;
    location: string;
    ticketPrice: string;
    information: string;
    url: string;
    imageUrl?: string;
}
export declare class LiveContentService {
    private url;
    private simulateHumanBehavior;
    private extractEventDetails;
    private getEventLinks;
    private goToNextPage;
    scrapeEvents(): Promise<EventDetail[]>;
    scrapeEventPage(eventUrl: string): Promise<EventDetail | null>;
}
declare const _default: LiveContentService;
export default _default;
//# sourceMappingURL=liveContent.service.d.ts.map