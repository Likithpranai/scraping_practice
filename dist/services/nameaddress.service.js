"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NameAddressService = void 0;
const logger_1 = __importDefault(require("@/utils/logger"));
const llm_service_1 = require("@/services/llm.service");
const playwright_1 = require("playwright");
// In a real application, this would likely come from a config file or a database
const urlMap = {
    'hong-kong': {
        restaurants: [
            'https://www.openrice.com/zh/hongkong/explore/chart/most-bookmarked',
            'https://www.openrice.com/zh/hongkong/explore/chart/best-rating',
            'https://www.openrice.com/zh/hongkong/explore/chart/most-popular',
            'https://guide.michelin.com/hk/en/hong-kong-region/hong-kong/restaurants/page/1?sort=distance',
            'https://guide.michelin.com/hk/en/hong-kong-region/hong-kong/restaurants/page/2?sort=distance',
            'https://guide.michelin.com/hk/en/hong-kong-region/hong-kong/restaurants/page/3?sort=distance',
            'https://guide.michelin.com/hk/en/hong-kong-region/hong-kong/restaurants/page/4?sort=distance',
            'https://guide.michelin.com/hk/en/hong-kong-region/hong-kong/restaurants/page/5?sort=distance',
            'https://100toptables.scmp.com/restaurants',
            'https://en.tripadvisor.com.hk/Restaurants-g294217-oa0-Hong_Kong.html',
            'https://en.tripadvisor.com.hk/Restaurants-g294217-oa30-Hong_Kong.html',
            'https://en.tripadvisor.com.hk/Restaurants-g294217-oa60-Hong_Kong.html',
            'https://en.tripadvisor.com.hk/Restaurants-g294217-oa90-Hong_Kong.html',
            'https://en.tripadvisor.com.hk/Restaurants-g294217-oa120-Hong_Kong.html',
            'https://en.tripadvisor.com.hk/Restaurants-g294217-oa150-Hong_Kong.html',
            'https://en.tripadvisor.com.hk/Restaurants-g294217-oa180-Hong_Kong.html',
            'https://en.tripadvisor.com.hk/Restaurants-g294217-oa210-Hong_Kong.html',
            'https://en.tripadvisor.com.hk/Restaurants-g294217-oa240-Hong_Kong.html',
            'https://en.tripadvisor.com.hk/Restaurants-g294217-oa270-Hong_Kong.html',
            'https://en.tripadvisor.com.hk/Restaurants-g294217-oa300-Hong_Kong.html',
        ],
    }
};
class NameAddressService {
    constructor() {
        this.llmService = new llm_service_1.LLMService();
    }
    getUrls(location, option) {
        return urlMap[location]?.[option] || [];
    }
    async scrape(location, option) {
        const urls = this.getUrls(location, option);
        if (urls.length === 0) {
            logger_1.default.warn(`No URLs defined for location: ${location}, option: ${option}`);
            return [];
        }
        const allNameAddresses = [];
        for (const url of urls) {
            try {
                logger_1.default.info(`Getting name-address from URL: ${url}`);
                const nameAddresses = await this.llmService.generateNameAddressListFromUrl(url, location, option);
                allNameAddresses.push(...nameAddresses);
            }
            catch (error) {
                logger_1.default.error(`Error getting name-address from URL ${url}`, { error: error.message });
                // Continue to next URL
            }
        }
        // Deduplicate results
        const uniqueNameAddresses = Array.from(new Map(allNameAddresses.map(item => [item.name, item])).values());
        logger_1.default.info(`Found ${uniqueNameAddresses.length} unique name-address pairs for ${location} - ${option}`);
        return uniqueNameAddresses;
    }
    async scrapeOpenRiceHongKongRestaurants() {
        const startTime = Date.now();
        logger_1.default.info('Starting sequential OpenRice Hong Kong restaurants scraping job.');
        const urlsToScrape = [
            //   'https://www.openrice.com/zh/hongkong/restaurants/cuisine/台灣菜?sortBy=ORScoreDesc',
            //   'https://www.openrice.com/zh/hongkong/restaurants/cuisine/日本菜?sortBy=ORScoreDesc',
            //   'https://www.openrice.com/zh/hongkong/restaurants/cuisine/韓國菜?sortBy=ORScoreDesc',
            //   'https://www.openrice.com/zh/hongkong/restaurants/cuisine/泰國菜?sortBy=ORScoreDesc',
            //   'https://www.openrice.com/zh/hongkong/restaurants?sortBy=ORScoreDesc&cuisineId=2006&cuisineId=2007&cuisineId=2005&cuisineId=2002&cuisineId=2024',
            //   'https://www.openrice.com/zh/hongkong/restaurants/cuisine/意大利菜?sortBy=ORScoreDesc',
            //   'https://www.openrice.com/zh/hongkong/restaurants/cuisine/法國菜?sortBy=ORScoreDesc',
            //   'https://www.openrice.com/zh/hongkong/restaurants?poiType=1&sortBy=ORScoreDesc&cuisineId=4001&cuisineId=3011&cuisineId=3001&cuisineId=3013',
            //   'https://www.openrice.com/zh/hongkong/restaurants?sortBy=ORScoreDesc&categoryGroupId=10012',
            //   'https://www.openrice.com/zh/hongkong/restaurants?sortBy=ORScoreDesc&categoryGroupId=10013',
            'https://www.openrice.com/zh/hongkong/restaurants/cuisine/多國菜?sortBy=ORScoreDesc',
        ];
        // 'https://www.openrice.com/zh/hongkong/restaurants?sortBy=ORScoreDesc&categoryGroupId=10002%3F_sUrl%3Dhttps%3A%2F%2Fs.openrice.com%2FQrbe0000000',
        //   'https://www.openrice.com/zh/hongkong/restaurants/cuisine/港式?sortBy=ORScoreDesc',
        // 'https://www.openrice.com/zh/hongkong/restaurants?sortBy=ORScoreDesc&categoryGroupId=10003',
        const allNameAddresses = [];
        for (const url of urlsToScrape) {
            logger_1.default.info(`Scraping URL: ${url}`);
            // Launch a new browser for each URL to ensure a clean state
            const browser = await playwright_1.chromium.launch({ headless: false });
            try {
                const context = await browser.newContext({
                    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                });
                const page = await context.newPage();
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
                // Scroll to the bottom of the page to ensure all dynamic content is loaded
                let previousHeight;
                while (true) {
                    const currentHeight = await page.evaluate('document.body.scrollHeight');
                    if (currentHeight === previousHeight) {
                        break;
                    }
                    previousHeight = currentHeight;
                    await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
                    await page.waitForTimeout(4000);
                }
                const restaurantSections = await page.locator('section.poi-list-cell-desktop-right-top-info-section').all();
                logger_1.default.info(`Found ${restaurantSections.length} sections for ${url}.`);
                for (const section of restaurantSections) {
                    try {
                        const nameLocator = section.locator('.poi-name.poi-list-cell-link');
                        const addressLocator = section.locator('div:nth-of-type(2)');
                        const name = (await nameLocator.innerText({ timeout: 5000 })).trim();
                        const address = (await addressLocator.innerText({ timeout: 5000 })).trim();
                        if (name && address) {
                            allNameAddresses.push({ name, address });
                        }
                    }
                    catch (e) {
                        // Ignore sections that don't match (e.g., ads)
                    }
                }
            }
            catch (error) {
                logger_1.default.error(`Error scraping URL ${url}`, { error: error.message });
                // Continue to the next URL even if one fails
            }
            finally {
                await browser.close();
            }
        }
        // Deduplicate results from all pages
        const uniqueNameAddresses = Array.from(new Map(allNameAddresses.map(item => [item.name, item])).values());
        logger_1.default.info(`Successfully scraped ${uniqueNameAddresses.length} unique restaurant names and addresses from ${urlsToScrape.length} pages.`, {
            durationMs: Date.now() - startTime,
        });
        return uniqueNameAddresses;
    }
}
exports.NameAddressService = NameAddressService;
exports.default = new NameAddressService();
//# sourceMappingURL=nameaddress.service.js.map