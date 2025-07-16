"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const playwright_1 = require("playwright");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const readline_1 = __importDefault(require("readline"));
// Load environment variables
dotenv_1.default.config();
/**
 * Save Cityline cookies and storage state for future use
 */
async function saveCitylineCookies(page) {
    try {
        // Create storage directory if it doesn't exist
        const storageDir = path_1.default.join(__dirname, '../storage');
        if (!fs_1.default.existsSync(storageDir)) {
            fs_1.default.mkdirSync(storageDir, { recursive: true });
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
        const citylineCookies = cookies.filter(cookie => cookie.domain.includes('cityline.com') ||
            cookie.domain.includes('cityline') ||
            cookie.domain === '');
        if (citylineCookies.length === 0) {
            console.warn('Warning: No cookies found for cityline.com domain!');
        }
        else {
            console.log(`Found ${citylineCookies.length} cookies for cityline.com domain`);
        }
        const cookiesPath = path_1.default.join(storageDir, 'cityline_cookies.json');
        fs_1.default.writeFileSync(cookiesPath, JSON.stringify(cookies, null, 2));
        console.log(`Cookies saved to ${cookiesPath}`);
        // Save storage state with more detailed information
        const storageState = await page.context().storageState();
        // Log storage state information for debugging
        console.log(`Storage state contains ${storageState.origins.length} origins`);
        storageState.origins.forEach((origin, index) => {
            console.log(`Origin ${index + 1}: ${origin.origin}`);
            console.log(`  - Local Storage: ${origin.localStorage.length} items`);
            // Session storage might not be available for all origins
            const sessionStorageItems = origin.sessionStorage || [];
            console.log(`  - Session Storage: ${sessionStorageItems.length || 0} items`);
        });
        const storagePath = path_1.default.join(storageDir, 'cityline_storage.json');
        fs_1.default.writeFileSync(storagePath, JSON.stringify(storageState, null, 2));
        console.log(`Storage state saved to ${storagePath}`);
        // Create a combined authentication file for easier loading
        const combinedAuthData = {
            cookies,
            storageState,
            timestamp: new Date().toISOString()
        };
        const combinedPath = path_1.default.join(storageDir, 'cityline_auth.json');
        fs_1.default.writeFileSync(combinedPath, JSON.stringify(combinedAuthData, null, 2));
        console.log(`Combined auth data saved to ${combinedPath}`);
        console.log('\nAuthentication data saved successfully!');
        console.log('You can now run the scraper with:');
        console.log('npx ts-node src/scrape-cityline.ts');
    }
    catch (error) {
        console.error(`Error saving cookies: ${error?.message || 'Unknown error'}`);
    }
}
/**
 * Handle the error popup that appears when first entering the page
 */
async function handleErrorPopup(page) {
    try {
        console.log('Checking for error popup...');
        const closeButtons = [
            'button.noBtn.closeBtn',
            'button[data-v-559833cb].noBtn.closeBtn',
            'button.noBtn',
            'button:has-text("X")',
            'button:has-text("Close")',
            'button.close',
            '.modal button',
            '.popup button'
        ];
        for (const selector of closeButtons) {
            try {
                const closeButton = await page.$(selector);
                if (closeButton) {
                    console.log(`Found close button with selector: ${selector}`);
                    await page.evaluate((sel) => {
                        const button = document.querySelector(sel);
                        if (button)
                            button.click();
                    }, selector);
                    console.log('Clicked close button on popup');
                    await page.waitForTimeout(1000);
                    break;
                }
            }
            catch (error) {
                console.log(`Error with close button selector ${selector}: ${error?.message || 'Unknown error'}`);
            }
        }
    }
    catch (error) {
        console.log(`Error handling popup: ${error?.message || 'Unknown error'}`);
        console.log('Continuing anyway...');
    }
}
/**
 * Main function to run the cookie authentication process
 */
async function main() {
    console.log('==================================================');
    console.log('CITYLINE COOKIE AUTHENTICATION HELPER');
    console.log('==================================================');
    console.log('This tool will help you authenticate with Cityline and save cookies for future use.');
    console.log('You will need to:');
    console.log('1. Enter your email address');
    console.log('2. Check your email for an OTP code');
    console.log('3. Enter the OTP code in the browser window that opens');
    console.log('\nThe browser will open in NON-HEADLESS mode so you can interact with it.');
    console.log('Once you successfully log in, cookies will be saved automatically.');
    const browser = await playwright_1.chromium.launch({
        headless: false,
        slowMo: 50 // Slow down operations to make them more visible and reliable
    });
    try {
        const context = await browser.newContext();
        const page = await context.newPage();
        // Navigate to Cityline events page
        console.log('Opening Cityline events page...');
        await page.goto('https://www.cityline.com/Events.html', {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });
        console.log('Waiting for page to load...');
        await page.waitForTimeout(2000);
        // Handle error popup
        await handleErrorPopup(page);
        // Try to find and click the login button
        console.log('Looking for login button...');
        const loginSelectors = [
            // Specific login button from the user
            'a[data-v-22e129eb][href="javascript:;"]',
            'a[href="javascript:;"]:has-text("Login")',
            // Generic login selectors
            'a:has-text("Login")',
            'a:has-text("Sign In")',
            'button:has-text("Login")',
            'button:has-text("Sign In")'
        ];
        let loginClicked = false;
        for (const selector of loginSelectors) {
            try {
                const loginButton = await page.$(selector);
                if (loginButton) {
                    console.log(`Found login button with selector: ${selector}`);
                    // Click using evaluate to avoid type errors
                    await page.evaluate((sel) => {
                        const button = document.querySelector(sel);
                        if (button)
                            button.click();
                    }, selector);
                    console.log('Clicked login button');
                    loginClicked = true;
                    await page.waitForTimeout(2000);
                    break;
                }
            }
            catch (error) {
                console.log(`Error with login button ${selector}: ${error?.message || 'Unknown error'}`);
            }
        }
        if (!loginClicked) {
            console.log('Could not find login button. You may need to click it manually.');
            console.log('Please look for a "Login" link or button and click it.');
        }
        // Wait for email input field
        console.log('Looking for email input field...');
        const emailSelectors = [
            'input[type="email"]',
            'input[name="email"]',
            'input[placeholder*="email"]',
            'input[placeholder*="Email"]'
        ];
        let emailInput = null;
        let emailSelector = '';
        for (const selector of emailSelectors) {
            try {
                emailInput = await page.$(selector);
                if (emailInput) {
                    emailSelector = selector;
                    console.log(`Found email input field with selector: ${selector}`);
                    break;
                }
            }
            catch (error) {
                console.log(`Error finding email input with selector ${selector}: ${error?.message || 'Unknown error'}`);
            }
        }
        if (emailInput) {
            // Prompt for email
            const rl = readline_1.default.createInterface({
                input: process.stdin,
                output: process.stdout
            });
            const email = await new Promise(resolve => {
                rl.question('Enter your Cityline email: ', (answer) => {
                    resolve(answer);
                });
            });
            // Fill in email directly
            await page.fill(emailSelector, email);
            console.log('Entered email');
            console.log('Entered email');
            // Look for human verification checkbox
            console.log('Looking for human verification checkbox...');
            const checkboxSelectors = [
                'input[type="checkbox"]',
                '.ant-checkbox-input',
                '.verification-checkbox',
                'input[type="checkbox"][data-v-e231bac8]'
            ];
            let checkboxClicked = false;
            for (const selector of checkboxSelectors) {
                try {
                    const checkbox = await page.$(selector);
                    if (checkbox) {
                        console.log(`Found verification checkbox with selector: ${selector}`);
                        // Click the checkbox
                        await checkbox.click();
                        console.log('Clicked verification checkbox');
                        checkboxClicked = true;
                        await page.waitForTimeout(1000);
                        break;
                    }
                }
                catch (error) {
                    console.log(`Error with checkbox selector ${selector}: ${error?.message || 'Unknown error'}`);
                }
            }
            if (!checkboxClicked) {
                console.log('Could not find verification checkbox. You may need to click it manually.');
                console.log('Please check the verification checkbox and then press Enter in this terminal to continue...');
                await new Promise(resolve => {
                    process.stdin.once('data', () => {
                        resolve();
                    });
                });
            }
            // Look for continue button with multiple selectors
            const continueButtonSelectors = [
                'button[type="submit"]',
                'button:has-text("Continue")',
                'button:has-text("Next")',
                'button:has-text("Submit")',
                'input[type="submit"]',
                '.login-btn',
                '.theme-btn',
                '.submit-btn',
                'button.ant-btn'
            ];
            let continueButtonClicked = false;
            for (const selector of continueButtonSelectors) {
                try {
                    const continueButton = await page.$(selector);
                    if (continueButton) {
                        console.log(`Found continue button with selector: ${selector}`);
                        // Check if button is disabled
                        const isDisabled = await page.evaluate(el => {
                            return el.hasAttribute('disabled') || el.classList.contains('disabled') || el.getAttribute('aria-disabled') === 'true';
                        }, continueButton);
                        if (isDisabled) {
                            console.log('Login button is disabled. Make sure the verification checkbox is checked.');
                            console.log('Please check the verification checkbox manually if needed and press Enter to try again...');
                            await new Promise(resolve => {
                                process.stdin.once('data', () => {
                                    resolve();
                                });
                            });
                            // Try clicking again after user confirmation
                            await continueButton.click().catch(() => console.log('Still unable to click button. It may still be disabled.'));
                        }
                        else {
                            // Click directly
                            await continueButton.click().catch(async () => {
                                // Fallback to evaluate if direct click fails
                                await page.evaluate(button => {
                                    button.click();
                                }, continueButton);
                            });
                        }
                        console.log('Clicked continue button');
                        continueButtonClicked = true;
                        await page.waitForTimeout(2000);
                        break;
                    }
                }
                catch (error) {
                    console.log(`Error with continue button selector ${selector}: ${error?.message || 'Unknown error'}`);
                }
            }
            if (!continueButtonClicked) {
                console.log('Could not find continue button. You may need to click it manually.');
                console.log('Please look for a submit button and click it after entering your email.');
            }
            // Wait for OTP input field
            console.log('Waiting for OTP input field...');
            console.log('Please check your email for the OTP code.');
            try {
                const otpSelectors = [
                    'input[type="text"][inputmode="numeric"]',
                    'input[name*="otp"]',
                    'input[name*="code"]',
                    'input[placeholder*="code"]',
                    'input[placeholder*="OTP"]'
                ];
                // Wait for any OTP field to appear
                await Promise.race(otpSelectors.map(selector => page.waitForSelector(selector, { timeout: 10000 }).catch(() => null)));
                // Find which OTP field is available
                let otpInput = null;
                let otpSelector = '';
                for (const selector of otpSelectors) {
                    otpInput = await page.$(selector);
                    if (otpInput) {
                        otpSelector = selector;
                        console.log(`Found OTP input field with selector: ${selector}`);
                        break;
                    }
                }
                if (otpInput) {
                    console.log('Found OTP input field');
                    // Prompt for OTP
                    const otp = await new Promise(resolve => {
                        rl.question('Enter the OTP code from your email: ', (answer) => {
                            resolve(answer);
                            rl.close();
                        });
                    });
                    // Fill in OTP directly
                    await page.fill(otpSelector, otp);
                    console.log('Entered OTP');
                    // Look for verify button with multiple selectors
                    const verifyButtonSelectors = [
                        'button[type="submit"]',
                        'button:has-text("Verify")',
                        'button:has-text("Submit")',
                        'button:has-text("Continue")',
                        'input[type="submit"]'
                    ];
                    let verifyButtonClicked = false;
                    for (const selector of verifyButtonSelectors) {
                        try {
                            const verifyButton = await page.$(selector);
                            if (verifyButton) {
                                console.log(`Found verify button with selector: ${selector}`);
                                // Click using evaluate
                                await page.evaluate((sel) => {
                                    const button = document.querySelector(sel);
                                    if (button)
                                        button.click();
                                }, selector);
                                console.log('Clicked verify button');
                                verifyButtonClicked = true;
                                break;
                            }
                        }
                        catch (error) {
                            console.log(`Error with verify button selector ${selector}: ${error?.message || 'Unknown error'}`);
                        }
                    }
                    if (!verifyButtonClicked) {
                        console.log('Could not find verify button. You may need to click it manually.');
                        console.log('Please look for a submit button and click it after entering the OTP.');
                    }
                    // Wait for successful login
                    console.log('Waiting for successful login...');
                    try {
                        await page.waitForNavigation({ timeout: 30000 });
                        console.log('Successfully logged in!');
                    }
                    catch (error) {
                        console.log(`Navigation timeout: ${error?.message || 'Unknown error'}`);
                        console.log('You may need to manually complete the login process.');
                    }
                    // Wait a bit to ensure we're fully logged in
                    await page.waitForTimeout(5000);
                    // Save cookies and storage state
                    await saveCitylineCookies(page);
                }
                else {
                    console.log('Could not find OTP input field. You may need to complete the login process manually.');
                    console.log('After logging in, press Enter in this terminal to save cookies.');
                    await new Promise(resolve => {
                        process.stdin.once('data', () => {
                            resolve();
                        });
                    });
                    await saveCitylineCookies(page);
                }
            }
            catch (error) {
                console.log(`Error during OTP process: ${error?.message || 'Unknown error'}`);
                console.log('You may need to complete the login process manually.');
                console.log('After logging in, press Enter in this terminal to save cookies.');
                await new Promise(resolve => {
                    process.stdin.once('data', () => {
                        resolve();
                    });
                });
                await saveCitylineCookies(page);
            }
        }
        else {
            console.log('Could not find email input field. You may need to complete the login process manually.');
            console.log('After logging in, press Enter in this terminal to save cookies.');
            await new Promise(resolve => {
                process.stdin.once('data', () => {
                    resolve();
                });
            });
            await saveCitylineCookies(page);
        }
        // Handle error popup that might appear
        try {
            console.log('Checking for error popup...');
            const closeButtons = [
                // Specific button from the user
                'button.noBtn.closeBtn',
                'button[data-v-559833cb].noBtn.closeBtn',
                'button.noBtn',
                'button:has-text("X")',
                // Generic close buttons
                'button:has-text("Close")',
                'button:has-text("close")',
                'button.close',
                '.modal button',
                '.popup button',
                '.alert button',
                'button[aria-label="Close"]',
                '.modal-close',
                '.dialog-close'
            ];
            for (const selector of closeButtons) {
                const closeButton = await page.$(selector);
                if (closeButton) {
                    console.log(`Found close button with selector: ${selector}`);
                    await closeButton.click();
                    console.log('Clicked close button on popup');
                    await page.waitForTimeout(1000);
                    break;
                }
            }
        }
        catch (error) {
            console.log(`Error handling popup: ${error?.message || 'Unknown error'}`);
            console.log('Continuing anyway...');
        }
        // Wait a moment for any animations or redirects
        await page.waitForTimeout(3000);
        // Look for email input field again if needed
        console.log('Looking for email input field again...');
        const secondaryEmailSelectors = [
            'input[type="email"]',
            'input[name="email"]',
            'input[placeholder*="email"]',
            'input[placeholder*="Email"]'
        ];
        let secondaryEmailInput = null;
        for (const selector of secondaryEmailSelectors) {
            try {
                secondaryEmailInput = await page.$(selector);
                if (secondaryEmailInput) {
                    console.log(`Found email input field with selector: ${selector}`);
                    break;
                }
            }
            catch (error) {
                console.log(`Error finding email input with selector ${selector}: ${error?.message || 'Unknown error'}`);
            }
        }
        if (secondaryEmailInput) {
            console.log('Found email input field');
            // Prompt for email
            const rl = readline_1.default.createInterface({
                input: process.stdin,
                output: process.stdout
            });
            const email = await new Promise(resolve => {
                rl.question('Enter your Cityline email: ', (answer) => {
                    resolve(answer);
                });
            });
            // Fill in email using evaluate to avoid type errors
            await page.evaluate(`document.body.insertAdjacentHTML('beforeend', '<div id="secondary-email-value" style="display:none;">${email}</div>');`);
            await page.evaluate(function (selector) {
                const element = document.querySelector(selector);
                const valueElement = document.getElementById('secondary-email-value');
                if (element && valueElement)
                    element.value = valueElement.textContent || '';
            }, secondaryEmailSelectors[0]);
            console.log('Entered email');
            // Look for human verification checkbox
            console.log('Looking for human verification checkbox...');
            const checkboxSelectors = [
                'input[type="checkbox"]',
                '.ant-checkbox-input',
                '.verification-checkbox',
                'input[type="checkbox"][data-v-e231bac8]'
            ];
            let checkboxClicked = false;
            for (const selector of checkboxSelectors) {
                try {
                    const checkbox = await page.$(selector);
                    if (checkbox) {
                        console.log(`Found verification checkbox with selector: ${selector}`);
                        // Click the checkbox
                        await checkbox.click();
                        console.log('Clicked verification checkbox');
                        checkboxClicked = true;
                        await page.waitForTimeout(1000);
                        break;
                    }
                }
                catch (error) {
                    console.log(`Error with checkbox selector ${selector}: ${error?.message || 'Unknown error'}`);
                }
            }
            if (!checkboxClicked) {
                console.log('Could not find verification checkbox. You may need to click it manually.');
                console.log('Please check the verification checkbox and then press Enter in this terminal to continue...');
                await new Promise(resolve => {
                    process.stdin.once('data', () => {
                        resolve();
                    });
                });
            }
            // Look for continue button with multiple selectors
            const continueButtonSelectors = [
                'button[type="submit"]',
                'button:has-text("Continue")',
                'button:has-text("Next")',
                'button:has-text("Submit")',
                'input[type="submit"]',
                '.login-btn',
                '.theme-btn',
                '.submit-btn',
                'button.ant-btn'
            ];
            let continueButtonFound = false;
            for (const selector of continueButtonSelectors) {
                try {
                    const submitButton = await page.$(selector);
                    if (submitButton) {
                        // Check if button is disabled
                        const isDisabled = await page.evaluate(el => {
                            return el.hasAttribute('disabled') || el.classList.contains('disabled') || el.getAttribute('aria-disabled') === 'true';
                        }, submitButton);
                        if (isDisabled) {
                            console.log('Login button is disabled. Make sure the verification checkbox is checked.');
                            console.log('Please check the verification checkbox manually if needed and press Enter to try again...');
                            await new Promise(resolve => {
                                process.stdin.once('data', () => {
                                    resolve();
                                });
                            });
                            // Try clicking again after user confirmation
                            await submitButton.click().catch(() => console.log('Still unable to click button. It may still be disabled.'));
                        }
                        else {
                            await submitButton.click();
                            console.log('Submitted email');
                            console.log('\n==================================================');
                            console.log('IMPORTANT: CHECK YOUR EMAIL FOR OTP CODE');
                            console.log('==================================================');
                            console.log('Enter the OTP code in the browser window when prompted');
                            console.log('The script will wait for you to complete the login process');
                            // Wait for user to complete login (look for a sign of successful login)
                            console.log('\nWaiting for you to complete the login process...');
                            console.log('(This could take a few minutes)');
                            // Wait for navigation to a page that indicates successful login
                            // This could be the events page or a user dashboard
                            try {
                                await page.waitForNavigation({ timeout: 120000 }); // 2 minute timeout
                                // Check if we're on a page that indicates successful login
                                const url = page.url();
                                if (!url.includes('login') && !url.includes('signin')) {
                                    console.log('\nLogin appears to be successful!');
                                    // Save cookies and storage state
                                    await saveCitylineCookies(page);
                                    continueButtonFound = true;
                                    break;
                                }
                                else {
                                    console.log('\nLogin process did not complete successfully.');
                                    console.log('Please try again or check your credentials.');
                                }
                            }
                            catch (error) {
                                console.log('\nTimeout waiting for login to complete.');
                                console.log('If you completed the login process, check if cookies were saved:');
                                console.log(path_1.default.join(__dirname, '../storage/cityline_cookies.json'));
                            }
                        }
                    }
                }
                catch (error) {
                    console.log(`Error with continue button selector ${selector}: ${error?.message || 'Unknown error'}`);
                }
            }
        }
        else {
            console.log('Could not find email input field. You may need to complete the login process manually.');
            console.log('After logging in, press Enter in this terminal to save cookies.');
            await new Promise(resolve => {
                process.stdin.once('data', () => {
                    resolve();
                });
            });
            await saveCitylineCookies(page);
        }
    }
    catch (error) {
        console.error('Error during authentication process:', error);
    }
    finally {
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
//# sourceMappingURL=cookie-auth.js.map