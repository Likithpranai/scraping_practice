import fs from 'fs';
import path from 'path';
import eventFoodService from './services/eventFood.service';

async function scrapeHealthEvents() {
  console.log('==================================================');
  console.log('EVENTBRITE HEALTH EVENTS SCRAPER');
  console.log('==================================================');
  
  const startTime = new Date();
  console.log(`Starting scraper at: ${startTime.toLocaleString()}`);
  console.log('');
  
  try {
    // Override the base URL for health events
    // @ts-ignore - Accessing private property for this specific use case
    eventFoodService.baseUrl = 'https://www.eventbrite.hk/d/hong-kong-sar/health--events/';
    
    // Scrape pages 1-4
    console.log('Scraping health events from pages 1-4...');
    const healthEvents = await eventFoodService.scrapeEvents(4);
    
    // Save results
    const outputPath = path.join(__dirname, '../results/eventbrite_health.json');
    fs.writeFileSync(outputPath, JSON.stringify(healthEvents, null, 2));
    
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

scrapeHealthEvents();
