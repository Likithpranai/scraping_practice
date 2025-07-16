import { Browser, BrowserContext, chromium, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

export interface CityLineEvent {
  title: string;
  date: string;
  location: string;
  price: string;
  description: string;
  url: string;
  imageUrl: string;
}

export interface CityLineCredentials {
  email: string;
  password: string;
  otp?: string; // Optional OTP code
}

class CityLineService {
  public baseUrl: string = 'https://www.cityline.com/Events.html';
  private browser: Browser | null = null;
  private sessionStoragePath: string = path.join(__dirname, '../../storage/cityline_session.json');
  private cookiesPath: string = path.join(__dirname, '../../storage/cityline_cookies.json');
  private storageStatePath: string = path.join(__dirname, '../../storage/cityline_storage.json');
  private sessionData: any = null;
  
  /**
   * Load session data from storage if it exists
   */
  private async loadSession(): Promise<boolean> {
    try {
      // Create directory if it doesn't exist
      const dir = path.dirname(this.sessionStoragePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // First try to load from the combined auth file (most reliable)
      const combinedAuthPath = path.join(dir, 'cityline_auth.json');
      if (fs.existsSync(combinedAuthPath)) {
        console.log('Loading from combined auth file...');
        const combinedData = JSON.parse(fs.readFileSync(combinedAuthPath, 'utf8'));
        this.sessionData = combinedData;
        
        // Check if the session is recent (less than 24 hours old)
        const timestamp = new Date(combinedData.timestamp);
        const now = new Date();
        const hoursDiff = (now.getTime() - timestamp.getTime()) / (1000 * 60 * 60);
        
        if (hoursDiff > 24) {
          console.warn(`Warning: Session data is ${Math.round(hoursDiff)} hours old. It might be expired.`);
        }
        
        // Validate cookies
        const citylineCookies = combinedData.cookies.filter((cookie: any) => 
          cookie.domain.includes('cityline.com') || 
          cookie.domain.includes('cityline') || 
          cookie.domain === '');
        
        if (citylineCookies.length === 0) {
          console.warn('Warning: No cookies found for cityline.com domain!');
        } else {
          console.log(`Found ${citylineCookies.length} cookies for cityline.com domain`);
          citylineCookies.forEach((cookie: any, index: number) => {
            console.log(`Cookie ${index + 1}: ${cookie.name} (Domain: ${cookie.domain}, Path: ${cookie.path})`);
          });
        }
        
        console.log('Loaded existing session data from combined auth file');
        return true;
      }
      // Then try to load cookies and storage state from the cookie auth files
      else if (fs.existsSync(this.cookiesPath) && fs.existsSync(this.storageStatePath)) {
        console.log('Loading from separate cookie and storage files...');
        const cookies = JSON.parse(fs.readFileSync(this.cookiesPath, 'utf8'));
        const storageState = JSON.parse(fs.readFileSync(this.storageStatePath, 'utf8'));
        
        this.sessionData = {
          cookies,
          storage: storageState,
          timestamp: new Date().toISOString()
        };
        
        // Validate cookies
        const citylineCookies = cookies.filter((cookie: any) => 
          cookie.domain.includes('cityline.com') || 
          cookie.domain.includes('cityline') || 
          cookie.domain === '');
        
        if (citylineCookies.length === 0) {
          console.warn('Warning: No cookies found for cityline.com domain!');
        } else {
          console.log(`Found ${citylineCookies.length} cookies for cityline.com domain`);
        }
        
        console.log('Loaded existing cookies and storage state from cookie auth');
        return true;
      }
      // Fall back to the old session data if available
      else if (fs.existsSync(this.sessionStoragePath)) {
        console.log('Loading from legacy session file...');
        const data = fs.readFileSync(this.sessionStoragePath, 'utf8');
        this.sessionData = JSON.parse(data);
        console.log('Loaded existing session data from legacy file');
        return true;
      }
    } catch (error: any) {
      console.error(`Error loading session: ${error?.message || 'Unknown error'}`);
    }
    return false;
  }
  
  /**
   * Save current session data to storage
   */
  private async saveSession(context: BrowserContext): Promise<void> {
    try {
      // Create directory if it doesn't exist
      const dir = path.dirname(this.sessionStoragePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Get cookies and storage state
      const cookies = await context.cookies();
      const storage = await context.storageState();
      
      this.sessionData = {
        cookies,
        storage,
        timestamp: new Date().toISOString()
      };
      
      fs.writeFileSync(
        this.sessionStoragePath,
        JSON.stringify(this.sessionData, null, 2),
        'utf8'
      );
      
      console.log('Session data saved');
    } catch (error: any) {
      console.error(`Error saving session: ${error?.message || 'Unknown error'}`);
    }
  }

  
  // Array of user agents to rotate through
  private userAgents: string[] = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.81 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.159 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.81 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.82 Safari/537.36 Edg/93.0.961.52'
  ];
  
  // Get a random user agent
  private getRandomUserAgent(): string {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }

  /**
   * Initialize the browser
   */
  private async initBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
      });
    }
    return this.browser;
  }

  /**
   * Simulate human-like behavior on a page
   */
  private async simulateHumanBehavior(page: Page): Promise<void> {
    // Random scroll
    await page.mouse.move(Math.random() * 500, Math.random() * 500);
    await page.waitForTimeout(300 + Math.random() * 500);
    
    // Scroll down
    await page.evaluate(() => {
      window.scrollBy(0, 300);
    });
    await page.waitForTimeout(200 + Math.random() * 300);
    
    // Another random mouse movement
    await page.mouse.move(Math.random() * 800, Math.random() * 600);
    await page.waitForTimeout(200 + Math.random() * 300);
  }
  
  /**
   * Check if the page has a login form or authentication requirement
   * and attempt to bypass it if possible, or log in if credentials are provided
   * 
   * Note: For Cityline's OTP-based authentication, this function will need manual intervention
   * to enter the OTP code that gets sent to the email address.
   */
  private async checkAndBypassLoginForm(page: Page, credentials?: CityLineCredentials): Promise<boolean> {
    // Check for common login form elements
    const hasLoginForm = await page.evaluate(() => {
      // Look for login forms
      const loginForms = document.querySelectorAll('form');
      for (const form of Array.from(loginForms)) {
        const formHTML = form.innerHTML.toLowerCase();
        if (
          formHTML.includes('login') ||
          formHTML.includes('sign in') ||
          formHTML.includes('username') ||
          formHTML.includes('password')
        ) {
          return true;
        }
      }
      
      // Look for login buttons
      const buttons = document.querySelectorAll('button, a, input[type="submit"]');
      for (const button of Array.from(buttons)) {
        const buttonText = button.textContent?.toLowerCase() || '';
        if (
          buttonText.includes('login') ||
          buttonText.includes('sign in') ||
          buttonText.includes('log in')
        ) {
          return true;
        }
      }
      
      return false;
    });
    
    if (hasLoginForm) {
      console.log('  Login form detected.');
      
      // If credentials are provided, attempt to log in
      if (credentials?.email && credentials?.password) {
        console.log('  Attempting to log in with provided credentials...');
        try {
          // Try to find common email/username and password fields
          // First check for email field
          const emailSelectors = [
            'input[type="email"]',
            'input[name="email"]',
            'input[id*="email"]',
            'input[placeholder*="email"]',
            'input[name="username"]',
            'input[id*="username"]',
            'input[placeholder*="username"]'
          ];
          
          // Then check for password field
          const passwordSelectors = [
            'input[type="password"]',
            'input[name="password"]',
            'input[id*="password"]',
            'input[placeholder*="password"]'
          ];
          
          // Find submit button
          const submitSelectors = [
            'button[type="submit"]',
            'input[type="submit"]',
            'button:has-text("Sign In")',
            'button:has-text("Log In")',
            'button:has-text("Login")',
            'a:has-text("Sign In")',
            'a:has-text("Log In")',
            'a:has-text("Login")'
          ];
          
          // Try to find and fill email field
          let emailField = null;
          for (const selector of emailSelectors) {
            emailField = await page.$(selector);
            if (emailField) {
              console.log(`  Found email field with selector: ${selector}`);
              break;
            }
          }
          
          // Try to find and fill password field
          let passwordField = null;
          for (const selector of passwordSelectors) {
            passwordField = await page.$(selector);
            if (passwordField) {
              console.log(`  Found password field with selector: ${selector}`);
              break;
            }
          }
          
          // Try to find submit button
          let submitButton = null;
          for (const selector of submitSelectors) {
            submitButton = await page.$(selector);
            if (submitButton) {
              console.log(`  Found submit button with selector: ${selector}`);
              break;
            }
          }
          
          // If we found all necessary elements, proceed with login
          if (emailField && passwordField && submitButton) {
            console.log('  Attempting to login with email...');
            
            // Clear fields first (in case they have autofill)
            await emailField.click({ clickCount: 3 }); // Triple click to select all text
            await emailField.press('Backspace');
            
            // Fill email field with slight delay between characters to mimic human typing
            await emailField.type(credentials.email, { delay: 100 });
            
            // Wait a bit before clicking submit for email
            await page.waitForTimeout(800);
            
            // Click the submit button to request OTP
            await submitButton.click();
            
            console.log('  Email submitted. Waiting for OTP input field...');
            
            // Wait for OTP input field to appear
            try {
              // Look for OTP input field
              await page.waitForSelector('input[type="text"][placeholder*="OTP"], input[name*="otp"], input[id*="otp"], input[placeholder*="verification"], input[placeholder*="code"]', {
                timeout: 10000
              });
              
              console.log('  OTP input field detected.');
              
              // If OTP was provided in credentials, use it
              if (credentials.otp) {
                console.log('  Using provided OTP code...');
                
                // Find OTP input field
                const otpField = await page.$('input[type="text"][placeholder*="OTP"], input[name*="otp"], input[id*="otp"], input[placeholder*="verification"], input[placeholder*="code"]');
                
                if (otpField) {
                  // Enter OTP code
                  await otpField.type(credentials.otp, { delay: 100 });
                  
                  // Find and click submit button
                  const otpSubmitButton = await page.$('button[type="submit"], input[type="submit"], button:has-text("Submit"), button:has-text("Verify"), button:has-text("Continue")');
                  
                  if (otpSubmitButton) {
                    await otpSubmitButton.click();
                    
                    // Wait for navigation after OTP submission
                    await Promise.race([
                      page.waitForNavigation({ timeout: 10000 }),
                      page.waitForTimeout(5000)
                    ]);
                    
                    // Check if we're past the login screen
                    const stillHasLoginForm = await page.evaluate(() => {
                      return document.querySelector('form input[type="text"][placeholder*="OTP"], input[name*="otp"], input[id*="otp"]') !== null;
                    });
                    
                    if (!stillHasLoginForm) {
                      console.log('  OTP verification appears successful!');
                      return true;
                    } else {
                      console.log('  OTP verification failed.');
                    }
                  } else {
                    console.log('  Could not find OTP submit button.');
                  }
                } else {
                  console.log('  Could not find OTP input field.');
                }
              } else {
                console.log('  No OTP provided in credentials. Cannot proceed with login.');
                console.log('  Note: Cityline requires an OTP sent to your email for authentication.');
              }
            } catch (error: any) {
              console.log('  Error waiting for OTP field:', error?.message || 'Unknown error');
            }
            
            // If we're still here, login was not successful
            console.log('  Login attempt failed.');
          } else {
            console.log('  Could not find all required login form elements.');
          }
        } catch (error: any) {
          console.log(`  Error during login attempt: ${error?.message || 'Unknown error'}`);
        }
      }
      
      // If login failed or no credentials provided, try to bypass
      console.log('  Attempting to bypass login...');
      try {
        const guestButtons = [
          'text=Continue as Guest',
          'text=Skip',
          'text=Not Now',
          'text=Later',
          'text=Continue without login',
          'text=No thanks'
        ];
        
        for (const buttonSelector of guestButtons) {
          const button = await page.$(buttonSelector);
          if (button) {
            console.log(`  Found bypass button: ${buttonSelector}`);
            await button.click();
            await page.waitForTimeout(2000);
            return true;
          }
        }
      } catch (error: any) {
        console.log(`  Error attempting to bypass login: ${error?.message || 'Unknown error'}`);
      }
      
      return false; // Could not bypass login or log in
    }
    
    return true; // No login form detected
  }

  /**
   * Scrape events from CityLine
   * @param limit Number of events to scrape
   * @param credentials Optional login credentials (Note: Cookie-based auth is preferred)
   * @param useCookieAuth Whether to use cookie-based authentication (default: true)
   */
  public async scrapeEvents(limit: number = 5, credentials?: CityLineCredentials, useCookieAuth: boolean = true): Promise<CityLineEvent[]> {
    console.log(`Starting CityLine event scraping (limit: ${limit})...`);
    
    const browser = await chromium.launch({
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process'
      ]
    });
    
    // Use random user agent and add stealth settings
    const randomUserAgent = this.getRandomUserAgent();
    console.log(`Using user agent: ${randomUserAgent}`);
    
    let context;
    
    // Try to use cookie-based authentication if enabled
    if (useCookieAuth) {
      // Load session data (cookies and storage state)
      const hasSession = await this.loadSession();
      
      if (hasSession && this.sessionData) {
        console.log('Using saved session data for authentication...');
        
        try {
          // Create context with storage state if available
          if (this.sessionData.storage) {
            console.log('Creating context with storage state...');
            context = await browser.newContext({
              userAgent: randomUserAgent,
              viewport: { width: 1280, height: 800 },
              storageState: this.sessionData.storage,
              extraHTTPHeaders: {
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br'
              }
            });
          } else {
            // Create context without storage state
            console.log('Creating context without storage state...');
            context = await browser.newContext({
              userAgent: randomUserAgent,
              viewport: { width: 1280, height: 800 },
              extraHTTPHeaders: {
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br'
              }
            });
            
            // Add cookies manually
            if (this.sessionData.cookies && Array.isArray(this.sessionData.cookies)) {
              console.log(`Adding ${this.sessionData.cookies.length} cookies to context...`);
              await context.addCookies(this.sessionData.cookies);
            }
          }
        } catch (error: any) {
          console.log(`Error setting up context with saved session: ${error?.message || 'Unknown error'}`);
          console.log('Falling back to basic context...');
          
          // Create basic context without cookies or storage state
          context = await browser.newContext({
            userAgent: randomUserAgent,
            viewport: { width: 1280, height: 800 },
            extraHTTPHeaders: {
              'Accept-Language': 'en-US,en;q=0.9',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
              'Accept-Encoding': 'gzip, deflate, br'
            }
          });
        }
      } else {
        console.log('No saved authentication data found, creating new context');
        context = await browser.newContext({
          userAgent: randomUserAgent,
          viewport: { width: 1280, height: 800 },
          extraHTTPHeaders: {
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br'
          }
        });
      }
    } else {
      // Create a new context without saved cookies
      context = await browser.newContext({
        userAgent: randomUserAgent,
        viewport: { width: 1280, height: 800 },
        extraHTTPHeaders: {
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br'
        }
      });
    }
    
    // Set cookies to avoid cookie consent dialogs when possible
    await context.addCookies([
      {
        name: 'cookieConsent',
        value: 'true',
        domain: 'cityline.com',
        path: '/',
      },
      {
        name: 'cookiePolicy',
        value: 'accepted',
        domain: 'cityline.com',
        path: '/',
      }
    ]);
    
    const page = await context.newPage();
    const events: CityLineEvent[] = [];
    
    try {
      // Navigate to the events page
      console.log('Navigating to CityLine events page...');
      await page.goto('https://www.cityline.com/Events.html', {
        waitUntil: 'domcontentloaded',
        timeout: 45000 // Increase timeout to 45 seconds
      });
      
      // Wait a bit for content to load after domcontentloaded event
      await page.waitForTimeout(2000);
      
      // Handle cookie consent if it appears
      try {
        const cookieConsentButton = await page.$('button:has-text("Continue browsing")');
        if (cookieConsentButton) {
          console.log('Accepting cookie consent...');
          await cookieConsentButton.click();
          await page.waitForTimeout(1000);
        }
      } catch (error: any) {
        console.log('No cookie consent dialog found or error handling it:', error?.message || 'Unknown error');
      }
      
      // Wait for the event cards to load
      await page.waitForSelector('.cw-eventBox');
      
      // Simulate human-like behavior
      await this.simulateHumanBehavior(page);
      
      // Get all event cards
      const eventCards = await page.$$('.cw-eventBox');
      console.log(`Found ${eventCards.length} event cards`);
      
      // Limit the number of events to scrape
      const eventsToScrape = Math.min(limit, eventCards.length);
      console.log(`Will scrape details for ${eventsToScrape} events`);
      
      const processedUrls = new Set<string>();
      
      // Process each event card
      for (let i = 0; i < eventsToScrape; i++) {
        const card = eventCards[i];
        console.log(`\nProcessing event ${i + 1} of ${eventsToScrape}...`);
        
        // Extract URL from the card
        const linkElement = await card.$('a');
        if (!linkElement) {
          console.log('  No link found in card, skipping...');
          continue;
        }
        
        const url = await linkElement.getAttribute('href');
        if (!url) {
          console.log('  No URL found in link, skipping...');
          continue;
        }
        
        const fullUrl = url.startsWith('http') ? url : `https://www.cityline.com${url}`;
        console.log(`  Event URL: ${fullUrl}`);
        
        // Skip if we've already processed this URL
        if (processedUrls.has(fullUrl)) {
          console.log('  URL already processed, skipping...');
          continue;
        }
        processedUrls.add(fullUrl);
        
        // Extract image URL from the card
        let imageUrl = '';
        const imgElement = await card.$('img');
        if (imgElement) {
          imageUrl = await imgElement.getAttribute('src') || '';
          if (imageUrl && !imageUrl.startsWith('http')) {
            imageUrl = `https://www.cityline.com${imageUrl}`;
          }
        }
        console.log(`  Image URL: ${imageUrl}`);
        
        // Open a new page for the event details
        console.log('  Opening event detail page...');
        const eventPage = await context.newPage();
        
        try {
          // Add retry logic for better reliability
          let retryCount = 0;
          const maxRetries = 2;
          let pageLoaded = false;
          
          while (retryCount <= maxRetries && !pageLoaded) {
            try {
              if (retryCount > 0) {
                console.log(`  Retry attempt ${retryCount} for ${fullUrl}`);
              }
              
              // Use a more lenient wait strategy and add timeout handling
              await eventPage.goto(fullUrl, { 
                waitUntil: 'domcontentloaded',
                timeout: 45000 // Increase timeout to 45 seconds
              });
              
              // Wait a bit for content to load after domcontentloaded event
              await eventPage.waitForTimeout(2000);
              
              // Check for login forms and try to bypass them or log in
              const loginBypassSuccessful = await this.checkAndBypassLoginForm(eventPage, credentials);
              if (!loginBypassSuccessful) {
                console.log('  Could not bypass login requirement, but will try to extract available data');
              }
              
              // Try to wait for some common elements that indicate the page has loaded
              try {
                await Promise.race([
                  eventPage.waitForSelector('h1', { timeout: 5000 }),
                  eventPage.waitForSelector('.title', { timeout: 5000 }),
                  eventPage.waitForSelector('div.tabs-body', { timeout: 5000 })
                ]);
                pageLoaded = true;
              } catch (timeoutError) {
                console.log('  Warning: Timed out waiting for page elements, but continuing anyway');
                pageLoaded = true; // Continue even if we couldn't find specific elements
              }
            } catch (error: any) {
              retryCount++;
              if (retryCount > maxRetries) {
                throw error; // Re-throw if we've exhausted retries
              }
              console.log(`  Navigation error: ${error?.message || 'Unknown error'}. Retrying...`);
              await eventPage.waitForTimeout(2000 * retryCount); // Exponential backoff
            }
          }
          
          // Handle cookie consent on event page if it appears
          try {
            const cookieConsentButton = await eventPage.$('button:has-text("Continue browsing")');
            if (cookieConsentButton) {
              console.log('  Accepting cookie consent on event page...');
              await cookieConsentButton.click();
              await eventPage.waitForTimeout(1000);
            }
          } catch (error: any) {
            console.log('  No cookie consent dialog found on event page or error handling it:', error?.message || 'Unknown error');
          }
          
          // Simulate human-like behavior on the event page
          await this.simulateHumanBehavior(eventPage);
          
          // Extract event details
          console.log('  Extracting event details...');
          
          // Extract title using the selector provided by the user
          let title = '';
          try {
            // First try the specific selector mentioned by the user
            const titleElement = await eventPage.$('body > main > div.info-container > section > h1');
            if (titleElement) {
              title = await titleElement.innerText();
              console.log(`  Successfully extracted title: ${title}`);
            } else {
              console.log('  Title element not found with user-provided selector, trying alternatives');
              // Try h1.title selector
              const titleElement2 = await eventPage.$('h1.title');
              if (titleElement2) {
                title = await titleElement2.innerText();
                console.log(`  Successfully extracted title: ${title}`);
              } else {
                console.log('  Title element not found, trying more alternative selectors');
                // Try alternative selectors
                const h1Elements = await eventPage.$$('h1');
                if (h1Elements.length > 0) {
                  title = await h1Elements[0].innerText();
                  console.log(`  Found title from alternative h1: ${title}`);
                }
              }
            }
          } catch (error: any) {
            console.log(`  Error extracting title: ${error?.message || 'Unknown error'}`);
          }
          
          // Extract date from div.date span:nth-child(2)
          let date = '';
          try {
            const dateElement = await eventPage.$('div.date span:nth-child(2)');
            if (dateElement) {
              date = await dateElement.innerText();
              console.log(`  Successfully extracted date: ${date}`);
            } else {
              console.log('  Date element not found, trying alternative selectors');
              // Try alternative selectors
              const dateDiv = await eventPage.$('div.date');
              if (dateDiv) {
                date = await dateDiv.innerText();
                date = date.replace('Date :', '').trim();
                console.log(`  Found date from div.date: ${date}`);
              } else {
                // Look for text containing date-related keywords
                const paragraphs = await eventPage.$$('p');
                for (const p of paragraphs) {
                  const text = await p.innerText();
                  if (text.includes('Date') || text.includes('date') || 
                      text.includes('2025') || text.includes('2026')) {
                    date = text.trim();
                    console.log(`  Found potential date from paragraph: ${date}`);
                    break;
                  }
                }
              }
            }
          } catch (error: any) {
            console.log(`  Error extracting date: ${error?.message || 'Unknown error'}`);
          }
          
          // Extract location from div.address span:nth-child(2)
          let location = '';
          try {
            const locationElement = await eventPage.$('div.address span:nth-child(2)');
            if (locationElement) {
              location = await locationElement.innerText();
              console.log(`  Successfully extracted location: ${location}`);
            } else {
              console.log('  Location element not found, trying alternative selectors');
              // Try alternative selectors
              const addressDiv = await eventPage.$('div.address');
              if (addressDiv) {
                location = await addressDiv.innerText();
                location = location.replace('Venue :', '').trim();
                console.log(`  Found location from div.address: ${location}`);
              } else {
                // Look for text containing venue-related keywords
                const paragraphs = await eventPage.$$('p');
                for (const p of paragraphs) {
                  const text = await p.innerText();
                  if (text.includes('Venue') || text.includes('venue') || 
                      text.includes('Location') || text.includes('location')) {
                    location = text.trim();
                    console.log(`  Found potential location from paragraph: ${location}`);
                    break;
                  }
                }
              }
            }
          } catch (error: any) {
            console.log(`  Error extracting location: ${error?.message || 'Unknown error'}`);
          }
          
          // Extract description from div.tabs-body
          let description = '';
          try {
            const tabsBodyElement = await eventPage.$('div.tabs-body');
            if (tabsBodyElement) {
              // Get the HTML content to preserve formatting
              const tabInfoElement = await eventPage.$('div.tabs-body div#tab-info');
              if (tabInfoElement) {
                description = await tabInfoElement.innerText();
                console.log(`  Successfully extracted description (${description.length} characters)`);
              } else {
                // Fallback to the entire tabs-body if tab-info is not found
                description = await tabsBodyElement.innerText();
                console.log(`  Extracted description from tabs-body (${description.length} characters)`);
              }
            } else {
              console.log('  Description element not found, trying alternative approach');
              // Fallback: look for paragraphs
              const descriptionElements = await eventPage.$$('p');
              for (const element of descriptionElements) {
                const text = await element.innerText();
                if (text && text.length > 50) { // Assuming longer paragraphs are part of the description
                  description += text + '\n\n';
                }
              }
            }
          } catch (error: any) {
            console.log(`  Error extracting description: ${error?.message || 'Unknown error'}`);
          }
          
          // Extract price - look for elements containing price-related text
          let price = '';
          try {
            // Look for paragraphs with price information
            const pricePatterns = [
              'Ticket Price',
              'ticket price',
              'Price',
              'price',
              'Standard Ticket Price',
              'Tickets:'
            ];
            
            // First try to find paragraphs with price headers
            const allParagraphs = await eventPage.$$('p, span, div');
            let foundPriceHeader = false;
            
            for (const p of allParagraphs) {
              const text = await p.innerText();
              const textLower = text.toLowerCase();
              
              // Check if this is a price header
              if (!foundPriceHeader && pricePatterns.some(pattern => textLower.includes(pattern.toLowerCase()))) {
                foundPriceHeader = true;
                console.log(`  Found price header: ${text}`);
                
                // If the header itself contains price information, use it
                if (text.includes('$')) {
                  price = text.trim();
                  console.log(`  Price found in header: ${price}`);
                  break;
                }
                continue;
              }
              
              // If we found a price header in a previous iteration, look for price in this paragraph
              if (foundPriceHeader && text.includes('$')) {
                price = text.trim();
                console.log(`  Price found after header: ${price}`);
                break;
              }
            }
            
            // If still no price found, look for any paragraph with $ sign
            if (!price) {
              for (const p of allParagraphs) {
                const text = await p.innerText();
                if (text.includes('$')) {
                  price = text.trim();
                  console.log(`  Price found in general search: ${price}`);
                  break;
                }
              }
            }
            
            if (!price) {
              console.log('  Price information not found');
            }
          } catch (error: any) {
            console.log(`  Error extracting price: ${error?.message || 'Unknown error'}`);
          }
          
          console.log(`  Price: ${price}`);
          
          // Add the event to our results
          events.push({
            title,
            date,
            price,
            location,
            description: description.trim(),
            url: fullUrl,
            imageUrl
          });
          
        } catch (error: any) {
          console.error(`  Error processing event page: ${error?.message || 'Unknown error'}`);
          
          // Even if we couldn't access the full page, add the event with the data we have
          if (!events.some(e => e.url === fullUrl)) {
            console.log('  Adding event with partial data (URL and image only)');
            events.push({
              title: 'Unknown Title (Login Required)',
              date: '',
              price: '',
              location: '',
              description: 'This event requires login to view full details.',
              url: fullUrl,
              imageUrl
            });
          }
        } finally {
          // Close the event page to free resources
          await eventPage.close();
        }
      }
      
      return events;
      
    } catch (error: any) {
      console.error(`Error during scraping: ${error?.message || 'Unknown error'}`);
      return events;
    } finally {
      // Clean up resources
      await page.close();
      await browser.close();
    }
  }
}

export default new CityLineService();
