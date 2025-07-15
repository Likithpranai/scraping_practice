import * as cheerio from 'cheerio';
export interface ScrapingOptions {
    waitForSelector?: string;
    timeout?: number;
    userAgent?: string;
    viewport?: {
        width: number;
        height: number;
    };
}
export interface ScrapedPage {
    url: string;
    title: string;
    content: string;
    html: string;
    $: cheerio.CheerioAPI;
}
export declare class ScraperService {
    private browser;
    private context;
    initBrowser(): Promise<void>;
    closeBrowser(): Promise<void>;
    scrapePage(url: string, options?: ScrapingOptions): Promise<ScrapedPage>;
    scrapeMultiplePages(urls: string[], options?: ScrapingOptions): Promise<ScrapedPage[]>;
    scrapeWithAxios(url: string): Promise<{
        $: cheerio.CheerioAPI;
        content: string;
        title: string;
    }>;
    extractLinks(html: string, selector: string, baseUrl?: string): Promise<Array<{
        title: string;
        url: string;
    }>>;
}
declare const _default: ScraperService;
export default _default;
//# sourceMappingURL=scraper.service.d.ts.map