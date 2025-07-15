import fs from 'fs';
import path from 'path';
import eventFoodService from './services/eventFood.service';

async function scrapeHobbiesEvents() {
  console.log('==================================================');
  console.log('EVENTBRITE HOBBIES EVENTS SCRAPER');
  console.log('==================================================');
  
  const startTime = new Date();
  console.log(`Starting scraper at: ${startTime.toLocaleString()}`);
  console.log('');
  
  try {
    // Override the base URL for hobbies events
    eventFoodService.baseUrl = 'https://www.eventbrite.hk/d/hong-kong-sar/hobbies--events/';
    
    // Scrape page 1 only
    console.log('Scraping hobbies events from page 1...');
    const hobbiesEvents = await eventFoodService.scrapeEvents(1);
    
    // Save results
    const outputPath = path.join(__dirname, '../results/eventbrites_hobbies.json');
    fs.writeFileSync(outputPath, JSON.stringify(hobbiesEvents, null, 2));
    
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

scrapeHobbiesEvents();
