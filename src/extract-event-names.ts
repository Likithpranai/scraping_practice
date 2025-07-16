import { chromium, Browser, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

// Output file path
const OUTPUT_FILE = path.join(__dirname, '../data/cityline_names.json');

// Ensure data directory exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

/**
 * Extract event names from image alt attributes on Cityline website
 */
async function extractEventNames(): Promise<void> {
  console.log('==================================================');
  console.log('CITYLINE EVENT NAME EXTRACTOR');
  console.log('==================================================');
  console.log('This script will extract event names from Cityline image alt attributes');
  
  // Launch browser
  console.log('\nLaunching browser...');
  const browser = await chromium.launch({ 
    headless: false, // Set to true for production
    slowMo: 50
  });
  
  try {
    // Create a new context
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Navigate to Cityline
    console.log('Navigating to Cityline...');
    await page.goto('https://www.cityline.com/');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    console.log('Page loaded');
    
    // Wait for events to load
    console.log('Waiting for events to load...');
    await page.waitForSelector('img[src*="shows.cityline.com/images"]', { timeout: 30000 })
      .catch(() => console.log('Warning: Could not find event images. Continuing anyway...'));
    
    // Function to extract event names from the current page
    const extractCurrentEvents = async () => {
      return await page.evaluate(() => {
        // Find all img tags that are likely to be event images
        // Target specifically images from shows.cityline.com
        const images = document.querySelectorAll('img[src*="shows.cityline.com/images"]');
        const eventNames: string[] = [];
        
        // Extract alt attributes
        images.forEach(img => {
          const alt = img.getAttribute('alt');
          // Only include non-empty alt attributes
          if (alt && alt.trim() !== '') {
            eventNames.push(alt.trim());
          }
        });
        
        // If we didn't find any with the specific selector, try a broader approach
        if (eventNames.length === 0) {
          // Look for images in event card containers
          document.querySelectorAll('.event-card img, .show-card img, .event-item img, [class*="event"] img').forEach(img => {
            const alt = img.getAttribute('alt');
            if (alt && alt.trim() !== '') {
              eventNames.push(alt.trim());
            }
          });
        }
        
        return eventNames;
      });
    };
    
    // Function to scroll down and load more content
    const scrollDown = async () => {
      return await page.evaluate(() => {
        const previousHeight = window.scrollY + window.innerHeight;
        window.scrollTo(0, document.body.scrollHeight);
        return previousHeight < document.body.scrollHeight;
      });
    };
    
    // Extract event names with infinite scrolling
    console.log('Extracting event names with infinite scrolling...');
    
    let allEvents: string[] = [];
    let previousEventCount = 0;
    let scrollAttempts = 0;
    const maxScrollAttempts = 20; // Limit scrolling to prevent infinite loops
    
    // Initial extraction
    let currentEvents = await extractCurrentEvents();
    allEvents = [...currentEvents];
    console.log(`Found ${allEvents.length} events initially`);
    
    // Scroll and extract more events
    while (scrollAttempts < maxScrollAttempts) {
      // Scroll down to load more content
      const hasScrolled = await scrollDown();
      
      // Wait for new content to load
      await page.waitForTimeout(2000);
      
      // Extract events after scrolling
      currentEvents = await extractCurrentEvents();
      
      // Add new events to our collection
      allEvents = [...allEvents, ...currentEvents];
      
      // Remove duplicates
      allEvents = [...new Set(allEvents)];
      
      console.log(`Found ${allEvents.length} events after scroll #${scrollAttempts + 1}`);
      
      // If no new events were found after scrolling, we might have reached the end
      if (allEvents.length === previousEventCount || !hasScrolled) {
        scrollAttempts++;
        if (scrollAttempts >= 3) { // Try a few more times before giving up
          console.log('No new events found after scrolling, probably reached the end');
          break;
        }
      } else {
        // Reset counter if we found new events
        scrollAttempts = 0;
      }
      
      previousEventCount = allEvents.length;
    }
    
    const events = allEvents;
    
    // Remove duplicates
    const uniqueEvents = [...new Set(events)];
    
    console.log(`Found ${uniqueEvents.length} unique event names`);
    
    // Create JSON structure
    const eventsData = uniqueEvents.map(name => ({ name }));
    
    // Save to file
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(eventsData, null, 2));
    console.log(`✅ All ${uniqueEvents.length} event names saved to ${OUTPUT_FILE}`);
    
    // Print the total number of events found
    console.log(`\nTotal events found: ${uniqueEvents.length}`);
    
    // Print first 10 events as sample
    if (uniqueEvents.length > 0) {
      console.log('Sample of extracted event names:');
      const sampleSize = Math.min(10, uniqueEvents.length);
      uniqueEvents.slice(0, sampleSize).forEach((name, index) => {
        console.log(`${index + 1}. ${name}`);
      });
    } else {
      console.log('No event names found!');
    }
    
  } catch (error: any) {
    console.error('Error during extraction:', error?.message || 'Unknown error');
  } finally {
    // Close browser
    await browser.close();
    console.log('\nBrowser closed');
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  try {
    await extractEventNames();
  } catch (error: any) {
    console.error('Fatal error:', error?.message || 'Unknown error');
  }
  process.exit(0);
}

// Run the main function
main();
