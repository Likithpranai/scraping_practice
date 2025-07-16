import { chromium, Page, ElementHandle, Browser } from 'playwright';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import readline from 'readline';

// Load environment variables
dotenv.config();

/**
 * Save Cityline cookies and storage state for future use
 */
async function saveCitylineCookies(page: Page): Promise<void> {
  try {
    // Create storage directory if it doesn't exist
    const storageDir = path.join(__dirname, '../storage');
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }
    
    // Wait a moment to ensure all cookies are set
    await page.waitForTimeout(2000);
    
    // Save cookies with domain information
    const cookies = await page.context().cookies();
    
    // Log cookie information for debugging
    console.log(`Found ${cookies.length} cookies`);
    cookies.forEach((cookie, index) => {
      console.log(`Cookie ${index + 1}: ${cookie.name} (Domain: ${cookie.domain}, Path: ${cookie.path})`);
    });
    
    // Make sure we have cookies for cityline.com domain
    const citylineCookies = cookies.filter(cookie => 
      cookie.domain.includes('cityline.com') || 
      cookie.domain.includes('cityline') || 
      cookie.domain === '');
    
    if (citylineCookies.length === 0) {
      console.warn('Warning: No cookies found for cityline.com domain!');
    } else {
      console.log(`Found ${citylineCookies.length} cookies for cityline.com domain`);
    }
    
    const cookiesPath = path.join(storageDir, 'cityline_cookies.json');
    fs.writeFileSync(cookiesPath, JSON.stringify(cookies, null, 2));
    console.log(`Cookies saved to ${cookiesPath}`);
    
    // Save storage state with more detailed information
    const storageState = await page.context().storageState();
    
    // Log storage state information for debugging
    console.log('Storage state:');
    console.log(`- Origins: ${storageState.origins.length}`);
    
    const storageStatePath = path.join(storageDir, 'cityline_storage.json');
    fs.writeFileSync(storageStatePath, JSON.stringify(storageState, null, 2));
    console.log(`Storage state saved to ${storageStatePath}`);
    
    // Create a combined authentication file for easier loading
    const combinedAuth = {
      cookies,
      storageState
    };
    
    const combinedAuthPath = path.join(storageDir, 'cityline_auth.json');
    fs.writeFileSync(combinedAuthPath, JSON.stringify(combinedAuth, null, 2));
    console.log(`Combined authentication data saved to ${combinedAuthPath}`);
    
  } catch (error) {
    console.error('Error saving cookies:', error);
  }
}

/**
 * Handle popup dialogs that might appear during login
 */
async function handlePopups(page: Page): Promise<void> {
  try {
    console.log('Checking for popups...');
    
    // List of possible close button selectors
    const closeButtons = [
      '.close-button',
      '.close',
      '.modal button',
      '.popup button',
      '.alert button',
      'button[aria-label="Close"]',
      '.modal-close',
      '.dialog-close'
    ];
    
    for (const selector of closeButtons) {
      try {
        const closeButton = await page.$(selector);
        if (closeButton) {
          console.log(`Found close button with selector: ${selector}`);
          await page.evaluate((sel: string) => {
            const button = document.querySelector(sel) as HTMLElement;
            if (button) button.click();
          }, selector);
          console.log('Clicked close button on popup');
          await page.waitForTimeout(1000);
          break;
        }
      } catch (error: any) {
        console.log(`Error with close button selector ${selector}: ${error?.message || 'Unknown error'}`);
      }
    }
  } catch (error: any) {
    console.log(`Error handling popup: ${error?.message || 'Unknown error'}`);
    console.log('Continuing anyway...');
  }
}

/**
 * Main function to run the cookie authentication process
 */
async function main(): Promise<void> {
  console.log('==================================================');
  console.log('CITYLINE COOKIE AUTHENTICATION HELPER');
  console.log('==================================================');
  
  console.log('This tool will help you authenticate with Cityline and save cookies for future use.');
  console.log('Using "Continue with Google" method with the provided credentials.');
  
  console.log('\nThe browser will open in NON-HEADLESS mode so you can see the process.');
  console.log('Once successfully logged in, cookies will be saved automatically.');
  
  const browser = await chromium.launch({
    headless: false,
    slowMo: 100 // Slow down operations to make them more visible and reliable
  });
  
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Navigate to Cityline
    console.log('Navigating to Cityline...');
    await page.goto('https://www.cityline.com/');
    await page.waitForLoadState('networkidle');
    
    // First, try to close the popup if it exists
    console.log('Looking for popup close button...');
    try {
      // Wait for the popup close button with the specific selector
      await page.waitForSelector('button.noBtn.closeBtn', { timeout: 5000 });
      console.log('Found popup close button, clicking it...');
      await page.click('button.noBtn.closeBtn');
      console.log('Clicked popup close button');
      await page.waitForTimeout(1000);
    } catch (error: any) {
      console.log(`No popup found or error closing popup: ${error?.message || 'Unknown error'}`);
      console.log('Continuing anyway...');
    }
    
    // Look for the login link using a more reliable approach
    console.log('Looking for login link...');
    
    // First try to find any visible login elements
    const loginSelectors = [
      'a:has-text("Login")',
      'a[href="javascript:;"]',
      'a.login',
      'button:has-text("Login")',
      '.login-button'
    ];
    
    let loginClicked = false;
    for (const selector of loginSelectors) {
      try {
        // Check if the element is visible before clicking
        const isVisible = await page.isVisible(selector, { timeout: 2000 });
        if (isVisible) {
          console.log(`Found visible login element with selector: ${selector}`);
          
          // Try different click methods
          try {
            // Method 1: Direct click
            await page.click(selector, { timeout: 5000, force: true });
            console.log('Clicked login element using direct click');
            loginClicked = true;
          } catch (clickError: any) {
            console.log(`Direct click failed: ${clickError?.message || 'Unknown error'}`);
            
            // Method 2: JavaScript click
            try {
              await page.evaluate((sel: string) => {
                const elements = document.querySelectorAll(sel);
                if (elements && elements.length > 0) {
                  (elements[0] as HTMLElement).click();
                  return true;
                }
                return false;
              }, selector);
              console.log('Clicked login element using JavaScript click');
              loginClicked = true;
            } catch (jsError: any) {
              console.log(`JavaScript click failed: ${jsError?.message || 'Unknown error'}`);
            }
          }
          
          if (loginClicked) break;
        }
      } catch (error: any) {
        console.log(`Error with login selector ${selector}: ${error?.message || 'Unknown error'}`);
      }
    }
    
    if (!loginClicked) {
      console.log('Could not click login link automatically.');
      console.log('Please click the login link manually in the browser window.');
      console.log('Press Enter in this terminal after clicking it...');
      
      await new Promise<void>(resolve => {
        process.stdin.once('data', () => {
          resolve();
        });
      });
      
      console.log('Continuing after manual login click...');
    }
    
    // Wait for login options to appear
    await page.waitForTimeout(2000);
    
    // Look for the 'Continue with Google' button with improved detection
    console.log('Looking for "Continue with Google" button...');
    
    // Wait a bit for the login page to fully load
    await page.waitForTimeout(3000);
    
    // Take a screenshot to help with debugging
    await page.screenshot({ path: 'login-page.png' });
    console.log('Saved screenshot of login page to login-page.png');
    
    // More specific selectors for Google login, avoiding Google Play images
    const googleButtonSelectors = [
      // Text-based selectors - most specific first
      'button:has-text("Continue with Google")',
      'a:has-text("Continue with Google")',
      'button:has-text("Sign in with Google")',
      'a:has-text("Sign in with Google")',
      // Login-specific text selectors
      'button:has-text("Login with Google")',
      'a:has-text("Login with Google")',
      // Specific login button selectors
      '.login-with-google-btn',
      '.google-login-button',
      '.google-btn',
      'button.google',
      'a.google',
      // Social login containers
      '.social-login button:has-text("Google")',
      '.login-options button:has-text("Google")',
      '.login-methods button:has-text("Google")',
      '.login-providers a:has-text("Google")',
      // Specific Google login images (avoiding Google Play)
      'img[alt="Sign in with Google"]',
      'img[alt="Continue with Google"]',
      'img[alt="Login with Google"]'
    ];
    
    // Explicitly exclude Google Play elements
    const excludeGooglePlaySelectors = [
      'img[alt*="Google Play"]',
      'a[href*="play.google.com"]',
      '.app-store-badge'
    ];
    
    // First, find all login elements on the page
    console.log('Analyzing login options on the page...');
    
    // Get all links and buttons on the page for analysis
    const pageLinks = await page.$$('a, button');
    console.log(`Found ${pageLinks.length} total clickable elements on page`);
    
    // Look for specific Google login text
    const googleLoginTexts = ['continue with google', 'sign in with google', 'login with google'];
    console.log('Looking for elements containing Google login text...');
    
    // Find elements with Google login text
    const googleLoginElements = [];
    for (const element of pageLinks) {
      try {
        const text = await element.textContent();
        if (text) {
          const lowerText = text.toLowerCase().trim();
          for (const loginText of googleLoginTexts) {
            if (lowerText.includes(loginText)) {
              googleLoginElements.push(element);
              console.log(`Found element with text: ${text.trim()}`);
              break;
            }
          }
        }
      } catch (error: any) {
        // Ignore errors
      }
    }
    
    // Try to click on any found Google login elements first
    let googleButtonClicked = false;
    if (googleLoginElements.length > 0) {
      console.log(`Found ${googleLoginElements.length} elements with Google login text`);
      for (const element of googleLoginElements) {
        if (googleButtonClicked) break;
        
        try {
          const isVisible = await element.isVisible().catch(() => false);
          if (isVisible) {
            console.log('Found visible Google login element with matching text');
            await element.click({ timeout: 5000, force: true }).catch(async () => {
              // Try JavaScript click if direct click fails
              await page.evaluate((el) => {
                (el as HTMLElement).click();
              }, element).catch(() => {});
            });
            console.log('Clicked Google login element');
            googleButtonClicked = true;
          }
        } catch (error: any) {
          console.log(`Error clicking Google login element: ${error?.message || 'Unknown error'}`);
        }
      }
    }
    
    // If no text-based elements were found/clicked, try selectors
    if (!googleButtonClicked) {
      console.log('Trying specific Google login selectors...');
      
      // Filter out Google Play elements first
      for (const excludeSelector of excludeGooglePlaySelectors) {
        try {
          const playElements = await page.$$(excludeSelector);
          if (playElements.length > 0) {
            console.log(`Found ${playElements.length} Google Play elements to exclude with selector: ${excludeSelector}`);
          }
        } catch (error: any) {
          // Ignore errors
        }
      }
      
      // Now try our specific Google login selectors
      for (const selector of googleButtonSelectors) {
        if (googleButtonClicked) break;
        
        try {
          // Check if the element exists and is visible
          const elements = await page.$$(selector);
          if (elements.length > 0) {
            console.log(`Found ${elements.length} potential Google login elements with selector: ${selector}`);
            
            // Check each element to make sure it's not a Google Play element
            for (const element of elements) {
              if (googleButtonClicked) break;
              
              try {
                // Check if this is a Google Play element
                let isGooglePlay = false;
                const elementHtml = await page.evaluate(el => el.outerHTML, element).catch(() => '');
                if (elementHtml.toLowerCase().includes('google play')) {
                  console.log('Skipping Google Play element');
                  isGooglePlay = true;
                }
                
                if (!isGooglePlay) {
                  const isVisible = await element.isVisible().catch(() => false);
                  if (isVisible) {
                    console.log(`Found visible Google login button with selector: ${selector}`);
                    
                    // Try clicking
                    try {
                      await element.click({ timeout: 5000, force: true });
                      console.log('Clicked Google button using direct click');
                      googleButtonClicked = true;
                    } catch (clickError: any) {
                      console.log(`Direct click failed: ${clickError?.message || 'Unknown error'}`);
                      
                      // Try JavaScript click
                      try {
                        await page.evaluate(el => {
                          (el as HTMLElement).click();
                        }, element);
                        console.log('Clicked Google button using JavaScript click');
                        googleButtonClicked = true;
                      } catch (jsError: any) {
                        console.log(`JavaScript click error: ${jsError?.message || 'Unknown error'}`);
                      }
                    }
                  }
                }
              } catch (error: any) {
                // Continue to next element
              }
            }
          }
        } catch (error: any) {
          // Continue to next selector
        }
      }
    }
    
    if (!googleButtonClicked) {
      console.log('Could not find or click "Continue with Google" button automatically.');
      console.log('Please click the "Continue with Google" button manually in the browser.');
      console.log('Press Enter in this terminal after clicking it or if you need to proceed...');
      
      await new Promise<void>(resolve => {
        process.stdin.once('data', () => {
          resolve();
        });
      });
      
      console.log('Continuing after manual Google button click...');
    } else {
      // Wait for Google login page to load if button was clicked
      await page.waitForTimeout(3000);
    }
    
    // Handle Google login with improved reliability
    console.log('Handling Google login...');
    try {
      // Take a screenshot to help with debugging
      await page.screenshot({ path: 'google-login-page.png' });
      console.log('Saved screenshot of Google login page to google-login-page.png');
      
      // Try multiple selectors for email input field
      const emailSelectors = [
        'input[type="email"][autocomplete="username"]',
        'input[type="email"]',
        'input#identifierId',
        'input[name="identifier"]'
      ];
      
      let emailInputFound = false;
      for (const selector of emailSelectors) {
        try {
          const emailInput = await page.$(selector);
          if (emailInput) {
            console.log(`Found Google email input field with selector: ${selector}`);
            emailInputFound = true;
            
            // Clear and enter the Google email
            await page.fill(selector, '');
            await page.fill(selector, 'likith.misb21@gmail.com');
            console.log('Entered Google email: likith.misb21@gmail.com');
            
            // Try multiple selectors for Next button
            const nextButtonSelectors = [
              'button:has-text("Next")',
              '#identifierNext',
              'button[jsname="LgbsSe"]',
              'div[role="button"]:has-text("Next")'
            ];
            
            let nextButtonClicked = false;
            for (const nextSelector of nextButtonSelectors) {
              try {
                const nextButton = await page.$(nextSelector);
                if (nextButton) {
                  console.log(`Found Next button with selector: ${nextSelector}`);
                  await nextButton.click({ timeout: 5000 });
                  console.log('Clicked Next button');
                  nextButtonClicked = true;
                  break;
                }
              } catch (error: any) {
                console.log(`Error clicking Next button with selector ${nextSelector}: ${error?.message || 'Unknown error'}`);
              }
            }
            
            if (!nextButtonClicked) {
              // Try JavaScript click as fallback
              try {
                await page.evaluate(() => {
                  const buttons = Array.from(document.querySelectorAll('button'));
                  const nextButton = buttons.find(button => 
                    button.textContent?.includes('Next') || 
                    button.id?.includes('Next') || 
                    button.id?.includes('next')
                  );
                  if (nextButton) (nextButton as HTMLElement).click();
                });
                console.log('Attempted JavaScript click on Next button');
                nextButtonClicked = true;
              } catch (error: any) {
                console.log(`JavaScript click error: ${error?.message || 'Unknown error'}`);
              }
            }
            
            if (!nextButtonClicked) {
              console.log('Could not click Next button. Please click it manually.');
              await new Promise<void>(resolve => {
                process.stdin.once('data', () => resolve());
              });
            }
            
            break;
          }
        } catch (error: any) {
          console.log(`Error with email selector ${selector}: ${error?.message || 'Unknown error'}`);
        }
      }
      
      if (!emailInputFound) {
        console.log('Could not find Google email input field. Please enter your email manually.');
        console.log('Press Enter after entering your email and clicking Next...');
        await new Promise<void>(resolve => {
          process.stdin.once('data', () => resolve());
        });
      }
      
      // Wait for password field to appear
      await page.waitForTimeout(3000);
      
      // Take another screenshot
      await page.screenshot({ path: 'google-password-page.png' });
      console.log('Saved screenshot of password page to google-password-page.png');
      
      // Try multiple selectors for password input
      const passwordSelectors = [
        'input[type="password"]',
        'input[name="password"]',
        'input[aria-label="Enter your password"]'
      ];
      
      let passwordInputFound = false;
      for (const selector of passwordSelectors) {
        try {
          const passwordInput = await page.$(selector);
          if (passwordInput) {
            console.log(`Found password input field with selector: ${selector}`);
            passwordInputFound = true;
            
            // Clear and enter password
            await page.fill(selector, '');
            await page.fill(selector, 'Likith2005!!');
            console.log('Entered Google password');
            
            // Try multiple selectors for Sign in button
            const signInButtonSelectors = [
              'button:has-text("Sign in")',
              'button:has-text("Next")',
              '#passwordNext',
              'button[jsname="LgbsSe"]',
              'div[role="button"]:has-text("Sign in")'
            ];
            
            let signInButtonClicked = false;
            for (const signInSelector of signInButtonSelectors) {
              try {
                const signInButton = await page.$(signInSelector);
                if (signInButton) {
                  console.log(`Found Sign in button with selector: ${signInSelector}`);
                  await signInButton.click({ timeout: 5000 });
                  console.log('Clicked Sign in button');
                  signInButtonClicked = true;
                  break;
                }
              } catch (error) {
                console.log(`Error clicking Sign in button with selector ${signInSelector}: ${error.message}`);
              }
            }
            
            if (!signInButtonClicked) {
              // Try JavaScript click as fallback
              try {
                await page.evaluate(() => {
                  const buttons = Array.from(document.querySelectorAll('button'));
                  const signInButton = buttons.find(button => 
                    button.textContent?.includes('Sign in') || 
                    button.textContent?.includes('Next') || 
                    button.id?.includes('Next') || 
                    button.id?.includes('next')
                  );
                  if (signInButton) (signInButton as HTMLElement).click();
                });
                console.log('Attempted JavaScript click on Sign in button');
              } catch (error: any) {
                console.log(`JavaScript click error: ${error?.message || 'Unknown error'}`);
              }
            }
            
            break;
          }
        } catch (error: any) {
          console.log(`Error with password selector ${selector}: ${error?.message || 'Unknown error'}`);
        }
      }
      
      if (!passwordInputFound) {
        console.log('Could not find password input field. Please enter your password manually.');
        console.log('Press Enter after entering your password and clicking Sign in...');
        await new Promise<void>(resolve => {
          process.stdin.once('data', () => resolve());
        });
      }
    } catch (error: any) {
      console.log(`Error during Google login: ${error?.message || 'Unknown error'}`);
    }
      
    // Wait for successful login
    console.log('Waiting for login process to complete...');
    console.log('This may take a moment as Google authentication completes');
    
    // Wait for a reasonable time for the login to complete
    await page.waitForTimeout(5000);
    
    // Check if we're back on Cityline with a logged-in state
    console.log('Checking if login was successful...');
    
    // Wait for the page to stabilize
    await page.waitForLoadState('networkidle');
    
    // Check for elements that would indicate successful login
    const loggedInIndicators = [
      // Look for user profile elements
      '.user-profile',
      '.account-info',
      '.logged-in',
      '.user-menu',
      // Look for logout button
      'a:has-text("Logout")',
      'button:has-text("Logout")',
      'a:has-text("Sign Out")',
      // Look for welcome message
      'text=Welcome',
      'text=Hello',
      '.welcome-message'
    ];
    
    let isLoggedIn = false;
    for (const selector of loggedInIndicators) {
      try {
        const indicator = await page.$(selector);
        if (indicator) {
          console.log(`Found logged-in indicator with selector: ${selector}`);
          isLoggedIn = true;
          break;
        }
      } catch (error: any) {
        // Ignore errors when checking for indicators
      }
    }
    
    if (isLoggedIn) {
      console.log('Login successful! User appears to be logged in.');
    } else {
      console.log('Could not automatically confirm login status.');
      console.log('Please check if you are logged in to Cityline in the browser.');
    }
    
    // Ask user to confirm login status
    console.log('\nPlease confirm if you are successfully logged in to Cityline.');
    console.log('Press Enter in this terminal after confirming login status...');
    
    await new Promise<void>(resolve => {
      process.stdin.once('data', () => {
        resolve();
      });
    });
    
    // Save cookies regardless of detected login status
    // The user confirmation will ensure we're saving valid cookies
    await saveCitylineCookies(page);
    
    console.log('\nLogin process completed. Cookies have been saved.');
    console.log('You can now use these cookies for automated scraping.');
    
  } catch (error) {
    console.error('Error during authentication process:', error);
  } finally {
    console.log('\nPress any key in this terminal to close the browser and exit...');
    
    // Keep browser open until user presses a key
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', async () => {
      await browser.close();
      process.exit(0);
    });
  }
}

// Run the main function
main();
