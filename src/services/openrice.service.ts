import logger from '@/utils/logger';
import {LLMService} from '@/services/llm.service';
import { NameAddress } from '@/types/nameaddress.model';
import { chromium } from 'playwright';
import { OpenRiceRestaurant } from '@/types/openrice.model';

export class OpenRiceService {

  async scrapeOpenRiceHongKongRestaurants(): Promise<OpenRiceRestaurant[]> {
    const startTime = Date.now();
    logger.info('Starting sequential OpenRice Hong Kong restaurants scraping job.');

    const urlsToScrape = [
        'https://www.openrice.com/en/hongkong/restaurants/type/bar?sortBy=ORScoreDesc'
    ];
    

    const allRestoUrls: string[] = [];
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    });

    try {
        for (const url of urlsToScrape) {
            logger.info(`Scraping URL list: ${url}`);
            const page = await context.newPage();
            try {
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });

                // Scroll to the bottom of the page to ensure all dynamic content is loaded
                let previousHeight;
                while (true) {
                    const currentHeight = await page.evaluate('document.body.scrollHeight');
                    if (currentHeight === previousHeight) {
                        break;
                    }
                    previousHeight = currentHeight;
                    await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
                    await page.waitForTimeout(4000);

                    // break; // DEBUG: Remove this line if you want to scroll until the end
                }

                const restaurantUrlLocators = await page.locator('a.poi-list-cell-desktop-right-link-overlay').all();
                logger.info(`Found ${restaurantUrlLocators.length} resto urls for ${url}.`);

                for (const locator of restaurantUrlLocators) {
                    const restaurantUrl = await locator.getAttribute('href');
                    if (restaurantUrl) {
                        const fullUrl = "https://www.openrice.com" + restaurantUrl;
                        if (!allRestoUrls.includes(fullUrl)) {
                            allRestoUrls.push(fullUrl);
                        }
                    }
                }
            } catch (error: any) {
                logger.error(`Error scraping URL list ${url}`, { error: error.message });
            } finally {
                await page.close();
            }
        }

        logger.info(`Found a total of ${allRestoUrls.length} unique restaurant URLs to scrape.`);

        const allRestaurants: OpenRiceRestaurant[] = [];
        for (const restaurantUrl of allRestoUrls) {
            logger.info(`Scraping restaurant details from: ${restaurantUrl}`);
            const page = await context.newPage();
            try {
                await page.goto(restaurantUrl, { waitUntil: 'domcontentloaded', timeout: 90000 });

                const restaurant: OpenRiceRestaurant = {
                    url: restaurantUrl,
                    name: await page.locator('span.name').innerText(),
                    address: await page.locator('a[data-href="#map"]').innerText(),
                };

                const shortTimeout = { timeout: 2000 };

                // Optional fields
                restaurant.secondaryName = await page.locator('div.smaller-font-name').innerText(shortTimeout).catch(() => undefined);
                restaurant.neighbourhood = await page.locator('div.header-poi-district > a').innerText(shortTimeout).catch(() => undefined);
                restaurant.pricePoint = await page.locator('div.header-poi-price > a').innerText(shortTimeout).catch(() => undefined);
                restaurant.saved = await page.locator('div.header-bookmark-count').innerText(shortTimeout).catch(() => undefined);
                const ratingStr = await page.locator('div.header-score').innerText(shortTimeout).catch(() => undefined);
                restaurant.rating = ratingStr ? parseFloat(ratingStr) : undefined;
                restaurant.ratedHappy = parseInt(await page.locator('div.header-smile-section > div:nth-child(2)').innerText(shortTimeout).catch(() => '0'));
                restaurant.ratedOk = parseInt(await page.locator('div.header-smile-section > div:nth-child(4)').innerText(shortTimeout).catch(() => '0'));
                restaurant.ratedUnhappy = parseInt(await page.locator('div.header-smile-section > div:nth-child(6)').innerText(shortTimeout).catch(() => '0'));
                restaurant.navigation = await page.locator('section.transport-section > div').innerText(shortTimeout).catch(() => undefined);
                restaurant.telephone = await page.locator('section.telephone-section > div.content').innerText(shortTimeout).catch(() => undefined);
                
                
                restaurant.introduction = await page.evaluate(() => {
                    let introEl = document.querySelector('section.introduction-section > div.content');
                    if (introEl) {
                        return (introEl as HTMLElement).innerText;
                    }

                    const cropDescEl = document.querySelector('div.crop-desc');
                    if (cropDescEl) {
                        const clone = cropDescEl.cloneNode(true) as HTMLElement;
                        clone.querySelectorAll('br').forEach(br => br.replaceWith(' '));
                        return clone.innerText.trim();
                    }

                    return undefined;
                }).catch(() => undefined);


                // Scrape photoUrls
                restaurant.photoUrls = await page.evaluate(() => {
                    const urls = new Set<string>();
                    const urlRegex = /url\("?(.+?)"?\)/;

                    // From popular dishes
                    document.querySelectorAll('div.popular-dish-list-with-cover > ul > li.caption-container > a > div.photo').forEach(el => {
                        const style = (el as HTMLElement).style.backgroundImage;
                        const match = style.match(urlRegex);
                        if (match && match[1]) urls.add(match[1]);
                    });

                    // From restaurant photos
                    document.querySelectorAll('div.restaurant-photo').forEach(el => {
                        const style = (el as HTMLElement).style.backgroundImage;
                        const match = style.match(urlRegex);
                        if (match && match[1]) urls.add(match[1]);
                    });

                    return Array.from(urls);
                }).catch(() => []);

                // Scrape openingHours
                restaurant.openingHours = await page.evaluate(() => {
                    const hours: Record<string, string> = {};
                    document.querySelectorAll('div.opening-hours-section div.opening-hours-list div.opening-hours-day').forEach(row => {
                        const dateEl = row.querySelector('div.opening-hours-date');
                        const timeEl = row.querySelector('div.opening-hours-time');
                        if (dateEl && timeEl && dateEl.textContent && !dateEl.textContent.includes('Today')) {
                            hours[dateEl.textContent.trim()] = timeEl.textContent?.trim() || '';
                        }
                    });
                    return Object.keys(hours).length > 0 ? hours : undefined;
                }).catch(() => undefined);

                // Scrape otherInfo
                restaurant.otherInfo = await page.evaluate(() => {
                    const info: Record<string, boolean> = {};
                    document.querySelectorAll('div.condition-item').forEach(item => {
                        const nameEl = item.querySelector('span.condition-name');
                        const iconEl = item.querySelector('span:first-child');
                        if (nameEl && nameEl.textContent && iconEl) {
                            const hasTick = iconEl.classList.contains('d_sr2_lhs_tick_desktop');
                            info[nameEl.textContent.trim()] = hasTick;
                        }
                    });
                    return Object.keys(info).length > 0 ? info : undefined;
                }).catch(() => undefined);

                // const paymentMethodsLocator = page.locator('div.comma-tags span');
                // restaurant.paymentMethods = await paymentMethodsLocator.first().waitFor(shortTimeout).then(() => paymentMethodsLocator.allInnerTexts()).catch(() => []);

                restaurant.paymentMethods = await page.evaluate(() => {
                    const paymentElements = document.querySelectorAll('div.comma-tags span');
                    return Array.from(paymentElements).map(el => (el as HTMLElement).innerText);
                }).catch(() => []);

                const recommendedDishesLocator = page.locator('ul.popular-dish-list-with-cover > li.caption-container > a > div.caption');
                restaurant.recommendedDishes = await recommendedDishesLocator.first().waitFor(shortTimeout).then(() => recommendedDishesLocator.allInnerTexts()).catch(() => []);

                const categoriesLocator = page.locator('div.header-poi-categories a');
                restaurant.openriceCategories = await categoriesLocator.first().waitFor(shortTimeout).then(() => categoriesLocator.allInnerTexts()).catch(() => []);

                allRestaurants.push(restaurant);
                logger.info(`Successfully scraped: ${restaurant.name}`);
                // logger.info(`Restaurant info: ${JSON.stringify(restaurant, null, 2)}`);


                // break; // DEBUG: Remove this line if you want to scrape all restaurants
            } catch (error: any) {
                logger.error(`Error scraping restaurant details from ${restaurantUrl}`, { error: error.message });
            } finally {
                await page.close();
            }
        }

        logger.info(`Successfully scraped ${allRestaurants.length} unique restaurant details from ${urlsToScrape.length} list pages.`, {
            durationMs: Date.now() - startTime,
        });

        return allRestaurants;

    } catch (error: any) {
        logger.error(`An unexpected error occurred during scraping.`, { error: error.message });
        return [];
    } finally {
        await browser.close();
    }
  }
}

export default new OpenRiceService();