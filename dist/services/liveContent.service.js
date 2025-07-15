"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const puppeteer_extra_1 = __importDefault(require("puppeteer-extra"));
const puppeteer_extra_plugin_stealth_1 = __importDefault(require("puppeteer-extra-plugin-stealth"));
puppeteer_extra_1.default.use((0, puppeteer_extra_plugin_stealth_1.default)());
class LiveContentService {
    constructor() {
        this.url = 'https://www.livenation.hk/en/event/allevents';
    }
    /**
     * Simulates human-like behavior on a page to avoid detection
     */
    async simulateHumanBehavior(page) {
        // Wait for a random amount of time on page load
        await new Promise(r => setTimeout(r, Math.random() * 3000 + 2000)); // 2-5 seconds
        // Simulate some random mouse movements
        for (let i = 0; i < 5; i++) {
            await page.mouse.move(Math.random() * 1000, // x
            Math.random() * 1000 // y
            );
            await new Promise(r => setTimeout(r, Math.random() * 500 + 200)); // short pause
        }
        // More human-like scrolling using mouse wheel
        const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
        let currentPosition = 0;
        while (currentPosition < scrollHeight) {
            const scrollDistance = Math.floor(Math.random() * 400) + 100; // scroll 100-500px
            await page.mouse.wheel({ deltaY: scrollDistance });
            currentPosition += scrollDistance;
            await new Promise(r => setTimeout(r, Math.random() * 1000 + 500)); // wait 0.5-1.5s between scrolls
        }
    }
    /**
     * Extract event details from an individual event page
     */
    async extractEventDetails(page, url) {
        console.log(`Extracting details from: ${url}`);
        try {
            await page.goto(url, { waitUntil: 'networkidle2' });
            await this.simulateHumanBehavior(page);
            // Extract event details
            const eventDetail = await page.evaluate(() => {
                // Get the event information section
                const infoSection = document.querySelector('[data-testid="edp-main-information-text"]');
                // Get the name/title of the concert
                const name = infoSection?.querySelector('h2')?.textContent?.trim() || document.title;
                // Extract event information as a whole
                const information = infoSection?.textContent?.trim() || '';
                // Parse date from the information text
                let date = '';
                const dateMatch = information.match(/Date:\s*([^\n]+)/);
                if (dateMatch && dateMatch[1]) {
                    date = dateMatch[1].trim();
                }
                // Parse location/venue from the information text
                let location = '';
                const locationMatch = information.match(/Venue:\s*([^\n]+)/);
                if (locationMatch && locationMatch[1]) {
                    location = locationMatch[1].trim();
                }
                // Parse ticket price from the information text
                let ticketPrice = '';
                const priceMatch = information.match(/Ticket:\s*([^\n]+)/) ||
                    information.match(/Starting from\s*([^\n]+)/);
                if (priceMatch && priceMatch[1]) {
                    ticketPrice = priceMatch[1].trim();
                }
                // Get the artist name from the list item text
                // This might be available on the main page or in the event details
                let artist = '';
                const artistElement = document.querySelector('.MuiTypography-paragraph');
                if (artistElement && !artistElement.classList.contains('headlineArtists')) {
                    artist = artistElement.textContent?.trim() || '';
                }
                else {
                    // Try to extract artist from the event name or information
                    // Often the artist name is the same as the event name or part of it
                    artist = name;
                }
                // Get the image URL if available
                let imageUrl = '';
                const imageElement = document.querySelector('img[alt="' + name + '"]') ||
                    document.querySelector('img[data-nimg="fill"]');
                if (imageElement) {
                    imageUrl = imageElement.getAttribute('src') || '';
                }
                return {
                    name,
                    artist,
                    date,
                    location,
                    ticketPrice,
                    information,
                    imageUrl
                };
            });
            return {
                ...eventDetail,
                url
            };
        }
        catch (error) {
            console.error(`Failed to extract details from ${url}:`, error);
            return {
                name: 'Error extracting event',
                artist: 'Unknown',
                date: '',
                location: '',
                ticketPrice: '',
                information: error.message,
                url: url,
                imageUrl: ''
            };
        }
    }
    /**
     * Get all event links from the main page
     */
    async getEventLinks(page) {
        return await page.evaluate(() => {
            // Find all event ticket links based on the provided HTML structure
            const eventLinks = document.querySelectorAll('a.MuiContainer-root.event-ticket-link');
            // Extract links from each element
            const links = Array.from(eventLinks)
                .map(link => {
                const href = link.getAttribute('href');
                if (href && href.startsWith('/')) {
                    // Convert relative URLs to absolute URLs
                    return `https://www.livenation.hk${href}`;
                }
                return href;
            })
                .filter((href) => !!href && !href.includes('#') && !href.includes('javascript:'));
            return links;
        });
    }
    /**
     * Navigate to the next page if available
     */
    async goToNextPage(page) {
        try {
            // Check if there's a next page button
            const hasNextPage = await page.evaluate(() => {
                const nextButton = document.querySelector('.pagination__next:not(.pagination__next--disabled)');
                return !!nextButton;
            });
            if (!hasNextPage) {
                console.log('No next page available');
                return false;
            }
            // Click the next page button
            await page.click('.pagination__next');
            // Wait for the page to load
            await page.waitForNavigation({ waitUntil: 'networkidle2' });
            await this.simulateHumanBehavior(page);
            console.log('Successfully navigated to next page');
            return true;
        }
        catch (error) {
            console.error('Failed to navigate to next page:', error);
            return false;
        }
    }
    /**
     * Scrape all events from Live Nation HK
     */
    async scrapeEvents() {
        console.log(`Starting to scrape events from ${this.url}`);
        const browser = await puppeteer_extra_1.default.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--window-size=1920,1080',
            ]
        });
        const page = await browser.newPage();
        // Set viewport and user agent
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36');
        const allEvents = [];
        let currentPage = 1;
        let hasMorePages = true;
        try {
            // Navigate to the main page
            await page.goto(this.url, { waitUntil: 'networkidle2' });
            await this.simulateHumanBehavior(page);
            // Process all pages
            while (hasMorePages) {
                console.log(`Processing page ${currentPage}`);
                // Get all event links on the current page
                const eventLinks = await this.getEventLinks(page);
                console.log(`Found ${eventLinks.length} events on page ${currentPage}`);
                // Process each event link
                for (const eventLink of eventLinks) {
                    try {
                        const eventDetail = await this.extractEventDetails(page, eventLink);
                        allEvents.push(eventDetail);
                        console.log(`Successfully scraped: ${eventDetail.name}`);
                    }
                    catch (error) {
                        console.error(`Error processing event link ${eventLink}:`, error);
                    }
                    // Add a delay between requests to avoid being detected
                    await new Promise(r => setTimeout(r, Math.random() * 2000 + 1000));
                }
                // Try to go to the next page
                hasMorePages = await this.goToNextPage(page);
                if (hasMorePages) {
                    currentPage++;
                }
            }
            console.log(`Finished scraping. Found ${allEvents.length} events in total.`);
            return allEvents;
        }
        catch (error) {
            console.error('Error during scraping:', error);
            return allEvents;
        }
        finally {
            await browser.close();
        }
    }
    /**
     * Scrape a single event page
     */
    async scrapeEventPage(eventUrl) {
        console.log(`Scraping single event from ${eventUrl}`);
        const browser = await puppeteer_extra_1.default.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--window-size=1920,1080',
            ]
        });
        const page = await browser.newPage();
        // Set viewport and user agent
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36');
        try {
            const eventDetail = await this.extractEventDetails(page, eventUrl);
            return eventDetail;
        }
        catch (error) {
            console.error('Error scraping single event:', error);
            return null;
        }
        finally {
            await browser.close();
        }
    }
}
exports.default = new LiveContentService();
//# sourceMappingURL=liveContent.service.js.map