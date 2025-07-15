import { chromium, Page, Browser, BrowserContext } from 'playwright';

interface EventDetail {
  name: string;
  artist: string;
  date: string;
  showTime: string;
  location: string;
  ticketPrice: string;
  information: string;
  url: string;
  imageUrl?: string;
}

class LiveContentService {
  private url = 'https://www.livenation.hk/en/event/allevents';

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
    let currentPosition = 0;
    while (currentPosition < scrollHeight) {
        const scrollDistance = Math.floor(Math.random() * 400) + 100;
        await page.evaluate((distance) => {
          window.scrollBy(0, distance);
        }, scrollDistance);
        currentPosition += scrollDistance;
        await new Promise(r => setTimeout(r, Math.random() * 1000 + 500));
    }
  }


  private async extractEventDetails(page: Page, url: string): Promise<EventDetail> {
    console.log(`Extracting details from: ${url}`);
    
    try {
      await page.goto(url, { waitUntil: 'networkidle' });
      await this.simulateHumanBehavior(page);
      const eventDetail = await page.evaluate(() => {
        const infoSection = document.querySelector('[data-testid="edp-main-information-text"]');
        const name = infoSection?.querySelector('h2')?.textContent?.trim() || document.title;
        const information = infoSection?.textContent?.trim() || '';
        let date = '';
        let showTime = '';
        
        // Extract date
        const dateMatch = information.match(/Date:\s*([^\n]+)/) || information.match(/Date: ([^\n]+)/);
        if (dateMatch && dateMatch[1]) {
          const fullDateString = dateMatch[1].trim();
          // Extract just the date part (before Show Time if it exists in the same string)
          const dateShowTimeSplit = fullDateString.split(/Show Time:/i);
          const datePart = dateShowTimeSplit[0].trim();
          
          // Further clean up the date to just include the date and day
          const dateOnlyMatch = datePart.match(/([^\(]+\([^\)]+\))/);
          if (dateOnlyMatch && dateOnlyMatch[1]) {
            date = dateOnlyMatch[1].trim();
          } else {
            date = datePart;
          }
        }
        
        // Extract show time separately
        const showTimeMatch = information.match(/Show Time:\s*([^\n,]+)/) || 
                           information.match(/Show Time: ([^\n,]+)/);
        if (showTimeMatch && showTimeMatch[1]) {
          showTime = showTimeMatch[1].trim();
        }
        let location = '';
        const locationMatch = information.match(/Venue:\s*([^\n]+)/) || information.match(/Venue: ([^\n]+)/);
        if (locationMatch && locationMatch[1]) {
          location = locationMatch[1].trim();
        }
        let ticketPrice = '';
        const priceMatch = information.match(/Ticket:\s*([^\n]+)/) || 
                          information.match(/Ticket: ([^\n]+)/) ||
                          information.match(/Tickets: ([^\n]+)/) ||
                          information.match(/Starting from\s*([^\n]+)/);
        if (priceMatch && priceMatch[1]) {
          ticketPrice = priceMatch[1].trim();
        }
        let artist = '';
        const artistElement = document.querySelector('.MuiTypography-paragraph');
        if (artistElement && !artistElement.classList.contains('headlineArtists')) {
          artist = artistElement.textContent?.trim() || '';
        } else {
          artist = name;
        }
        let imageUrl = '';
        const imageElement = document.querySelector('img[alt="' + name + '"]') || 
                            document.querySelector('img[data-nimg="fill"]');
        if (imageElement) {
          imageUrl = imageElement.getAttribute('src') || '';
        }
        return {
          name,
          artist,
          date,
          showTime,
          location,
          ticketPrice,
          information,
          imageUrl
        };
      });
      
      return {
        ...eventDetail,
        url
      };
      
    } catch (error) {
      console.error(`Failed to extract details from ${url}:`, error);
      return {
        name: 'Error extracting event',
        artist: 'Unknown',
        date: '',
        showTime: '',
        location: '',
        ticketPrice: '',
        information: (error as Error).message,
        url: url,
        imageUrl: ''
      };
    }
  }

  private async getEventLinks(page: Page): Promise<string[]> {
    return await page.evaluate(() => {
      const eventLinks = document.querySelectorAll('a.MuiContainer-root.event-ticket-link');
      const links = Array.from(eventLinks)
        .map(link => {
          const href = link.getAttribute('href');
          if (href && href.startsWith('/')) {
            return `https://www.livenation.hk${href}`;
          }
          return href;
        })
        .filter((href): href is string => !!href && !href.includes('#') && !href.includes('javascript:'));
      return links;
    });
  }

  private async goToNextPage(page: Page): Promise<boolean> {
    try {
      const nextButton = await page.$('.pagination__next:not(.pagination__next--disabled)');
      if (!nextButton) {
        console.log('No next page available');
        return false;
      }
      await nextButton.click();
      await page.waitForLoadState('networkidle');
      await this.simulateHumanBehavior(page);
      console.log('Successfully navigated to next page');
      return true;
    } catch (error) {
      console.error('Failed to navigate to next page:', error);
      return false;
    }
  }
  public async scrapeEvents(): Promise<EventDetail[]> {
    console.log(`Starting to scrape events from ${this.url}`);
    const browser = await chromium.launch({
      headless: true
    });
    
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36'
    });
    const page = await context.newPage();
    const allEvents: EventDetail[] = [];
    let currentPage = 1;
    let hasMorePages = true;
    try {
      await page.goto(this.url, { waitUntil: 'networkidle' });
      await this.simulateHumanBehavior(page);
      while (hasMorePages) {
        console.log(`Processing page ${currentPage}`);
        const eventLinks = await this.getEventLinks(page);
        console.log(`Found ${eventLinks.length} events on page ${currentPage}`);
        for (const eventLink of eventLinks) {
          try {
            const eventDetail = await this.extractEventDetails(page, eventLink);
            allEvents.push(eventDetail);
            console.log(`Successfully scraped: ${eventDetail.name}`);
          } catch (error) {
            console.error(`Error processing event link ${eventLink}:`, error);
          }
          await new Promise(r => setTimeout(r, Math.random() * 2000 + 1000));
        }
        hasMorePages = await this.goToNextPage(page);
        if (hasMorePages) {
          currentPage++;
        }
      }
      
      console.log(`Finished scraping. Found ${allEvents.length} events in total.`);
      return allEvents;
      
    } catch (error) {
      console.error('Error during scraping:', error);
      return allEvents;
    } finally {
      await browser.close();
    }
  }


  public async scrapeEventPage(eventUrl: string): Promise<EventDetail | null> {
    console.log(`Scraping single event from ${eventUrl}`);
    const browser = await chromium.launch({
      headless: true
    });
    
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36'
    });
    const page = await context.newPage();
    try {
      const eventDetail = await this.extractEventDetails(page, eventUrl);
      return eventDetail;
    } catch (error) {
      console.error('Error scraping single event:', error);
      return null;
    } finally {
      await browser.close();
    }
  }
}

export default new LiveContentService();
