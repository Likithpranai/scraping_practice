import { chromium, Browser, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

// Output file path
const OUTPUT_FILE = path.join(__dirname, '../data/cityline_data.json');

// Ensure data directory exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

interface EventData {
  name: string;
  tags: string[];
}

/**
 * Extract event names and tags from Cityline website
 */
async function extractEventData(): Promise<void> {
  console.log('==================================================');
  console.log('CITYLINE EVENT DATA EXTRACTOR');
  console.log('==================================================');
  console.log('This script will extract event names and tags from Cityline');
  
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
    
    // Navigate to Cityline (Chinese version)
    console.log('Navigating to Cityline (Chinese version)...');
    await page.goto('https://www.cityline.com/tc/');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    console.log('Page loaded');
    
    // Wait for events to load
    console.log('Waiting for events to load...');
    await page.waitForSelector('img[src*="shows.cityline.com/images"]', { timeout: 30000 })
      .catch(() => console.log('Warning: Could not find event images. Continuing anyway...'));
    
    // Function to extract event data from the current page
    const extractCurrentEventData = async () => {
      return await page.evaluate(() => {
        // Find all event boxes with the specific class structure from the HTML
        const eventBoxes = document.querySelectorAll('.cw-eventBox');
        console.log(`Found ${eventBoxes.length} event boxes on the page`);
        
        const eventDataList: Array<{name: string, tags: string[]}> = [];
        
        eventBoxes.forEach(box => {
          try {
            // Extract name from img alt attribute
            const img = box.querySelector('img[src*="shows.cityline.com/images"]');
            let name = '';
            if (img) {
              name = img.getAttribute('alt') || '';
            }
            
            // Extract tags - even if they're in a hidden div
            const tags: string[] = [];
            const tagsContainer = box.querySelector('.event-tags');
            
            if (tagsContainer) {
              const tagElements = tagsContainer.querySelectorAll('.event-tag');
              tagElements.forEach(tag => {
                const tagText = tag.textContent?.trim();
                if (tagText) {
                  tags.push(tagText);
                }
              });
            }
            
            // Only add if we have a name
            if (name) {
              eventDataList.push({ name, tags });
              console.log(`Found event: ${name} with ${tags.length} tags`);
            }
          } catch (error) {
            // Ignore errors for individual cards
          }
        });
        
        return eventDataList;
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
    
    // Extract event data with infinite scrolling
    console.log('Extracting event data with infinite scrolling...');
    
    let allEventData: EventData[] = [];
    let previousEventCount = 0;
    let scrollAttempts = 0;
    const maxScrollAttempts = 20; // Limit scrolling to prevent infinite loops
    
    // Initial extraction
    let currentEventData = await extractCurrentEventData();
    allEventData = [...currentEventData];
    console.log(`Found ${allEventData.length} events initially`);
    
    // Scroll and extract more events
    while (scrollAttempts < maxScrollAttempts) {
      // Scroll down to load more content
      const hasScrolled = await scrollDown();
      
      // Wait for new content to load
      await page.waitForTimeout(2000);
      
      // Extract events after scrolling
      currentEventData = await extractCurrentEventData();
      
      // Add new events to our collection
      allEventData = [...allEventData, ...currentEventData];
      
      // Remove duplicates based on name
      const uniqueNames = new Set();
      allEventData = allEventData.filter(event => {
        if (uniqueNames.has(event.name)) {
          return false;
        }
        uniqueNames.add(event.name);
        return true;
      });
      
      console.log(`Found ${allEventData.length} events after scroll #${scrollAttempts + 1}`);
      
      // If no new events were found after scrolling, we might have reached the end
      if (allEventData.length === previousEventCount || !hasScrolled) {
        scrollAttempts++;
        if (scrollAttempts >= 3) { // Try a few more times before giving up
          console.log('No new events found after scrolling, probably reached the end');
          break;
        }
      } else {
        // Reset counter if we found new events
        scrollAttempts = 0;
      }
      
      previousEventCount = allEventData.length;
    }
    
    // Save to file
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allEventData, null, 2));
    console.log(`✅ All ${allEventData.length} events with tags saved to ${OUTPUT_FILE}`);
    
    // Print the total number of events found
    console.log(`\nTotal events found: ${allEventData.length}`);
    
    // Print sample of events with tags
    if (allEventData.length > 0) {
      console.log('\nSample of extracted event data:');
      const sampleSize = Math.min(5, allEventData.length);
      allEventData.slice(0, sampleSize).forEach((event, index) => {
        console.log(`${index + 1}. ${event.name}`);
        console.log(`   Tags: ${event.tags.join(', ') || 'None'}`);
      });
    } else {
      console.log('No events found!');
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
    await extractEventData();
  } catch (error: any) {
    console.error('Fatal error:', error?.message || 'Unknown error');
  }
  process.exit(0);
}

// Run the main function
main();
