"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const siteContent_service_1 = __importDefault(require("./services/siteContent.service"));
async function runScraper() {
    // Get page number from command line arguments
    const args = process.argv.slice(2);
    let pageNumber = 1;
    // Check if a page number was provided as an argument
    if (args.length > 0) {
        const parsedPage = parseInt(args[0], 10);
        if (!isNaN(parsedPage) && parsedPage > 0) {
            pageNumber = parsedPage;
        }
    }
    console.log(`Starting the Hong Kong events scraper on page ${pageNumber}...`);
    try {
        const result = await siteContent_service_1.default.getSiteContent('', 50, pageNumber);
        console.log(`Successfully scraped ${result.events.length} events`);
        // Print details of each event
        result.events.forEach((event, index) => {
            console.log(`\n--- Event ${index + 1}: ${event.title} ---`);
            console.log(`URL: ${event.url}`);
            if (event.date)
                console.log(`Date: ${event.date}`);
            if (event.location)
                console.log(`Location: ${event.location}`);
            if (event.price)
                console.log(`Price: ${event.price}`);
            if (event.organizer)
                console.log(`Organizer: ${event.organizer}`);
            if (event.additionalDetails?.Website)
                console.log(`Website: ${event.additionalDetails.Website}`);
            if (event.description) {
                console.log(`Description: ${event.description.substring(0, 150)}${event.description.length > 150 ? '...' : ''}`);
            }
        });
        // Save to JSON file for reference
        const fs = require('fs');
        fs.writeFileSync('./scraped-events.json', JSON.stringify(result, null, 2));
        console.log('\nFull results saved to scraped-events.json');
    }
    catch (error) {
        console.error('Error running the scraper:', error);
    }
}
runScraper();
//# sourceMappingURL=test-scraper.js.map