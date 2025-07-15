"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScraperService = void 0;
const playwright_1 = require("playwright");
const cheerio = __importStar(require("cheerio"));
const axios_1 = __importDefault(require("axios"));
const config_1 = require("@/config");
const logger_1 = __importDefault(require("@/utils/logger"));
class ScraperService {
    constructor() {
        this.browser = null;
        this.context = null;
    }
    async initBrowser() {
        if (!this.browser) {
            logger_1.default.debug('Initializing browser');
            this.browser = await playwright_1.chromium.launch({
                headless: config_1.config.browser.headless,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            this.context = await this.browser.newContext({
                userAgent: config_1.config.scraping.userAgent,
                viewport: { width: 1920, height: 1080 }
            });
        }
    }
    async closeBrowser() {
        if (this.browser) {
            logger_1.default.debug('Closing browser');
            await this.browser.close();
            this.browser = null;
            this.context = null;
        }
    }
    async scrapePage(url, options = {}) {
        await this.initBrowser();
        if (!this.context) {
            throw new Error('Browser context not initialized');
        }
        const page = await this.context.newPage();
        try {
            logger_1.default.debug(`Scraping page: ${url}`);
            await page.goto(url, {
                waitUntil: 'domcontentloaded',
                timeout: options.timeout || config_1.config.browser.timeout
            });
            if (options.waitForSelector) {
                await page.waitForSelector(options.waitForSelector, {
                    timeout: options.timeout || config_1.config.browser.timeout
                });
            }
            const title = await page.title();
            const html = await page.content();
            const $ = cheerio.load(html);
            // Extract text content
            const content = $('body').text().replace(/\s+/g, ' ').trim();
            logger_1.default.debug(`Successfully scraped page: ${url}`, {
                titleLength: title.length,
                contentLength: content.length
            });
            return {
                url,
                title,
                content,
                html,
                $
            };
        }
        catch (error) {
            logger_1.default.error(`Error scraping page: ${url}`, { error: error.message });
            throw error;
        }
        finally {
            await page.close();
        }
    }
    async scrapeMultiplePages(urls, options = {}) {
        const results = [];
        const semaphore = new Array(config_1.config.scraping.maxConcurrentRequests).fill(null);
        const scrapeWithSemaphore = async (url) => {
            try {
                return await this.scrapePage(url, options);
            }
            catch (error) {
                logger_1.default.warn(`Failed to scrape ${url}, skipping`);
                return null;
            }
        };
        const chunks = [];
        for (let i = 0; i < urls.length; i += semaphore.length) {
            chunks.push(urls.slice(i, i + semaphore.length));
        }
        for (const chunk of chunks) {
            const chunkResults = await Promise.all(chunk.map(url => scrapeWithSemaphore(url)));
            results.push(...chunkResults.filter(result => result !== null));
            // Small delay between chunks to be respectful
            if (chunks.indexOf(chunk) < chunks.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        return results;
    }
    async scrapeWithAxios(url) {
        try {
            logger_1.default.debug(`Scraping with Axios: ${url}`);
            const response = await axios_1.default.get(url, {
                headers: {
                    'User-Agent': config_1.config.scraping.userAgent
                },
                timeout: config_1.config.scraping.requestTimeout
            });
            const $ = cheerio.load(response.data);
            const content = $('body').text().replace(/\s+/g, ' ').trim();
            const title = $('title').text() || '';
            return { $, content, title };
        }
        catch (error) {
            logger_1.default.error(`Error scraping with Axios: ${url}`, { error: error.message });
            throw error;
        }
    }
    async extractLinks(html, selector, baseUrl) {
        const $ = cheerio.load(html);
        const links = [];
        $(selector).each((_, element) => {
            const $el = $(element);
            const href = $el.attr('href');
            const title = $el.text().trim() || $el.attr('title') || '';
            if (href && title) {
                let fullUrl = href;
                if (baseUrl && href.startsWith('/')) {
                    fullUrl = new URL(href, baseUrl).toString();
                }
                links.push({ title, url: fullUrl });
            }
        });
        return links;
    }
}
exports.ScraperService = ScraperService;
exports.default = new ScraperService();
//# sourceMappingURL=scraper.service.js.map