"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiveContentService = void 0;
const playwright_1 = require("playwright");
class LiveContentService {
    constructor() {
        this.url = 'https://www.livenation.hk/en/event/allevents';
    }
    async simulateHumanBehavior(page) {
        await new Promise(r => setTimeout(r, Math.random() * 3000 + 2000));
        for (let i = 0; i < 5; i++) {
            await page.mouse.move(Math.random() * 1000, Math.random() * 1000);
            await new Promise(r => setTimeout(r, Math.random() * 500 + 200));
        }
        const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
        let currentPosition = 0;
        while (currentPosition < scrollHeight) {
            const scrollDistance = Math.floor(Math.random() * 400) + 100;
            await page.evaluate((distance) => {
                window.scrollBy(0, distance);
            }, scrollDistance);
            currentPosition += scrollDistance;
            await new Promise(r => setTimeout(r, Math.random() * 1000 + 500));
        }
    }
    async extractEventDetails(page, url) {
        console.log(`Extracting details from: ${url}`);
        try {
            await page.goto(url, { waitUntil: 'networkidle' });
            await this.simulateHumanBehavior(page);
            const eventDetail = await page.evaluate(() => {
                const infoSection = document.querySelector('[data-testid="edp-main-information-text"]');
                let name = infoSection?.querySelector('h2')?.textContent?.trim() || document.title;
                // Clean up name if it contains extra information like dates and URLs
                if (name.includes(', Hong Kong,') || name.includes('Tickets –')) {
                    // Extract just the event name before any commas or dates
                    const cleanNameMatch = name.match(/^([^,]+)/);
                    if (cleanNameMatch && cleanNameMatch[1]) {
                        name = cleanNameMatch[1].trim();
                    }
                }
                const information = infoSection?.textContent?.trim() || '';
                let date = '';
                let showTime = '';
                // Extract date
                const dateMatch = information.match(/Date:\s*([^\n]+)/) || information.match(/Date: ([^\n]+)/);
                if (dateMatch && dateMatch[1]) {
                    const fullDateString = dateMatch[1].trim();
                    // Extract just the date part (before Show Time if it exists in the same string)
                    const dateShowTimeSplit = fullDateString.split(/Show Time:/i);
                    const datePart = dateShowTimeSplit[0].trim();
                    // Further clean up the date to just include the date and day
                    const dateOnlyMatch = datePart.match(/([^\(]+\([^\)]+\))/);
                    if (dateOnlyMatch && dateOnlyMatch[1]) {
                        date = dateOnlyMatch[1].trim();
                    }
                    else {
                        date = datePart;
                    }
                    // Fix typos in date (e.g., "Septembe" to "September")
                    date = date.replace(/Septembe\b/g, 'September');
                    // Clean up date if it contains venue information
                    const venueIndex = date.indexOf('Venue:');
                    if (venueIndex > 0) {
                        date = date.substring(0, venueIndex).trim();
                    }
                }
                // Extract show time separately
                const showTimeMatch = information.match(/Show Time:\s*([^\n,]+)/) ||
                    information.match(/Show Time: ([^\n,]+)/);
                if (showTimeMatch && showTimeMatch[1]) {
                    showTime = showTimeMatch[1].trim();
                    // Clean up showTime if it contains venue information
                    const venueIndex = showTime.indexOf('Venue:');
                    if (venueIndex > 0) {
                        showTime = showTime.substring(0, venueIndex).trim();
                    }
                }
                let location = '';
                const locationMatch = information.match(/Venue:\s*([^\n]+)/) || information.match(/Venue: ([^\n]+)/);
                if (locationMatch && locationMatch[1]) {
                    // Extract just the venue name without ticket information
                    const venueText = locationMatch[1].trim();
                    const ticketIndex = venueText.indexOf('Ticket');
                    location = ticketIndex > 0 ? venueText.substring(0, ticketIndex).trim() : venueText;
                }
                let ticketPrice = '';
                const priceMatch = information.match(/Ticket:\s*([^\n]+)/) ||
                    information.match(/Ticket: ([^\n]+)/) ||
                    information.match(/Tickets: ([^\n]+)/) ||
                    information.match(/Starting from\s*([^\n]+)/) ||
                    information.match(/Ticketing:HKD\s*([^\n]+)/);
                if (priceMatch && priceMatch[1]) {
                    ticketPrice = priceMatch[1].trim();
                }
                else {
                    // Try to find ticket price in the location field if it contains 'Ticket:' or 'Ticketing:'
                    const locationTicketMatch = location.match(/Ticket(?:ing)?:(?:HKD)?\s*([^\n]+)/);
                    if (locationTicketMatch && locationTicketMatch[1]) {
                        ticketPrice = locationTicketMatch[1].trim();
                    }
                }
                // If ticketPrice is empty but showTime contains ticket information
                if (!ticketPrice && showTime.includes('Ticket:')) {
                    const showTimeTicketMatch = showTime.match(/Ticket:(?:HKD)?\s*([^\n]+)/);
                    if (showTimeTicketMatch && showTimeTicketMatch[1]) {
                        ticketPrice = showTimeTicketMatch[1].trim();
                        // Clean up showTime
                        showTime = showTime.substring(0, showTime.indexOf('Ticket:')).trim();
                    }
                }
                // Extract ticket price from location if it's embedded there
                if (!ticketPrice && location.includes('$')) {
                    const dollarMatch = location.match(/\$(\d[\d,]+)/);
                    if (dollarMatch && dollarMatch[1]) {
                        ticketPrice = `HKD ${dollarMatch[1]}`;
                    }
                }
                let artist = '';
                const artistElement = document.querySelector('.MuiTypography-paragraph');
                if (artistElement && !artistElement.classList.contains('headlineArtists')) {
                    artist = artistElement.textContent?.trim() || '';
                }
                else {
                    artist = name;
                }
                // Check if artist field contains venue information (which indicates it's not actually the artist)
                if (artist.includes('Stadium') || artist.includes('Arena') || artist.includes('Hall') ||
                    artist.includes('Hong Kong') || artist.includes('Macao')) {
                    // Try to extract artist from name if artist field contains venue info
                    const nameArtistMatch = name.match(/^([^,]+)/);
                    if (nameArtistMatch && nameArtistMatch[1]) {
                        // Store the venue info temporarily
                        const venueInfo = artist;
                        // Set artist to the first part of the name
                        artist = nameArtistMatch[1].trim();
                        // If location is empty, use the venue info from the artist field
                        if (!location) {
                            location = venueInfo;
                        }
                    }
                }
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
                    showTime,
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
                showTime: '',
                location: '',
                ticketPrice: '',
                information: error.message,
                url: url,
                imageUrl: ''
            };
        }
    }
    async getEventLinks(page) {
        return await page.evaluate(() => {
            // Try multiple selectors to find event links
            const selectors = [
                'a.MuiContainer-root.event-ticket-link', // Primary selector
                'a.event-ticket-link',
                '.event-card a',
                '.event-list a',
                '.event-item a',
                'a[href*="/event/"]', // Any link containing '/event/' in the URL
                'a[href*="tickets"]' // Any link containing 'tickets' in the URL
            ];
            let allLinks = [];
            // Try each selector
            for (const selector of selectors) {
                const eventLinks = document.querySelectorAll(selector);
                if (eventLinks.length > 0) {
                    console.log(`Found ${eventLinks.length} links with selector: ${selector}`);
                    const links = Array.from(eventLinks)
                        .map(link => {
                        const href = link.getAttribute('href');
                        if (!href)
                            return null;
                        // Handle relative URLs
                        if (href.startsWith('/')) {
                            return `https://www.livenation.hk${href}`;
                        }
                        // Make sure it's a full URL
                        if (href.startsWith('http')) {
                            return href;
                        }
                        // If it's not a full URL or relative URL, it might be invalid
                        return null;
                    })
                        .filter((href) => !!href &&
                        !href.includes('#') &&
                        !href.includes('javascript:') &&
                        (href.includes('/event/') || href.includes('tickets')));
                    allLinks = [...allLinks, ...links];
                }
            }
            // Remove duplicates
            const uniqueLinks = [...new Set(allLinks)];
            // If we found links, return them
            if (uniqueLinks.length > 0) {
                return uniqueLinks;
            }
            // Fallback: try to find any links that might be event links
            const allPageLinks = document.querySelectorAll('a[href]');
            const potentialEventLinks = Array.from(allPageLinks)
                .map(link => {
                const href = link.getAttribute('href');
                if (!href)
                    return null;
                // Only include links that look like event links
                if (href.includes('/event/') ||
                    href.includes('tickets') ||
                    href.includes('show') ||
                    href.includes('concert')) {
                    // Handle relative URLs
                    if (href.startsWith('/')) {
                        return `https://www.livenation.hk${href}`;
                    }
                    // Make sure it's a full URL
                    if (href.startsWith('http')) {
                        return href;
                    }
                }
                return null;
            })
                .filter((href) => !!href && !href.includes('#') && !href.includes('javascript:'));
            // Remove duplicates from fallback results
            return [...new Set(potentialEventLinks)];
        });
    }
    async goToNextPage(page) {
        try {
            console.log('Looking for next page button...');
            // Try multiple selectors for the next button
            const nextButtonSelectors = [
                '.pagination__next:not(.pagination__next--disabled)',
                'button.pagination__next:not([disabled])',
                'a.pagination__next:not(.disabled)',
                'button:has-text("Next")',
                'a:has-text("Next")',
                '.pagination button:last-child',
                '.pagination a:last-child'
            ];
            let nextButton = null;
            for (const selector of nextButtonSelectors) {
                nextButton = await page.$(selector);
                if (nextButton) {
                    console.log(`Found next button with selector: ${selector}`);
                    break;
                }
            }
            if (!nextButton) {
                console.log('No next page available');
                return false;
            }
            // Check if the button is visible and clickable
            const isVisible = await nextButton.isVisible();
            if (!isVisible) {
                console.log('Next button is not visible');
                return false;
            }
            // Try to click the button
            console.log('Clicking next page button...');
            await nextButton.click().catch(async (error) => {
                console.warn('Direct click failed, trying with JavaScript:', error);
                // Try JavaScript click as fallback
                await page.evaluate(button => {
                    button.click();
                }, nextButton);
            });
            // Wait for navigation to complete
            console.log('Waiting for page to load...');
            await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(error => {
                console.warn('Network idle timeout, continuing anyway:', error);
            });
            // Verify we're on a new page by checking URL or content change
            console.log('Verifying navigation to next page...');
            await page.waitForTimeout(2000); // Give the page a moment to update
            await this.simulateHumanBehavior(page);
            console.log('Successfully navigated to next page');
            return true;
        }
        catch (error) {
            console.error('Failed to navigate to next page:', error);
            return false;
        }
    }
    async scrapeEvents() {
        console.log(`Starting to scrape events from ${this.url}`);
        const browser = await playwright_1.chromium.launch({
            headless: true
        });
        const context = await browser.newContext({
            viewport: { width: 1920, height: 1080 },
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36'
        });
        const page = await context.newPage();
        const allEvents = [];
        let currentPage = 1;
        let hasMorePages = true;
        let retryCount = 0;
        const maxRetries = 3;
        try {
            // Navigate to the main page
            console.log(`Navigating to ${this.url}`);
            await page.goto(this.url, { waitUntil: 'networkidle', timeout: 60000 });
            await this.simulateHumanBehavior(page);
            while (hasMorePages) {
                console.log(`Processing page ${currentPage}`);
                // Get all event links on the current page
                let eventLinks = [];
                try {
                    eventLinks = await this.getEventLinks(page);
                    console.log(`Found ${eventLinks.length} events on page ${currentPage}`);
                    retryCount = 0; // Reset retry count on success
                }
                catch (error) {
                    console.error(`Error getting event links on page ${currentPage}:`, error);
                    retryCount++;
                    if (retryCount > maxRetries) {
                        console.error(`Max retries (${maxRetries}) reached. Moving to next page.`);
                        hasMorePages = await this.goToNextPage(page);
                        if (hasMorePages)
                            currentPage++;
                        continue;
                    }
                    console.log(`Retrying page ${currentPage} (attempt ${retryCount} of ${maxRetries})...`);
                    await page.reload({ waitUntil: 'networkidle' });
                    await this.simulateHumanBehavior(page);
                    continue;
                }
                // Process each event link
                for (const eventLink of eventLinks) {
                    try {
                        const eventDetail = await this.extractEventDetails(page, eventLink);
                        // Validate the event data before adding it
                        if (eventDetail.name && eventDetail.name !== 'Error extracting event') {
                            allEvents.push(eventDetail);
                            console.log(`Successfully scraped: ${eventDetail.name}`);
                        }
                        else {
                            console.warn(`Skipping invalid event data for ${eventLink}`);
                        }
                    }
                    catch (error) {
                        console.error(`Error processing event link ${eventLink}:`, error);
                    }
                    // Random delay between requests to avoid detection
                    const delay = Math.random() * 2000 + 1000; // 1-3 seconds
                    console.log(`Waiting ${Math.round(delay / 1000)} seconds before next request...`);
                    await new Promise(r => setTimeout(r, delay));
                }
                // Navigate to next page if available
                hasMorePages = await this.goToNextPage(page);
                if (hasMorePages) {
                    currentPage++;
                    retryCount = 0; // Reset retry count when moving to a new page
                }
            }
            console.log(`Finished scraping. Found ${allEvents.length} events in total.`);
            return allEvents;
        }
        catch (error) {
            console.error('Error during scraping:', error);
            return allEvents; // Return any events collected before the error
        }
        finally {
            await browser.close();
            console.log('Browser closed.');
        }
    }
    async scrapeEventPage(eventUrl) {
        console.log(`Scraping single event from ${eventUrl}`);
        const browser = await playwright_1.chromium.launch({
            headless: true
        });
        const context = await browser.newContext({
            viewport: { width: 1920, height: 1080 },
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36'
        });
        const page = await context.newPage();
        // Add retry logic
        let retryCount = 0;
        const maxRetries = 3;
        try {
            while (retryCount <= maxRetries) {
                try {
                    console.log(`Attempt ${retryCount + 1} of ${maxRetries + 1} to scrape ${eventUrl}`);
                    const eventDetail = await this.extractEventDetails(page, eventUrl);
                    // Validate the event data
                    if (eventDetail.name && eventDetail.name !== 'Error extracting event') {
                        console.log(`Successfully scraped event: ${eventDetail.name}`);
                        return eventDetail;
                    }
                    else {
                        console.warn(`Invalid event data returned for ${eventUrl}`);
                        retryCount++;
                        if (retryCount > maxRetries) {
                            console.error(`Max retries (${maxRetries}) reached. Giving up on ${eventUrl}`);
                            return null;
                        }
                        // Wait before retrying
                        const delay = Math.random() * 2000 + 2000; // 2-4 seconds
                        console.log(`Waiting ${Math.round(delay / 1000)} seconds before retry...`);
                        await new Promise(r => setTimeout(r, delay));
                    }
                }
                catch (attemptError) {
                    console.error(`Error on attempt ${retryCount + 1}:`, attemptError);
                    retryCount++;
                    if (retryCount > maxRetries) {
                        console.error(`Max retries (${maxRetries}) reached. Giving up on ${eventUrl}`);
                        return null;
                    }
                    // Wait before retrying
                    const delay = Math.random() * 3000 + 2000; // 2-5 seconds
                    console.log(`Waiting ${Math.round(delay / 1000)} seconds before retry...`);
                    await new Promise(r => setTimeout(r, delay));
                }
            }
            return null; // Should not reach here, but TypeScript wants a return
        }
        catch (error) {
            console.error('Unexpected error scraping single event:', error);
            return null;
        }
        finally {
            await browser.close();
            console.log('Browser closed.');
        }
    }
}
exports.LiveContentService = LiveContentService;
exports.default = new LiveContentService();
//# sourceMappingURL=liveContent.service.js.map