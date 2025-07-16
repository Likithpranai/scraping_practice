import fs from 'fs';
import path from 'path';
import cityLineService, { CityLineCredentials } from './services/cityline.service';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

async function scrapeCityLineEvents() {
  console.log('==================================================');
  console.log('CITYLINE EVENTS SCRAPER');
  console.log('==================================================');
  
  const startTime = new Date();
  console.log(`Starting scraper at: ${startTime.toLocaleString()}`);
  console.log('');
  
  try {
    // Check if cookie files exist
    const cookiesPath = path.join(__dirname, '../storage/cityline_cookies.json');
    const storageStatePath = path.join(__dirname, '../storage/cityline_storage.json');
    const hasCookies = fs.existsSync(cookiesPath) && fs.existsSync(storageStatePath);
    
    if (hasCookies) {
      console.log('Found saved authentication cookies. Will use cookie-based authentication.');
    } else {
      console.log('No saved cookies found. Please run the cookie-auth.ts script first.');
      console.log('You can run it with: npx ts-node src/cookie-auth.ts');
      console.log('Continuing with limited access...');
    }
    
    // Check for credentials in environment variables as fallback
    const credentials: CityLineCredentials | undefined = process.env.CITYLINE_EMAIL && process.env.CITYLINE_PASSWORD
      ? {
          email: process.env.CITYLINE_EMAIL,
          password: process.env.CITYLINE_PASSWORD
        }
      : undefined;
    
    if (!hasCookies && credentials) {
      console.log('Using credentials from environment variables as fallback');
    } else if (!hasCookies) {
      console.log('No credentials found in environment variables. Will attempt to scrape with limited access.');
    }
    
    // Scrape events with cookie-based authentication
    console.log('Scraping CityLine events...');
    const events = await cityLineService.scrapeEvents(10, credentials, true); // Use cookie auth by default
    
    // Save results
    const outputPath = path.join(__dirname, '../results/cityline_test.json');
    fs.writeFileSync(outputPath, JSON.stringify(events, null, 2));
    
    const endTime = new Date();
    const duration = (endTime.getTime() - startTime.getTime()) / 1000;
    
    console.log('\n==================================================');
    console.log('SCRAPING COMPLETED SUCCESSFULLY');
    console.log('==================================================');
    console.log(`Start time: ${startTime.toLocaleString()}`);
    console.log(`End time: ${endTime.toLocaleString()}`);
    console.log(`Duration: ${duration.toFixed(2)} seconds`);
    console.log(`Total events scraped: ${events.length}`);
    
    const stats = fs.statSync(outputPath);
    console.log(`Output file size: ${(stats.size / 1024).toFixed(2)} KB`);
    console.log(`Output file path: ${outputPath}`);
    
  } catch (error) {
    console.error('Error during scraping:', error);
  }
}

scrapeCityLineEvents();
