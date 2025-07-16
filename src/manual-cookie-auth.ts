import { chromium, Browser, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

// Storage paths
const STORAGE_DIR = path.join(__dirname, '../storage');
const COOKIES_PATH = path.join(STORAGE_DIR, 'cookies.json');
const STORAGE_STATE_PATH = path.join(STORAGE_DIR, 'storage-state.json');
const AUTH_DATA_PATH = path.join(STORAGE_DIR, 'auth-data.json');

// Ensure storage directory exists
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Prompt user for input
 */
async function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

/**
 * Save cookies and storage state to files
 */
async function saveCookiesAndStorage(page: Page): Promise<void> {
  console.log('\nSaving authentication data...');
  
  try {
    // Get cookies
    const cookies = await page.context().cookies();
    fs.writeFileSync(COOKIES_PATH, JSON.stringify(cookies, null, 2));
    console.log(`✅ Cookies saved to ${COOKIES_PATH}`);
    
    // Get storage state (localStorage, sessionStorage)
    const storageState = await page.context().storageState();
    fs.writeFileSync(STORAGE_STATE_PATH, JSON.stringify(storageState, null, 2));
    console.log(`✅ Storage state saved to ${STORAGE_STATE_PATH}`);
    
    // Save combined auth data
    const authData = {
      cookies,
      storageState
    };
    fs.writeFileSync(AUTH_DATA_PATH, JSON.stringify(authData, null, 2));
    console.log(`✅ Combined auth data saved to ${AUTH_DATA_PATH}`);
    
    console.log('\n✅ Authentication data saved successfully!');
  } catch (error) {
    console.error('❌ Error saving authentication data:', error);
  }
}

/**
 * Main function to export cookies manually
 */
async function exportCookies(): Promise<void> {
  console.log('==================================================');
  console.log('CITYLINE MANUAL COOKIE EXPORTER');
  console.log('==================================================');
  console.log('This tool will help you manually export cookies from Cityline.');
  console.log('Follow these steps:');
  console.log('1. The browser will open to Cityline');
  console.log('2. Log in manually with your credentials');
  console.log('3. Once logged in, return to this terminal and confirm');
  console.log('4. Cookies will be saved for future use\n');
  
  // Launch browser
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 50
  });
  
  try {
    // Create a new context
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Navigate to Cityline
    console.log('Navigating to Cityline...');
    await page.goto('https://www.cityline.com/');
    
    // Wait for user to manually log in
    const isLoggedIn = await prompt('\nHave you logged in successfully? (yes/no): ');
    
    if (isLoggedIn.toLowerCase() === 'yes') {
      // Save cookies and storage state
      await saveCookiesAndStorage(page);
    } else {
      console.log('❌ Login not confirmed. No cookies saved.');
    }
  } catch (error: any) {
    console.error('❌ Error during cookie export process:', error?.message || 'Unknown error');
  } finally {
    console.log('\nPress any key in this terminal to close the browser and exit...');
    
    // Keep browser open until user presses a key
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', async () => {
      await browser.close();
      rl.close();
      process.exit(0);
    });
  }
}

/**
 * Test the saved cookies by loading them and checking if still authenticated
 */
async function testCookies(): Promise<void> {
  console.log('==================================================');
  console.log('TESTING SAVED COOKIES');
  console.log('==================================================');
  
  // Check if cookies exist
  if (!fs.existsSync(STORAGE_STATE_PATH)) {
    console.log('❌ No saved cookies found. Please run the export function first.');
    return;
  }
  
  console.log('Loading saved cookies and testing authentication...');
  
  // Launch browser
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 50
  });
  
  try {
    // Create a new context with saved storage state
    const context = await browser.newContext({
      storageState: STORAGE_STATE_PATH
    });
    
    const page = await context.newPage();
    
    // Navigate to Cityline
    console.log('Navigating to Cityline...');
    await page.goto('https://www.cityline.com/');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check if still logged in
    console.log('Checking login status...');
    
    // Take a screenshot
    await page.screenshot({ path: 'cityline-auth-test.png' });
    console.log('✅ Screenshot saved to cityline-auth-test.png');
    
    // Ask user to confirm login status
    const isStillLoggedIn = await prompt('\nAre you still logged in based on the browser? (yes/no): ');
    
    if (isStillLoggedIn.toLowerCase() === 'yes') {
      console.log('✅ Authentication successful! Cookies are valid.');
    } else {
      console.log('❌ Authentication failed. Cookies may have expired.');
      console.log('Please run the export function again to get fresh cookies.');
    }
  } catch (error: any) {
    console.error('❌ Error testing cookies:', error?.message || 'Unknown error');
  } finally {
    console.log('\nPress any key in this terminal to close the browser and exit...');
    
    // Keep browser open until user presses a key
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', async () => {
      await browser.close();
      rl.close();
      process.exit(0);
    });
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  console.log('==================================================');
  console.log('CITYLINE MANUAL COOKIE AUTHENTICATION');
  console.log('==================================================');
  
  const action = await prompt('What would you like to do?\n1. Export cookies (manual login)\n2. Test saved cookies\nEnter choice (1 or 2): ');
  
  if (action === '1') {
    await exportCookies();
  } else if (action === '2') {
    await testCookies();
  } else {
    console.log('Invalid choice. Please enter 1 or 2.');
    rl.close();
    process.exit(1);
  }
}

// Run the main function
main();
