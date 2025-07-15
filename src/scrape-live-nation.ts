import * as fs from 'fs';
import * as path from 'path';
import liveContentService from './services/liveContent.service';

async function scrapeLiveNation() {
  console.log('Starting Live Nation scraping...');
  
  try {
    // Scrape all events
    const events = await liveContentService.scrapeEvents();
    
    console.log(`Successfully scraped ${events.length} events from Live Nation`);
    
    // Create results directory if it doesn't exist
    const resultsDir = path.join(__dirname, '../results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }
    
    // Save to JSON file
    const outputPath = path.join(resultsDir, 'live_nation_data.json');
    fs.writeFileSync(outputPath, JSON.stringify(events, null, 2));
    
    console.log(`Data saved to ${outputPath}`);
  } catch (error) {
    console.error('Error during Live Nation scraping:', error);
  }
}

// Run the scraper
scrapeLiveNation();
