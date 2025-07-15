import fs from 'fs';
import path from 'path';
import eventFoodService from './services/eventFood.service';

async function scrapeTravelEvents() {
  console.log('==================================================');
  console.log('EVENTBRITE TRAVEL & OUTDOOR EVENTS SCRAPER');
  console.log('==================================================');
  
  const startTime = new Date();
  console.log(`Starting scraper at: ${startTime.toLocaleString()}`);
  console.log('');
  
  try {
    // Override the base URL for travel and outdoor events
    eventFoodService.baseUrl = 'https://www.eventbrite.hk/d/hong-kong-sar/travel-and-outdoor--events/';
    
    // Scrape page 1 only
    console.log('Scraping travel and outdoor events from page 1...');
    const travelEvents = await eventFoodService.scrapeEvents(1);
    
    // Save results
    const outputPath = path.join(__dirname, '../results/eventbrites_travel.json');
    fs.writeFileSync(outputPath, JSON.stringify(travelEvents, null, 2));
    
    const endTime = new Date();
    const duration = (endTime.getTime() - startTime.getTime()) / 1000;
    
    console.log('\n==================================================');
    console.log('SCRAPING COMPLETED SUCCESSFULLY');
    console.log('==================================================');
    console.log(`Start time: ${startTime.toLocaleString()}`);
    console.log(`End time: ${endTime.toLocaleString()}`);
    console.log(`Duration: ${duration.toFixed(2)} seconds`);
    
    const stats = fs.statSync(outputPath);
    console.log(`Output file size: ${(stats.size / 1024).toFixed(2)} KB`);
    console.log(`Output file path: ${outputPath}`);
    
  } catch (error) {
    console.error('Error during scraping:', error);
  }
}

scrapeTravelEvents();
