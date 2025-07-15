"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const puppeteer_extra_1 = __importDefault(require("puppeteer-extra"));
const puppeteer_extra_plugin_stealth_1 = __importDefault(require("puppeteer-extra-plugin-stealth"));
puppeteer_extra_1.default.use((0, puppeteer_extra_plugin_stealth_1.default)());
class SiteContentService {
    constructor() {
        this.url = 'https://www.discoverhongkong.com/eng/what-s-new/events.html';
    }
    /**
     * Simulates human-like behavior on a page
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
                const detail = {};
                // Get the title from the h2 element
                const title = document.querySelector('h2')?.textContent?.trim() || document.title;
                detail['title'] = title;
                // Check for card-date element first (this is on the listing page)
                const cardDate = document.querySelector('.card-date')?.textContent?.trim();
                if (cardDate) {
                    detail['date'] = cardDate;
                }
                // Get the description - typically in paragraphs or div elements with content
                const descriptionElements = document.querySelectorAll('.dynamic-page-content p, .event-description, .card-text');
                const description = Array.from(descriptionElements)
                    .map(el => el.textContent?.trim())
                    .filter(Boolean)
                    .join('\n');
                if (description) {
                    detail['description'] = description;
                }
                // Target the specific event details container with the structure provided
                const detailsContainer = document.querySelector('.dynamic-page-details__listing');
                if (detailsContainer) {
                    // Find all detail list items
                    const detailLists = detailsContainer.querySelectorAll('.dynamic-page-details__list');
                    detailLists.forEach(listItem => {
                        // Get the field label (left column)
                        const fieldElement = listItem.querySelector('.dynamic-page-details__list--field .cmp-text p');
                        const field = fieldElement?.textContent?.trim();
                        // Get the data value (right column)
                        const dataElement = listItem.querySelector('.dynamic-page-details__list--data .cmp-text p');
                        const dataText = dataElement?.textContent?.trim();
                        if (field && dataText) {
                            // Clean up the field name and convert to lowercase for consistency
                            const cleanField = field.replace(/[\s\n]+/g, ' ').trim().toLowerCase();
                            // Store the actual values based on field type
                            if (cleanField.includes('date')) {
                                detail['date'] = dataText;
                            }
                            else if (cleanField.includes('venue')) {
                                detail['location'] = dataText;
                            }
                            else if (cleanField.includes('organiser') || cleanField.includes('organizer')) {
                                detail['organizer'] = dataText;
                            }
                            else if (cleanField.includes('admission') || cleanField.includes('price') ||
                                cleanField.includes('ticket')) {
                                detail['price'] = dataText;
                            }
                            // Store the raw field data as well
                            detail[cleanField] = dataText;
                            // Special handling for website/ticketing with URLs
                            if (cleanField.includes('ticketing') || cleanField.includes('website')) {
                                const anchor = dataElement?.querySelector('a');
                                if (anchor && anchor.href) {
                                    detail['website'] = anchor.href;
                                }
                            }
                        }
                    });
                }
                // Fallback extraction for various fields if not found in the details container
                // Try to find date information
                if (!detail['Date']) {
                    const dateSelectors = [
                        '.event-date',
                        '.date-info',
                        'p',
                        'div'
                    ];
                    for (const selector of dateSelectors) {
                        const elements = document.querySelectorAll(selector);
                        for (const element of Array.from(elements)) {
                            const text = element.textContent?.trim() || '';
                            // Check if the text contains date-related keywords
                            if ((selector === 'p' || selector === 'div')) {
                                if (!text.toLowerCase().includes('date') &&
                                    !text.toLowerCase().includes('time')) {
                                    continue;
                                }
                                // Skip very long text blocks that are likely not dates
                                if (text.length > 300)
                                    continue;
                            }
                            if (text) {
                                // Extract just the date, removing prefix if present
                                const dateText = text.replace(/^Date:\s*/i, '');
                                // Only use if it's a reasonable length for a date
                                if (dateText.length < 200) {
                                    detail['Date'] = dateText;
                                    break;
                                }
                            }
                        }
                        if (detail['Date'])
                            break;
                    }
                }
                // Try to find venue/location information
                if (!detail['Venue']) {
                    const venueSelectors = [
                        '.event-venue',
                        '.venue-info',
                        'p',
                        'div'
                    ];
                    for (const selector of venueSelectors) {
                        const elements = document.querySelectorAll(selector);
                        for (const element of Array.from(elements)) {
                            const text = element.textContent?.trim() || '';
                            // Check if the text contains venue-related keywords
                            if ((selector === 'p' || selector === 'div')) {
                                if (!text.toLowerCase().includes('venue') &&
                                    !text.toLowerCase().includes('location')) {
                                    continue;
                                }
                                // Skip very long text blocks that are likely not venues
                                if (text.length > 300)
                                    continue;
                            }
                            if (text) {
                                // Extract just the venue, removing prefix if present
                                const venueText = text.replace(/^(Venue|Location):\s*/i, '');
                                // Only use if it's a reasonable length for a venue
                                if (venueText.length < 200) {
                                    detail['Venue'] = venueText;
                                    break;
                                }
                            }
                        }
                        if (detail['Venue'])
                            break;
                    }
                }
                // Try to find price information
                if (!detail['Price']) {
                    const priceSelectors = [
                        '.event-price',
                        '.price-info',
                        'p',
                        'div'
                    ];
                    for (const selector of priceSelectors) {
                        const elements = document.querySelectorAll(selector);
                        for (const element of Array.from(elements)) {
                            const text = element.textContent?.trim() || '';
                            // Check if the text contains price-related keywords
                            if ((selector === 'p' || selector === 'div')) {
                                if (!text.toLowerCase().includes('price') &&
                                    !text.toLowerCase().includes('fee') &&
                                    !text.toLowerCase().includes('ticket') &&
                                    !text.toLowerCase().includes('admission')) {
                                    continue;
                                }
                                // Skip very long text blocks that are likely not prices
                                if (text.length > 300)
                                    continue;
                            }
                            if (text) {
                                // Extract just the price, removing prefix if present
                                const priceText = text.replace(/^(Price|Fee|Ticket|Admission):\s*/i, '');
                                // Only use if it's a reasonable length for a price
                                if (priceText.length < 200) {
                                    detail['Price'] = priceText;
                                    break;
                                }
                            }
                        }
                        if (detail['Price'])
                            break;
                    }
                }
                // Try to find organizer information
                if (!detail['Organiser'] && !detail['Organizer']) {
                    const organizerSelectors = [
                        '.organizer-info',
                        '.event-organizer',
                        'p',
                        'div'
                    ];
                    for (const selector of organizerSelectors) {
                        const elements = document.querySelectorAll(selector);
                        for (const element of Array.from(elements)) {
                            const text = element.textContent?.trim() || '';
                            // Check if the text contains organizer-related keywords
                            if ((selector === 'p' || selector === 'div')) {
                                if (!text.toLowerCase().includes('organiser') &&
                                    !text.toLowerCase().includes('organizer')) {
                                    continue;
                                }
                                // Skip very long text blocks that are likely not organizers
                                if (text.length > 300)
                                    continue;
                            }
                            if (text) {
                                // Extract just the organizer, removing prefix if present
                                const organizerText = text.replace(/^(Organiser|Organizer):\s*/i, '');
                                // Only use if it's a reasonable length for an organizer
                                if (organizerText.length < 200) {
                                    detail['Organiser'] = organizerText;
                                    break;
                                }
                            }
                        }
                        if (detail['Organiser'] || detail['Organizer'])
                            break;
                    }
                }
                // Try to find website information
                if (!detail['Website']) {
                    const websiteSelectors = [
                        'a[href*="http"]',
                        '.event-website',
                        '.website-link'
                    ];
                    // First try specific website selectors
                    for (const selector of websiteSelectors) {
                        const elements = document.querySelectorAll(selector);
                        for (const element of Array.from(elements)) {
                            if (element.getAttribute('href')) {
                                detail['Website'] = element.getAttribute('href') || '';
                                break;
                            }
                        }
                        if (detail['Website'])
                            break;
                    }
                    // If no website found, look for links in paragraphs containing 'website'
                    if (!detail['Website']) {
                        const paragraphs = document.querySelectorAll('p, div');
                        for (const p of Array.from(paragraphs)) {
                            if (p.textContent?.toLowerCase().includes('website')) {
                                const link = p.querySelector('a');
                                if (link && link.getAttribute('href')) {
                                    detail['Website'] = link.getAttribute('href') || '';
                                    break;
                                }
                            }
                        }
                    }
                }
                return { title, ...detail };
            });
            // Extract main fields for the top level
            const mainEventData = {
                title: eventDetail.title || 'Unknown Event',
                description: eventDetail['description'],
                date: eventDetail['date'],
                location: eventDetail['location'],
                price: eventDetail['price'],
                organizer: eventDetail['organizer'],
                url
            };
            // Create a copy of eventDetail without the fields already in mainEventData
            const additionalDetails = {};
            for (const [key, value] of Object.entries(eventDetail)) {
                // Skip fields that are already in the main object to avoid duplication
                if (!['title', 'description', 'date', 'location', 'price', 'organizer'].includes(key.toLowerCase())) {
                    additionalDetails[key] = value;
                }
            }
            // Add website to additionalDetails if it exists
            if (eventDetail['website']) {
                additionalDetails['website'] = eventDetail['website'];
            }
            return {
                ...mainEventData,
                additionalDetails: Object.keys(additionalDetails).length > 0 ? additionalDetails : undefined
            };
        }
        catch (error) {
            console.error(`Failed to extract details from ${url}:`, error);
            return {
                title: 'Error extracting event',
                url: url,
                additionalDetails: { error: error.message }
            };
        }
    }
    /**
     * Get all event links from the main page
     */
    async getEventLinks(page) {
        return await page.evaluate(() => {
            // Target the specific list-content div that contains all events
            const listContent = document.querySelector('.list-content');
            if (!listContent)
                return [];
            // Find all event card items
            const eventCards = listContent.querySelectorAll('.list-item');
            // Extract links from each card
            const links = Array.from(eventCards)
                .map(card => {
                const linkElement = card.querySelector('.card-img-wrap a');
                return linkElement ? linkElement.href : null;
            })
                .filter((href) => !!href && !href.includes('#') && !href.includes('javascript:'));
            return links;
        });
    }
    /**
     * Navigate to the next page using a direct and forceful approach
     */
    async goToNextPage(page) {
        try {
            // First, take a screenshot to help with debugging - with error handling
            try {
                await page.screenshot({ path: 'before-pagination.png' });
                console.log('Saved screenshot before pagination attempt as before-pagination.png');
            }
            catch (screenshotError) {
                console.log('Could not take initial screenshot:', screenshotError.message);
            }
            // Dump the HTML of the pagination area to understand its structure
            const paginationHTML = await page.evaluate(() => {
                const paginationDiv = document.querySelector('.toggle-events-page');
                return paginationDiv ? paginationDiv.outerHTML : 'Pagination div not found';
            });
            console.log('Pagination HTML structure:', paginationHTML);
            // Get current pagination information with improved selectors and fallbacks
            const paginationInfo = await page.evaluate(() => {
                // Try multiple possible selectors for current page
                let currentPageInput = document.querySelector('.toggle-page_input');
                if (!currentPageInput)
                    currentPageInput = document.querySelector('.toggle-events-page input[type="number"]');
                // Try multiple possible selectors for total pages
                let totalPagesSpan = document.querySelector('.toggle-page_total');
                if (!totalPagesSpan)
                    totalPagesSpan = document.querySelector('.toggle-events-page .toggle-page_sparator + span');
                // Check if next button exists
                const nextButton = document.querySelector('span.next-page');
                // Get current page number
                let currentPage = 1; // Default to 1 if not found
                if (currentPageInput && currentPageInput.value) {
                    currentPage = parseInt(currentPageInput.value, 10) || 1;
                }
                // Get total pages
                let totalPages = 1; // Default to 1 if not found
                if (totalPagesSpan && totalPagesSpan.textContent) {
                    // Try to extract a number from the text
                    const match = totalPagesSpan.textContent.match(/\d+/);
                    if (match) {
                        totalPages = parseInt(match[0], 10) || 1;
                    }
                }
                // Check if we're on the last page
                const isLastPage = currentPage >= totalPages;
                return {
                    currentPage,
                    totalPages,
                    hasNextButton: !!nextButton,
                    isLastPage
                };
            });
            console.log(`Current page: ${paginationInfo.currentPage} of ${paginationInfo.totalPages} (Has next button: ${paginationInfo.hasNextButton})`);
            // If we can't detect pagination properly, try a different approach
            if (paginationInfo.currentPage === 1 && paginationInfo.totalPages === 1 && !paginationInfo.hasNextButton) {
                console.log('Could not detect proper pagination. Trying alternative approach...');
                // Check if there's any element that looks like pagination
                const hasPaginationElements = await page.evaluate(() => {
                    // Look for common pagination patterns
                    const paginationSelectors = [
                        '.pagination', '.pager', '.pages', '.page-numbers',
                        '[class*="page"]', '[class*="paging"]', '[class*="pagination"]',
                        'a[href*="page="]', 'a[href*="p="]', 'a[href*="pg="]'
                    ];
                    for (const selector of paginationSelectors) {
                        const elements = document.querySelectorAll(selector);
                        if (elements.length > 0) {
                            return { found: true, selector, count: elements.length };
                        }
                    }
                    return { found: false };
                });
                console.log('Alternative pagination search result:', hasPaginationElements);
            }
            // Check if we're already on the last page
            if (paginationInfo.isLastPage && !paginationInfo.hasNextButton) {
                console.log('Already on the last page, cannot navigate further');
                return false;
            }
            // Calculate the next page number
            const nextPageNumber = paginationInfo.currentPage + 1;
            if (nextPageNumber > paginationInfo.totalPages) {
                console.log('Next page would exceed total pages, cannot navigate further');
                return false;
            }
            console.log(`Attempting to navigate to page ${nextPageNumber}...`);
            // Store current event links to compare after changing page
            const currentEventLinks = await this.getEventLinks(page);
            console.log(`Current page has ${currentEventLinks.length} event links before pagination`);
            // Try multiple approaches to navigate to the next page
            let navigationAttempted = false;
            // APPROACH 1: Try to directly manipulate the URL
            try {
                console.log('Approach 1: Checking if we can modify the URL directly');
                const currentUrl = await page.url();
                console.log(`Current URL: ${currentUrl}`);
                // First check if URL already has a page parameter
                const urlObj = new URL(currentUrl);
                const hasPageParam = urlObj.searchParams.has('page');
                if (hasPageParam) {
                    console.log('URL has page parameter, modifying it...');
                    urlObj.searchParams.set('page', nextPageNumber.toString());
                    const newUrl = urlObj.toString();
                    console.log(`Navigating to: ${newUrl}`);
                    await page.goto(newUrl, { waitUntil: 'networkidle2' });
                    await new Promise(r => setTimeout(r, 3000));
                    navigationAttempted = true;
                }
                else {
                    // If no page parameter, try to construct a URL with page parameter
                    // Common patterns for pagination URLs
                    const baseUrl = currentUrl.split('?')[0];
                    const possibleNextUrls = [
                        `${baseUrl}?page=${nextPageNumber}`,
                        `${baseUrl}?p=${nextPageNumber}`,
                        `${baseUrl}?pg=${nextPageNumber}`,
                        `${baseUrl}/page/${nextPageNumber}`,
                        `${baseUrl}/p/${nextPageNumber}`
                    ];
                    console.log('Trying common pagination URL patterns...');
                    for (const url of possibleNextUrls) {
                        try {
                            console.log(`Attempting URL: ${url}`);
                            await page.goto(url, { waitUntil: 'networkidle0', timeout: 10000 });
                            navigationAttempted = true;
                            break;
                        }
                        catch (e) {
                            console.log(`Failed to navigate to ${url}`);
                        }
                    }
                }
            }
            catch (error) {
                console.error('Error with URL modification approach:', error);
            }
            // If URL approach didn't work, try input field approach
            if (!navigationAttempted) {
                try {
                    console.log('Approach 2: Using Puppeteer to directly interact with the input field');
                    // Try to find the input field with multiple selectors
                    const inputFieldExists = await page.evaluate(() => {
                        const selectors = [
                            '.toggle-page_input',
                            '.toggle-events-page input[type="number"]',
                            'input[type="number"]'
                        ];
                        for (const selector of selectors) {
                            const input = document.querySelector(selector);
                            if (input)
                                return { found: true, selector: selector };
                        }
                        return { found: false, selector: undefined };
                    });
                    if (inputFieldExists.found && inputFieldExists.selector) {
                        console.log(`Found input field with selector: ${inputFieldExists.selector}`);
                        // First, clear the input field
                        await page.click(inputFieldExists.selector, { clickCount: 3 }); // Triple click to select all text
                        await page.keyboard.press('Backspace'); // Clear the field
                        // Type the new page number
                        await page.type(inputFieldExists.selector, nextPageNumber.toString());
                        // Press Enter
                        await page.keyboard.press('Enter');
                        // Wait for potential AJAX updates
                        await new Promise(r => setTimeout(r, 5000));
                        console.log('Completed input field interaction approach');
                        navigationAttempted = true;
                    }
                    else {
                        console.log('Could not find any input field for pagination');
                    }
                }
                catch (error) {
                    console.error('Error with direct input approach:', error);
                }
            }
            // Take a screenshot after input attempt - with error handling
            try {
                await page.screenshot({ path: 'after-input-attempt.png' });
            }
            catch (screenshotError) {
                console.log('Could not take screenshot after input attempt:', screenshotError.message);
            }
            // If previous approaches didn't work, try clicking the next button
            if (!navigationAttempted) {
                try {
                    console.log('Approach 3: Clicking the next page button or link');
                    // Try to find any next page button or link with multiple selectors
                    const nextButtonExists = await page.evaluate(() => {
                        const selectors = [
                            'span.next-page',
                            '.next',
                            '.next-page',
                            '[class*="next"]',
                            'a[rel="next"]',
                            'a:contains("Next")',
                            'a:contains("next")',
                            'a:contains(">")',
                        ];
                        for (const selector of selectors) {
                            try {
                                const elements = document.querySelectorAll(selector);
                                if (elements.length > 0) {
                                    // Highlight the element for debugging
                                    for (let i = 0; i < elements.length; i++) {
                                        const el = elements[i];
                                        el.style.border = '3px solid red';
                                        el.style.backgroundColor = 'yellow';
                                    }
                                    return { found: true, selector: selector, count: elements.length };
                                }
                            }
                            catch (e) {
                                // Some selectors might not be supported
                            }
                        }
                        return { found: false, selector: undefined, count: 0 };
                    });
                    if (nextButtonExists.found && nextButtonExists.selector) {
                        console.log(`Found next button/link with selector: ${nextButtonExists.selector} (${nextButtonExists.count} elements)`);
                        // Take a screenshot to see the highlighted button - with error handling
                        try {
                            await page.screenshot({ path: 'next-button-highlighted.png' });
                        }
                        catch (screenshotError) {
                            console.log('Could not take highlighted button screenshot:', screenshotError.message);
                        }
                        // Try to click the button
                        await page.click(nextButtonExists.selector, { delay: 100 });
                        // Wait for potential AJAX updates
                        await new Promise(r => setTimeout(r, 5000));
                        console.log('Completed next button click approach');
                        navigationAttempted = true;
                    }
                    else {
                        console.log('Could not find any next page button or link');
                    }
                }
                catch (error) {
                    console.error('Error with next button approach:', error);
                }
            }
            // Take a final screenshot - with error handling
            try {
                await page.screenshot({ path: 'after-pagination-attempts.png' });
            }
            catch (screenshotError) {
                console.log('Could not take final screenshot:', screenshotError.message);
            }
            // Verify if any of our approaches worked
            const newPageInfo = await page.evaluate(() => {
                // Try multiple selectors for the page input
                const selectors = [
                    '.toggle-page_input',
                    '.toggle-events-page input[type="number"]',
                    'input[type="number"]'
                ];
                for (const selector of selectors) {
                    const input = document.querySelector(selector);
                    if (input && input.value) {
                        return parseInt(input.value, 10) || 0;
                    }
                }
                return 0;
            });
            const newEventLinks = await this.getEventLinks(page);
            console.log(`New page has ${newEventLinks.length} event links after all pagination attempts`);
            // Check if the page number changed
            const pageNumberChanged = newPageInfo !== paginationInfo.currentPage && newPageInfo !== 0;
            console.log(`Page number changed: ${pageNumberChanged} (${paginationInfo.currentPage} -> ${newPageInfo})`);
            // Check if the event links are different
            let linksChanged = false;
            if (currentEventLinks.length > 0 && newEventLinks.length > 0) {
                // Compare the first link to see if it's different
                linksChanged = currentEventLinks[0] !== newEventLinks[0];
            }
            console.log(`Event links changed: ${linksChanged}`);
            if (pageNumberChanged || linksChanged) {
                console.log(`Successfully navigated to page ${newPageInfo}`);
                // Add a small delay to ensure page is fully loaded
                await this.simulateHumanBehavior(page);
                return true;
            }
            else {
                console.log('Failed to navigate to next page - content did not change');
                // As a last resort, try to reload the current page to refresh the content
                console.log('Reloading the current page as a last resort...');
                await page.reload({ waitUntil: 'networkidle2' });
                await this.simulateHumanBehavior(page);
                // For now, return false to indicate we couldn't navigate
                return false;
            }
        }
        catch (error) {
            console.error('Error navigating to next page:', error);
            return false;
        }
    }
    /**
     * Launch a browser instance with stealth plugin
     */
    async launchBrowser() {
        // Using a proxy is highly recommended to avoid IP-based blocking
        const proxyServer = ''; // e.g. 'http://user:pass@host:port'
        const browser = await puppeteer_extra_1.default.launch({
            headless: false,
            // Use the system's Chrome installation
            executablePath: process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' :
                process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' :
                    '/usr/bin/google-chrome',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                ...(proxyServer ? [`--proxy-server=${proxyServer}`] : []),
            ],
        });
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36');
        return browser;
    }
    /**
     * Navigate to a specific page by manipulating the pagination input field
     * This focuses specifically on the input field with class '.toggle-page_input'
     */
    async goToSpecificPage(page, pageNumber) {
        try {
            console.log(`Attempting to navigate directly to page ${pageNumber} using input field...`);
            // Variable to track if navigation was attempted
            let navigationAttempted = false;
            // Focus exclusively on the input field approach as requested
            try {
                console.log('Using direct input field manipulation...');
                // Take a screenshot before attempting pagination
                try {
                    await page.screenshot({ path: `before-page-${pageNumber}.png` });
                    console.log(`Saved screenshot before page ${pageNumber} attempt`);
                }
                catch (screenshotError) {
                    console.log('Could not take initial screenshot:', screenshotError.message);
                }
                // Try to find the input field with multiple selectors
                const inputFieldExists = await page.evaluate(() => {
                    const selectors = [
                        '.toggle-page_input',
                        '.toggle-events-page input[type="number"]',
                        'input[type="number"]'
                    ];
                    for (const selector of selectors) {
                        const input = document.querySelector(selector);
                        if (input)
                            return { found: true, selector: selector };
                    }
                    return { found: false, selector: undefined };
                });
                if (inputFieldExists.found && inputFieldExists.selector) {
                    console.log(`Found input field with selector: ${inputFieldExists.selector}`);
                    // Log the current HTML structure around the pagination area
                    const paginationHTML = await page.evaluate(() => {
                        const container = document.querySelector('.toggle-events-page') ||
                            document.querySelector('.pagination') ||
                            document.querySelector('nav');
                        return container ? container.outerHTML : 'Pagination container not found';
                    });
                    console.log('Pagination HTML structure:', paginationHTML);
                    // First, clear the input field
                    await page.click(inputFieldExists.selector, { clickCount: 3 }); // Triple click to select all text
                    await page.keyboard.press('Backspace'); // Clear the field
                    // Type the new page number
                    await page.type(inputFieldExists.selector, pageNumber.toString());
                    // Try multiple approaches to trigger the page change
                    console.log('Trying multiple approaches to trigger page change...');
                    // 1. Press Enter
                    await page.keyboard.press('Enter');
                    await new Promise(r => setTimeout(r, 2000));
                    // 2. Dispatch input event
                    await page.evaluate((selector) => {
                        const input = document.querySelector(selector);
                        if (input) {
                            // Create and dispatch events
                            input.dispatchEvent(new Event('input', { bubbles: true }));
                            input.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                    }, inputFieldExists.selector);
                    await new Promise(r => setTimeout(r, 2000));
                    // 3. Look for a GO button or similar and click it
                    const goButtonClicked = await page.evaluate(() => {
                        // Try different selectors for GO buttons
                        const goSelectors = [
                            '.toggle-page_go',
                            '.pagination-go',
                            'button:has-text("Go")',
                            'input[type="submit"]',
                            '.next-page'
                        ];
                        for (const selector of goSelectors) {
                            const goButton = document.querySelector(selector);
                            if (goButton) {
                                goButton.click();
                                return true;
                            }
                        }
                        return false;
                    });
                    if (goButtonClicked) {
                        console.log('Found and clicked a GO button');
                    }
                    // Wait for potential AJAX updates
                    await new Promise(r => setTimeout(r, 5000));
                    console.log('Completed input field interaction approach');
                    navigationAttempted = true;
                    // Take a screenshot after the attempt
                    try {
                        await page.screenshot({ path: `after-page-${pageNumber}.png` });
                        console.log(`Saved screenshot after page ${pageNumber} attempt`);
                    }
                    catch (screenshotError) {
                        console.log('Could not take after screenshot:', screenshotError.message);
                    }
                }
                else {
                    console.log('Could not find any input field for pagination');
                }
            }
            catch (error) {
                console.error('Error with direct input approach:', error);
            }
            // Wait a bit for the page to update
            await new Promise(r => setTimeout(r, 3000));
            // Verify if our approach worked by checking the input field value
            const newPageInfo = await page.evaluate(() => {
                // Try multiple selectors for the page input
                const selectors = [
                    '.toggle-page_input',
                    '.toggle-events-page input[type="number"]',
                    'input[type="number"]'
                ];
                for (const selector of selectors) {
                    const input = document.querySelector(selector);
                    if (input && input.value) {
                        return parseInt(input.value, 10) || 0;
                    }
                }
                return 0;
            });
            const success = newPageInfo === pageNumber;
            console.log(`Navigation to page ${pageNumber} ${success ? 'successful' : 'failed'} (current page: ${newPageInfo})`);
            if (success) {
                // Add a small delay to ensure page is fully loaded
                await this.simulateHumanBehavior(page);
                // Also verify that the content has changed by checking event links
                console.log('Verifying that page content has updated...');
                await new Promise(r => setTimeout(r, 2000));
            }
            return success;
        }
        catch (error) {
            console.error(`Error navigating to page ${pageNumber}:`, error);
            return false;
        }
    }
    /**
     * Helper function to retry operations with exponential backoff
     */
    async retryOperation(operation, maxRetries = 3, initialDelay = 5000) {
        let retries = 0;
        let delay = initialDelay;
        while (true) {
            try {
                return await operation();
            }
            catch (error) {
                retries++;
                if (retries > maxRetries) {
                    throw error;
                }
                console.log(`Operation failed, retrying in ${delay / 1000} seconds (attempt ${retries}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2; // Exponential backoff
            }
        }
    }
    /**
     * Get content from the main events page and extract details from individual event pages
     * with improved error handling and retry logic
     */
    async getSiteContent(url = '', maxEvents = 50, startPage = 1) {
        let browser = null;
        let page = null;
        try {
            // Launch browser with retry logic
            browser = await this.retryOperation(async () => {
                console.log('Launching browser...');
                return await this.launchBrowser();
            }, 3, 10000);
            page = await browser.newPage();
            // Configure longer timeouts
            await page.setDefaultNavigationTimeout(60000); // 60 seconds
            await page.setDefaultTimeout(30000); // 30 seconds
            // Array to store all event details
            const events = [];
            // Track the total number of events processed
            let totalEventsProcessed = 0;
            // Maximum number of pages to scrape
            const maxPages = 11; // Increased from 5 to 11
            // Current page counter - start from the specified page
            let currentPage = startPage;
            // Use the provided URL or default to the class URL
            const targetUrl = url || this.url;
            console.log(`Navigating to main page: ${targetUrl}`);
            // Navigate to the main page with retry logic
            await this.retryOperation(async () => {
                await page.goto(targetUrl, {
                    waitUntil: 'networkidle2',
                    timeout: 60000 // 60 seconds timeout
                });
                await this.simulateHumanBehavior(page);
            }, 3, 15000);
            // If startPage is greater than 1, navigate to that page first
            if (startPage > 1) {
                console.log(`Starting from page ${startPage} instead of page 1`);
                const navigatedToStartPage = await this.retryOperation(async () => {
                    return await this.goToSpecificPage(page, startPage);
                }, 2, 10000);
                if (!navigatedToStartPage) {
                    console.log(`Failed to navigate to start page ${startPage}. Starting from page 1 instead.`);
                    currentPage = 1;
                }
            }
            // Loop through pages until we reach the maximum or there are no more pages
            while (currentPage <= maxPages && events.length < maxEvents) {
                console.log(`\n===== Processing Page ${currentPage} =====`);
                // Get all event links from the current page with retry logic
                const eventLinks = await this.retryOperation(async () => {
                    return await this.getEventLinks(page);
                }, 3, 10000);
                console.log(`Found ${eventLinks.length} event links on page ${currentPage}`);
                if (eventLinks.length === 0) {
                    console.log('No event links found on this page. Stopping pagination.');
                    break;
                }
                // Process events on the current page
                const eventsToProcess = Math.min(maxEvents - events.length, // Don't exceed max total
                eventLinks.length // Don't exceed available links
                );
                console.log(`Processing ${eventsToProcess} events from page ${currentPage}`);
                for (let i = 0; i < eventsToProcess; i++) {
                    const eventIndex = totalEventsProcessed + i;
                    console.log(`Processing event ${eventIndex + 1}/${maxEvents} (${i + 1}/${eventsToProcess} on this page): ${eventLinks[i]}`);
                    try {
                        // Extract event details with retry logic
                        const eventDetail = await this.retryOperation(async () => {
                            return await this.extractEventDetails(page, eventLinks[i]);
                        }, 2, 8000);
                        // Only add events with valid titles
                        if (eventDetail.title && eventDetail.title !== 'Unknown Event' && eventDetail.title !== 'Error extracting event') {
                            events.push(eventDetail);
                            console.log(`Successfully extracted event ${eventIndex + 1}: ${eventDetail.title}`);
                        }
                        else {
                            console.log(`Skipping event ${eventIndex + 1} due to missing or invalid title`);
                        }
                    }
                    catch (error) {
                        console.error(`Error processing event ${eventIndex + 1}:`, error);
                        // Add minimal info for the failed event
                        events.push({
                            title: `Event ${eventIndex + 1} (extraction failed)`,
                            url: eventLinks[i],
                            additionalDetails: { error: error.message }
                        });
                    }
                    // Add a longer delay between requests to avoid overloading the server
                    await new Promise(r => setTimeout(r, 3000 + Math.random() * 5000));
                }
                // Update the total events processed
                totalEventsProcessed += eventsToProcess;
                // Check if we've reached our target number of events
                if (events.length >= maxEvents) {
                    console.log(`Reached target of ${maxEvents} events. Stopping pagination.`);
                    break;
                }
                // Move to the next page
                currentPage++;
                // Check if we've reached the maximum number of pages
                if (currentPage > maxPages) {
                    console.log(`Reached maximum page limit (${maxPages}). Stopping pagination.`);
                    break;
                }
                // Navigate to the next page with retry logic
                console.log(`Navigating to page ${currentPage}...`);
                const navigatedToNextPage = await this.retryOperation(async () => {
                    return await this.goToSpecificPage(page, currentPage);
                }, 3, 10000);
                if (!navigatedToNextPage) {
                    console.log(`Failed to navigate to page ${currentPage}. Stopping pagination.`);
                    break;
                }
                // Add a longer delay between pages
                console.log(`Waiting 15 seconds before processing next page...`);
                await new Promise(r => setTimeout(r, 15000));
            }
            console.log(`\n===== Scraping Complete =====`);
            console.log(`Total events extracted: ${events.length}`);
            return { events };
        }
        catch (error) {
            console.error('Error in getSiteContent:', error);
            return { events: [] };
        }
        finally {
            if (browser) {
                await browser.close();
            }
        }
    }
}
exports.default = new SiteContentService();
//# sourceMappingURL=siteContent.service.js.map