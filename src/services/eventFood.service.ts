import { chromium, Page, Browser, BrowserContext } from 'playwright';

interface EventDetail {
  name: string;
  date: string;
  location: string;
  price: string;
  status?: string;
  about?: string;
  url: string;
  imageUrl?: string;
}

class EventFoodService {
  private baseUrl = 'https://www.eventbrite.hk/d/hong-kong-sar/food-and-drink--events/';

  private async simulateHumanBehavior(page: Page): Promise<void> {
    await new Promise(r => setTimeout(r, Math.random() * 3000 + 2000));

    for (let i = 0; i < 5; i++) {
      await page.mouse.move(
        Math.random() * 1000,
        Math.random() * 1000
      );
      await new Promise(r => setTimeout(r, Math.random() * 500 + 200));
    }

    const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
    const viewportHeight = await page.evaluate(() => window.innerHeight);
    let currentPosition = 0;

    while (currentPosition < scrollHeight) {
      currentPosition += viewportHeight * (Math.random() * 0.4 + 0.6);
      await page.evaluate((position) => {
        window.scrollTo(0, position);
      }, currentPosition);
      await new Promise(r => setTimeout(r, Math.random() * 1000 + 500));
    }

    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    await new Promise(r => setTimeout(r, Math.random() * 1000 + 500));
  }

  private async extractEventCards(page: Page): Promise<EventDetail[]> {
    console.log('Extracting event cards from page...');
    
    // Using a more robust approach to extract event information
    const events = await page.evaluate(() => {
      const events: EventDetail[] = [];
      
      // Find all event cards with the class 'event-card'
      const eventCards = document.querySelectorAll('div[class*="event-card"]');
      console.log(`Found ${eventCards.length} event cards`);
      
      eventCards.forEach((card, index) => {
        try {
          console.log(`Processing card ${index + 1}...`);
          
          // Get the URL from the event-card-link
          const linkElement = card.querySelector('a.event-card-link');
          const url = linkElement?.getAttribute('href') || '';
          
          // Get the name from h3
          const nameElement = card.querySelector('h3');
          const name = nameElement?.textContent?.trim() || '';
          
          // Get all paragraph elements that might contain date and location
          const paragraphs = card.querySelectorAll('p');
          let date = '';
          let location = '';
          
          // Loop through paragraphs to find date and location
          // Date typically contains time or day of week
          // Location typically doesn't have numbers or time formats
          paragraphs.forEach((p, i) => {
            const text = p.textContent?.trim() || '';
            if (text) {
              // If it's the first paragraph after the title, it's likely the date
              if (i === 0 && (text.includes(',') || /\d+/.test(text) || text.includes(':') || 
                  text.includes('Mon') || text.includes('Tue') || text.includes('Wed') || 
                  text.includes('Thu') || text.includes('Fri') || text.includes('Sat') || 
                  text.includes('Sun'))) {
                date = text;
              } 
              // If it's the second paragraph, it's likely the location
              else if (i === 1) {
                location = text;
              }
              // If we haven't found a date yet and this looks like one
              else if (!date && (text.includes(',') || /\d+/.test(text) || text.includes(':') || 
                      text.includes('Mon') || text.includes('Tue') || text.includes('Wed') || 
                      text.includes('Thu') || text.includes('Fri') || text.includes('Sat') || 
                      text.includes('Sun'))) {
                date = text;
              }
              // If we haven't found a location yet and this doesn't look like a date
              else if (!location && !text.includes(':') && !/\d+/.test(text)) {
                location = text;
              }
            }
          });
          
          // Get the price
          const priceElement = card.querySelector('[class*="priceWrapper"] p');
          const price = priceElement?.textContent?.trim() || '';
          
          // Get the image URL
          const imageElement = card.querySelector('img');
          const imageUrl = imageElement?.getAttribute('src') || '';
          
          // Get the status (if available)
          const statusElement = card.querySelector('.EventCardUrgencySignal p, [class*="going-fast"] p, [class*="status"]');
          const status = statusElement?.textContent?.trim() || '';
          
          // Check if we have enough information to add this event
          if (name && url) {
            events.push({
              name,
              date,
              location,
              price,
              status,
              url,
              imageUrl,
              about: ''
            });
            console.log(`Added event ${index + 1}: ${name} | Date: ${date} | Location: ${location}`);
          } else {
            console.log(`Skipped event ${index + 1} due to missing name or URL`);
          }
        } catch (error) {
          console.error(`Error extracting event card ${index + 1} data:`, error);
        }
      });
      
      return events;
    });
    
    console.log(`Successfully extracted ${events.length} events from the page`);
    return events;
  }

  private async getEventDetails(page: Page, url: string): Promise<{about: string, fullLocation: string}> {
    try {
      console.log(`  Navigating to event page: ${url}`);
      await page.goto(url, { waitUntil: 'networkidle' });
      
      console.log(`  Simulating human behavior on event page...`);
      await this.simulateHumanBehavior(page);
      
      console.log(`  Extracting about section and location information...`);
      const details = await page.evaluate(() => {
        // Extract about section
        const aboutSection = document.querySelector('.event-details__about');
        let aboutText = '';
        if (aboutSection) {
          aboutText = aboutSection.textContent?.trim() || '';
        } else {
          const descriptionSection = document.querySelector('.eds-text--left');
          if (descriptionSection) {
            aboutText = descriptionSection.textContent?.trim() || '';
          }
        }
        
        // Extract full location information
        let fullLocation = '';
        const locationInfo = document.querySelector('.location-info');
        if (locationInfo) {
          const locationName = locationInfo.querySelector('.location-info__address-text');
          const locationAddress = locationInfo.querySelector('.location-info__address');
          
          if (locationName) {
            fullLocation = locationName.textContent?.trim() || '';
          }
          
          if (locationAddress) {
            // Get the text content directly from the div, excluding the button text
            const addressText = locationAddress.textContent?.trim() || '';
            // Remove the location name and 'Get directions' text if present
            const cleanedAddress = addressText
              .replace(fullLocation, '')
              .replace('Get directions', '')
              .trim();
            
            if (cleanedAddress) {
              fullLocation = fullLocation ? `${fullLocation}, ${cleanedAddress}` : cleanedAddress;
            }
          }
        }
        
        return { aboutText, fullLocation };
      });
      
      if (details.aboutText) {
        console.log(`  Successfully extracted about section (${details.aboutText.length} characters)`);
      } else {
        console.log(`  No about section found`);
      }
      
      if (details.fullLocation) {
        console.log(`  Successfully extracted full location: ${details.fullLocation}`);
      } else {
        console.log(`  No detailed location information found`);
      }
      
      return { about: details.aboutText, fullLocation: details.fullLocation };
    } catch (error) {
      console.error(`  Error getting event details from ${url}:`, error);
      return { about: '', fullLocation: '' };
    }
  }

  public async scrapeEventsFromPage(pageNumber: number = 1): Promise<EventDetail[]> {
    console.log(`Starting to scrape page ${pageNumber}...`);
    console.log('Launching browser...');
    const browser = await chromium.launch({
      headless: true
    });
    
    try {
      console.log('Creating browser context...');
      const context = await browser.newContext({
        viewport: { width: 1366, height: 768 },
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36'
      });
      
      const page = await context.newPage();
      
      const url = `${this.baseUrl}?page=${pageNumber}`;
      console.log(`Navigating to ${url}...`);
      await page.goto(url, { waitUntil: 'networkidle' });
      
      console.log('Simulating human behavior...');
      await this.simulateHumanBehavior(page);
      
      const events = await this.extractEventCards(page);
      
      console.log(`Visiting ${events.length} event pages to get 'about' information...`);
      for (let i = 0; i < events.length; i++) {
        const event = events[i];
        if (event.url) {
          console.log(`[${i+1}/${events.length}] Getting details for: ${event.name}`);
          const details = await this.getEventDetails(page, event.url);
          event.about = details.about;
          
          // Update location with more detailed information if available
          if (details.fullLocation) {
            event.location = details.fullLocation;
          }
          
          console.log(`  → About section length: ${details.about.length} characters`);
          
          await new Promise(r => setTimeout(r, Math.random() * 2000 + 1000));
        }
      }
      
      console.log(`Finished scraping page ${pageNumber}. Found ${events.length} events.`);
      return events;
    } catch (error) {
      console.error('Error scraping events:', error);
      return [];
    } finally {
      console.log('Closing browser...');
      await browser.close();
    }
  }

  public async scrapeEvents(pages: number = 1): Promise<EventDetail[]> {
    console.log(`Starting to scrape ${pages} page(s) from Eventbrite...`);
    let allEvents: EventDetail[] = [];
    
    for (let i = 1; i <= pages; i++) {
      console.log(`\n===== SCRAPING PAGE ${i} OF ${pages} =====`);
      const events = await this.scrapeEventsFromPage(i);
      allEvents = [...allEvents, ...events];
      console.log(`Added ${events.length} events from page ${i}. Total events so far: ${allEvents.length}`);
      
      if (i < pages) {
        const waitTime = Math.floor(Math.random() * 5000 + 3000);
        console.log(`Waiting ${waitTime}ms before scraping next page...`);
        await new Promise(r => setTimeout(r, waitTime));
      }
    }
    
    console.log(`\n===== SCRAPING COMPLETE =====`);
    console.log(`Total events scraped: ${allEvents.length}`);
    return allEvents;
  }
}

export default new EventFoodService();