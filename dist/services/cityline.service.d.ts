export interface CityLineEvent {
    title: string;
    date: string;
    location: string;
    price: string;
    description: string;
    url: string;
    imageUrl: string;
}
export interface CityLineCredentials {
    email: string;
    password: string;
    otp?: string;
}
declare class CityLineService {
    baseUrl: string;
    private browser;
    private sessionStoragePath;
    private cookiesPath;
    private storageStatePath;
    private sessionData;
    /**
     * Load session data from storage if it exists
     */
    private loadSession;
    /**
     * Save current session data to storage
     */
    private saveSession;
    private userAgents;
    private getRandomUserAgent;
    /**
     * Initialize the browser
     */
    private initBrowser;
    /**
     * Simulate human-like behavior on a page
     */
    private simulateHumanBehavior;
    /**
     * Check if the page has a login form or authentication requirement
     * and attempt to bypass it if possible, or log in if credentials are provided
     *
     * Note: For Cityline's OTP-based authentication, this function will need manual intervention
     * to enter the OTP code that gets sent to the email address.
     */
    private checkAndBypassLoginForm;
    /**
     * Scrape events from CityLine
     * @param limit Number of events to scrape
     * @param credentials Optional login credentials (Note: Cookie-based auth is preferred)
     * @param useCookieAuth Whether to use cookie-based authentication (default: true)
     */
    scrapeEvents(limit?: number, credentials?: CityLineCredentials, useCookieAuth?: boolean): Promise<CityLineEvent[]>;
}
declare const _default: CityLineService;
export default _default;
//# sourceMappingURL=cityline.service.d.ts.map