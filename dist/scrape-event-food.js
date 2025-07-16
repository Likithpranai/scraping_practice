"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const eventFood_service_1 = __importDefault(require("./services/eventFood.service"));
async function main() {
    console.log('='.repeat(50));
    console.log('EVENTBRITE FOOD & DRINK EVENTS SCRAPER');
    console.log('='.repeat(50));
    console.log('Starting scraper at:', new Date().toLocaleString());
    const startTime = Date.now();
    try {
        // Scrape events from the first page
        console.log('\nInitiating scraping process...');
        const events = await eventFood_service_1.default.scrapeEventsFromPage(1);
        // Create results directory if it doesn't exist
        const resultsDir = path_1.default.join(__dirname, '../results');
        if (!fs_1.default.existsSync(resultsDir)) {
            console.log(`Creating results directory: ${resultsDir}`);
            fs_1.default.mkdirSync(resultsDir, { recursive: true });
        }
        // Save the data to a JSON file
        const outputPath = path_1.default.join(resultsDir, 'event_food_test.json');
        console.log(`\nSaving data to ${outputPath}...`);
        fs_1.default.writeFileSync(outputPath, JSON.stringify(events, null, 2));
        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;
        console.log('\n='.repeat(50));
        console.log('SCRAPING SUMMARY');
        console.log('-'.repeat(50));
        console.log(`Total events scraped: ${events.length}`);
        console.log(`Time taken: ${duration.toFixed(2)} seconds`);
        console.log(`Output file: ${outputPath}`);
        console.log(`File size: ${(fs_1.default.statSync(outputPath).size / 1024).toFixed(2)} KB`);
        console.log('='.repeat(50));
        console.log('Scraping completed successfully at:', new Date().toLocaleString());
    }
    catch (error) {
        console.error('\nERROR DURING SCRAPING:');
        console.error('-'.repeat(50));
        console.error(error);
        console.error('-'.repeat(50));
        console.error('Scraping failed at:', new Date().toLocaleString());
    }
}
main();
//# sourceMappingURL=scrape-event-food.js.map