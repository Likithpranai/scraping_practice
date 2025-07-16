"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const eventFood_service_1 = __importDefault(require("./services/eventFood.service"));
async function scrapeFilmEvents() {
    console.log('==================================================');
    console.log('EVENTBRITE FILM & MEDIA EVENTS SCRAPER');
    console.log('==================================================');
    const startTime = new Date();
    console.log(`Starting scraper at: ${startTime.toLocaleString()}`);
    console.log('');
    try {
        // Override the base URL for film and media events
        eventFood_service_1.default.baseUrl = 'https://www.eventbrite.hk/d/hong-kong-sar/film-and-media--events/';
        // Scrape page 1 only
        console.log('Scraping film and media events from page 1...');
        const filmEvents = await eventFood_service_1.default.scrapeEvents(1);
        // Save results
        const outputPath = path_1.default.join(__dirname, '../results/eventbrite_film.json');
        fs_1.default.writeFileSync(outputPath, JSON.stringify(filmEvents, null, 2));
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
scrapeFilmEvents();
//# sourceMappingURL=scrape-event-film.js.map