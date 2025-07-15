"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenRiceHighestRatingStrategy = void 0;
const IStrategy_1 = require("@/strategies/IStrategy");
const scraper_service_1 = __importDefault(require("@/services/scraper.service"));
const llm_service_1 = __importDefault(require("@/services/llm.service"));
const logger_1 = __importDefault(require("@/utils/logger"));
const playwright_1 = require("playwright");
class OpenRiceHighestRatingStrategy extends IStrategy_1.IStrategy {
    constructor() {
        super('hong-kong', 'restaurants', 'openrice');
        this.baseUrl = 'https://www.openrice.com/zh/hongkong/explore/chart/best-rating?_sUrl=https%3A%2F%2Fs.openrice.com%2FQrbe0000000';
    }
    async get_info() {
        const startTime = Date.now();
        logger_1.default.info(`Starting ${this.getStrategyName()} strategy`);
        const browser = await playwright_1.chromium.launch();
        try {
            const context = await browser.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' });
            const page = await context.newPage();
            await page.goto(this.baseUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
            // Step 1 & 2: Scrape the main page and extract restaurant links using a loop and XPaths.
            const restaurantLinks = [];
            const baseXPath = '//*[@id="layout"]/main/div/div/section/div[4]/div/div/section/div[1]/div[1]';
            for (let i = 1; i <= 30; i++) {
                // This XPath is constructed based on your examples.
                const xpath = `${baseXPath}/div[${i}]/div[2]/div[1]/div[1]/div/div[1]/div/a`;
                const linkLocator = page.locator(`xpath=${xpath}`);
                try {
                    await linkLocator.waitFor({ state: 'visible', timeout: 2000 });
                    const href = await linkLocator.getAttribute('href');
                    const title = (await linkLocator.innerText()).trim();
                    if (href && title) {
                        const fullUrl = new URL(href, this.baseUrl).toString();
                        restaurantLinks.push({ title, url: fullUrl });
                    }
                }
                catch (e) {
                    logger_1.default.debug(`XPath locator for index ${i} not found, continuing loop.`);
                }
            }
            logger_1.default.debug(`Found ${restaurantLinks.length} restaurant links`);
            if (restaurantLinks.length === 0) {
                logger_1.default.warn('No restaurant links found on OpenRice page. Strategy will exit.');
                return {
                    data: [],
                    metadata: {
                        strategy: this.getStrategyName(),
                        location: this.location,
                        option: this.option,
                        scraped_at: new Date(),
                        total_count: 0,
                        success_rate: 0
                    }
                };
            }
            // // Step 3: Filter relevant links using LLM
            // const filteredLinks = await llmService.filterRelevantLinks(
            //   restaurantLinks.slice(0, 50), // Limit to first 50 for efficiency
            //   this.location,
            //   this.option
            // );
            // logger.debug(`Filtered to ${filteredLinks.length} relevant restaurant links`);
            // Step 4: Scrape individual restaurant pages
            const restaurantPages = await scraper_service_1.default.scrapeMultiplePages(restaurantLinks.map(link => link.url).slice(0, 50) // Limit to 50 for this example
            );
            // Step 5: Generate structured data using LLM
            const restaurants = [];
            for (const page of restaurantPages) {
                try {
                    const structuredData = await llm_service_1.default.generateStructuredData(page.content, this.location, this.option);
                    if (structuredData) {
                        const recognizedData = structuredData.map(restaurant => ({
                            ...restaurant,
                            recognition: {
                                ...restaurant.recognition,
                                OpenRice: {
                                    source: 'OpenRice',
                                    text: 'Weekly Highest Rating',
                                    url: page.url
                                }
                            }
                        }));
                        restaurants.push(...recognizedData);
                    }
                }
                catch (e) {
                    logger_1.default.error(`Failed to generate structured data for ${page.title}`, { error: e });
                }
            }
            // Add metadata to each restaurant
            const enrichedRestaurants = restaurants.map(restaurant => ({
                ...restaurant,
                source_url: this.baseUrl,
                scraped_at: new Date()
            }));
            const processingTime = Date.now() - startTime;
            logger_1.default.info(`Completed ${this.getStrategyName()} strategy`, {
                restaurantCount: enrichedRestaurants.length,
                processingTimeMs: processingTime
            });
            return {
                data: enrichedRestaurants,
                metadata: {
                    strategy: this.getStrategyName(),
                    location: this.location,
                    option: this.option,
                    scraped_at: new Date(),
                    total_count: enrichedRestaurants.length,
                    success_rate: enrichedRestaurants.length / Math.max(restaurantLinks.length, 1)
                }
            };
        }
        catch (error) {
            logger_1.default.error(`Error in ${this.getStrategyName()} strategy`, { error: error.message });
            throw error;
        }
        finally {
            await browser.close();
        }
    }
}
exports.OpenRiceHighestRatingStrategy = OpenRiceHighestRatingStrategy;
//# sourceMappingURL=openrice.highest_rating.strategy.js.map