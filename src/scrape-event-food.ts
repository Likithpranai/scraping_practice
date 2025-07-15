import fs from 'fs';
import path from 'path';
import eventFoodService from './services/eventFood.service';

async function main() {
  console.log('='.repeat(50));
  console.log('EVENTBRITE FOOD & DRINK EVENTS SCRAPER');
  console.log('='.repeat(50));
  console.log('Starting scraper at:', new Date().toLocaleString());
  
  const startTime = Date.now();
  
  try {
    // Scrape events from the first page
    console.log('\nInitiating scraping process...');
    const events = await eventFoodService.scrapeEventsFromPage(1);
    
    // Create results directory if it doesn't exist
    const resultsDir = path.join(__dirname, '../results');
    if (!fs.existsSync(resultsDir)) {
      console.log(`Creating results directory: ${resultsDir}`);
      fs.mkdirSync(resultsDir, { recursive: true });
    }
    
    // Save the data to a JSON file
    const outputPath = path.join(resultsDir, 'event_food_test.json');
    console.log(`\nSaving data to ${outputPath}...`);
    fs.writeFileSync(outputPath, JSON.stringify(events, null, 2));
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log('\n='.repeat(50));
    console.log('SCRAPING SUMMARY');
    console.log('-'.repeat(50));
    console.log(`Total events scraped: ${events.length}`);
    console.log(`Time taken: ${duration.toFixed(2)} seconds`);
    console.log(`Output file: ${outputPath}`);
    console.log(`File size: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`);
    console.log('='.repeat(50));
    console.log('Scraping completed successfully at:', new Date().toLocaleString());
  } catch (error) {
    console.error('\nERROR DURING SCRAPING:');
    console.error('-'.repeat(50));
    console.error(error);
    console.error('-'.repeat(50));
    console.error('Scraping failed at:', new Date().toLocaleString());
  }
}

main();
