"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const eventFood_service_1 = __importDefault(require("./services/eventFood.service"));
async function scrapeAdditionalPages() {
    console.log('==================================================');
    console.log('EVENTBRITE FOOD & DRINK EVENTS SCRAPER - ADDITIONAL PAGES');
    console.log('==================================================');
    const startTime = new Date();
    console.log(`Starting scraper at: ${startTime.toLocaleString()}`);
    console.log('');
    try {
        // Read existing data from page 1
        console.log('Reading existing data from page 1...');
        const existingDataPath = path_1.default.join(__dirname, '../results/event_food_test.json');
        let existingData = [];
        if (fs_1.default.existsSync(existingDataPath)) {
            const existingDataRaw = fs_1.default.readFileSync(existingDataPath, 'utf8');
            existingData = JSON.parse(existingDataRaw);
            console.log(`Successfully loaded ${existingData.length} events from page 1`);
        }
        else {
            console.log('No existing data found. Will create a new file.');
        }
        // Scrape pages 2 and 3
        console.log('\nScraping additional pages...');
        const additionalEvents = await eventFood_service_1.default.scrapeAdditionalPages([2, 3]);
        // Combine results
        const allEvents = [...existingData, ...additionalEvents];
        console.log(`\nCombined ${existingData.length} existing events with ${additionalEvents.length} new events.`);
        console.log(`Total events: ${allEvents.length}`);
        // Save combined results
        const outputPath = path_1.default.join(__dirname, '../results/event_food_test.json');
        fs_1.default.writeFileSync(outputPath, JSON.stringify(allEvents, null, 2));
        const endTime = new Date();
        const duration = (endTime.getTime() - startTime.getTime()) / 1000;
        console.log('\n==================================================');
        console.log('SCRAPING COMPLETED SUCCESSFULLY');
        console.log('==================================================');
        console.log(`Start time: ${startTime.toLocaleString()}`);
        console.log(`End time: ${endTime.toLocaleString()}`);
        console.log(`Duration: ${duration.toFixed(2)} seconds`);
        const stats = fs_1.default.statSync(outputPath);
        console.log(`Output file size: ${(stats.size / 1024).toFixed(2)} KB`);
        console.log(`Output file path: ${outputPath}`);
    }
    catch (error) {
        console.error('Error during scraping:', error);
    }
}
scrapeAdditionalPages();
//# sourceMappingURL=scrape-event-food-additional-pages.js.map