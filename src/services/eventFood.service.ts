import { chromium, Page, Browser, BrowserContext } from 'playwright';

interface EventDetail {
  name: string;
  dateTime: string;
  location: string;
  price: string;
  status?: string;
  about?: string;
  url: string;
  imageUrl?: string;
}

class EventFoodService {
  public baseUrl = 'https://www.eventbrite.hk/d/hong-kong-sar/food-and-drink--events/';

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
      
      // Keep track of URLs to avoid duplicates
      const processedUrls = new Set();
      
      eventCards.forEach((card, index) => {
        try {
          console.log(`Processing card ${index + 1}...`);
          
          // Get the URL from the event-card-link
          const linkElement = card.querySelector('a.event-card-link');
          const url = linkElement?.getAttribute('href') || '';
          
          // Skip if we've already processed this URL
          if (processedUrls.has(url)) {
            console.log(`Skipping duplicate event with URL: ${url}`);
            return;
          }
          
          // Get the name from h3
          const nameElement = card.querySelector('h3');
          const name = nameElement?.textContent?.trim() || '';
          
          // Get all paragraph elements that might contain date and location
          const paragraphs = card.querySelectorAll('p');
          let dateTime = '';
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
                dateTime = text;
              } 
              // If it's the second paragraph, it's likely the location
              else if (i === 1) {
                location = text;
              }
              // If we haven't found a date yet and this looks like one
              else if (!dateTime && (text.includes(',') || /\d+/.test(text) || text.includes(':') || 
                      text.includes('Mon') || text.includes('Tue') || text.includes('Wed') || 
                      text.includes('Thu') || text.includes('Fri') || text.includes('Sat') || 
                      text.includes('Sun'))) {
                dateTime = text;
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
            // Add URL to processed set to avoid duplicates
            processedUrls.add(url);
            
            events.push({
              name,
              dateTime,
              location,
              price,
              status,
              url,
              imageUrl,
              about: ''
            });
            console.log(`Added event ${index + 1}: ${name} | Date & Time: ${dateTime} | Location: ${location}`);
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

  private async getEventDetails(page: Page, url: string): Promise<{about: string, fullLocation: string, fullDate: string}> {
    try {
      console.log(`  Navigating to event page: ${url}`);
      await page.goto(url, { waitUntil: 'networkidle' });
      
      console.log(`  Simulating human behavior on event page...`);
      await this.simulateHumanBehavior(page);
      
      console.log(`  Extracting about section, location, and date information...`);
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
        
        // Extract full date information using multiple strategies
        let fullDate = '';
        
        // Strategy 1: Try the specific date-info element first
        const dateInfo = document.querySelector('.date-info');
        if (dateInfo) {
          const dateTimeElement = dateInfo.querySelector('.date-info__full-datetime');
          if (dateTimeElement) {
            fullDate = dateTimeElement.textContent?.trim() || '';
          }
        }
        
        // Strategy 2: Try the specific Typography element for date
        if (!fullDate) {
          const dateTypography = document.querySelector('p.Typography_root__487rx.Typography_body-md__487rx.event-card__clamp-line--one');
          if (dateTypography) {
            fullDate = dateTypography.textContent?.trim() || '';
          }
        }
        
        // Strategy 3: Look for any element containing the word 'Date'
        if (!fullDate) {
          // Get all text nodes in the document
          const allElements = document.querySelectorAll('*');
          for (let i = 0; i < allElements.length; i++) {
            const element = allElements[i];
            const text = element.textContent || '';
            if (text.includes('Date') || text.includes('date')) {
              // Found an element with 'Date' in it, extract the content
              const dateMatch = text.match(/Date[s]?[:\s]+(.*?)(?:(?:\.|$|Time|Location))/i);
              if (dateMatch && dateMatch[1]) {
                fullDate = dateMatch[1].trim();
                break;
              }
            }
          }
        }
        
        return { aboutText, fullLocation, fullDate };
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
      
      if (details.fullDate) {
        console.log(`  Successfully extracted full date: ${details.fullDate}`);
      } else {
        console.log(`  No detailed date information found`);
      }
      
      return { about: details.aboutText, fullLocation: details.fullLocation, fullDate: details.fullDate };
    } catch (error) {
      console.error(`  Error getting event details from ${url}:`, error);
      return { about: '', fullLocation: '', fullDate: '' };
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
          
          // Update dateTime with more accurate information if available
          if (details.fullDate) {
            event.dateTime = details.fullDate;
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
  
  public async scrapeAdditionalPages(pageNumbers: number[]): Promise<EventDetail[]> {
    console.log(`Starting to scrape ${pageNumbers.length} additional page(s) from Eventbrite...`);
    let allEvents: EventDetail[] = [];
    
    for (let i = 0; i < pageNumbers.length; i++) {
      const pageNumber = pageNumbers[i];
      console.log(`\n===== SCRAPING PAGE ${pageNumber} (${i + 1}/${pageNumbers.length}) =====`);
      const events = await this.scrapeEventsFromPage(pageNumber);
      allEvents = [...allEvents, ...events];
      console.log(`Added ${events.length} events from page ${pageNumber}. Total events so far: ${allEvents.length}`);
      
      if (i < pageNumbers.length - 1) {
        const waitTime = Math.floor(Math.random() * 5000 + 3000);
        console.log(`Waiting ${waitTime}ms before scraping next page...`);
        await new Promise(r => setTimeout(r, waitTime));
      }
    }
    
    console.log(`\n===== ADDITIONAL SCRAPING COMPLETE =====`);
    console.log(`Total additional events scraped: ${allEvents.length}`);
    return allEvents;
  }
}

export default new EventFoodService();