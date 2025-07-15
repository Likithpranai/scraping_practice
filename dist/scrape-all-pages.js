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
const siteContent_service_1 = __importDefault(require("./services/siteContent.service"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Sleep function to create delays between requests
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
/**
 * Retry a function with exponential backoff
 */
async function retry(fn, retries = 3, delay = 10000, backoff = 2) {
    try {
        return await fn();
    }
    catch (error) {
        if (retries <= 0) {
            throw error;
        }
        console.log(`Retrying after ${delay / 1000} seconds...`);
        await sleep(delay);
        return retry(fn, retries - 1, delay * backoff, backoff);
    }
}
/**
 * Script to scrape all pages from 1 to 11 sequentially with improved error handling
 */
async function scrapeAllPages() {
    const MAX_PAGES = 11;
    const allEvents = [];
    let browser = null;
    console.log(`Starting sequential scraping of all ${MAX_PAGES} pages...`);
    // Create a directory for the results if it doesn't exist
    const resultsDir = path.join(__dirname, '..', 'results');
    if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir);
    }
    // Scrape each page sequentially
    for (let page = 1; page <= MAX_PAGES; page++) {
        console.log(`\n========== SCRAPING PAGE ${page} OF ${MAX_PAGES} ==========`);
        try {
            // Set a reasonable limit for events per page (e.g., 20)
            // This ensures we don't hit the max events limit before all pages are processed
            const result = await retry(async () => {
                return await siteContent_service_1.default.getSiteContent('', 15, page);
            }, 3, 15000);
            if (result.events && result.events.length > 0) {
                console.log(`Successfully scraped ${result.events.length} events from page ${page}`);
                // Add page number to each event for reference
                const eventsWithPage = result.events.map(event => ({
                    ...event,
                    scrapedFromPage: page
                }));
                // Add to our collection
                allEvents.push(...eventsWithPage);
                // Save individual page results
                fs.writeFileSync(path.join(resultsDir, `page-${page}-events.json`), JSON.stringify(result, null, 2));
                console.log(`Saved page ${page} results to results/page-${page}-events.json`);
                // Print a summary of events found on this page
                console.log(`\n--- Events found on page ${page} ---`);
                result.events.forEach((event, index) => {
                    console.log(`${index + 1}. ${event.title}`);
                });
            }
            else {
                console.log(`No events found on page ${page}`);
            }
            // Add a longer delay between pages to avoid overloading the server
            if (page < MAX_PAGES) {
                const delaySeconds = 30; // Increased from 5 to 30 seconds
                console.log(`Waiting ${delaySeconds} seconds before scraping next page...`);
                await sleep(delaySeconds * 1000);
            }
        }
        catch (error) {
            console.error(`Error scraping page ${page}:`, error);
            // Save what we have so far even if there's an error
            fs.writeFileSync(path.join(resultsDir, `partial-results-up-to-page-${page - 1}.json`), JSON.stringify({ events: allEvents }, null, 2));
            console.log(`Saved partial results up to page ${page - 1}`);
            // Add a longer recovery delay after an error
            console.log('Waiting 60 seconds before continuing to next page...');
            await sleep(60000);
        }
    }
    // Save the complete results
    const finalResultPath = path.join(resultsDir, 'all-events.json');
    fs.writeFileSync(finalResultPath, JSON.stringify({ events: allEvents, totalEvents: allEvents.length }, null, 2));
    console.log(`\n========== SCRAPING COMPLETE ==========`);
    console.log(`Total events scraped: ${allEvents.length}`);
    console.log(`Complete results saved to ${finalResultPath}`);
    // Print a summary of all events
    console.log(`\n--- Summary of all events ---`);
    const eventsByPage = {};
    allEvents.forEach(event => {
        // Convert page number to string to use as object key
        const pageKey = String(event.scrapedFromPage);
        if (!eventsByPage[pageKey]) {
            eventsByPage[pageKey] = [];
        }
        eventsByPage[pageKey].push(event.title);
    });
    Object.keys(eventsByPage).forEach((pageKey) => {
        console.log(`\nPage ${pageKey}: ${eventsByPage[pageKey].length} events`);
        eventsByPage[pageKey].forEach((title, i) => {
            console.log(`  ${i + 1}. ${title}`);
        });
    });
}
// Run the function
scrapeAllPages().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
//# sourceMappingURL=scrape-all-pages.js.map