import { chromium, Browser, Page, BrowserContext } from 'playwright';
import * as cheerio from 'cheerio';
import axios from 'axios';
import { config } from '@/config';
import logger from '@/utils/logger';

export interface ScrapingOptions {
  waitForSelector?: string;
  timeout?: number;
  userAgent?: string;
  viewport?: { width: number; height: number };
}

export interface ScrapedPage {
  url: string;
  title: string;
  content: string;
  html: string;
  $: cheerio.CheerioAPI;
}

export class ScraperService {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;

  async initBrowser(): Promise<void> {
    if (!this.browser) {
      logger.debug('Initializing browser');
      this.browser = await chromium.launch({
        headless: config.browser.headless,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      this.context = await this.browser.newContext({
        userAgent: config.scraping.userAgent,
        viewport: { width: 1920, height: 1080 }
      });
    }
  }

  async closeBrowser(): Promise<void> {
    if (this.browser) {
      logger.debug('Closing browser');
      await this.browser.close();
      this.browser = null;
      this.context = null;
    }
  }

  async scrapePage(url: string, options: ScrapingOptions = {}): Promise<ScrapedPage> {
    await this.initBrowser();
    
    if (!this.context) {
      throw new Error('Browser context not initialized');
    }

    const page = await this.context.newPage();
    
    try {
      logger.debug(`Scraping page: ${url}`);
      
      await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: options.timeout || config.browser.timeout
      });

      if (options.waitForSelector) {
        await page.waitForSelector(options.waitForSelector, { 
          timeout: options.timeout || config.browser.timeout 
        });
      }

      const title = await page.title();
      const html = await page.content();
      const $ = cheerio.load(html);
      
      // Extract text content
      const content = $('body').text().replace(/\s+/g, ' ').trim();

      logger.debug(`Successfully scraped page: ${url}`, { 
        titleLength: title.length, 
        contentLength: content.length 
      });

      return {
        url,
        title,
        content,
        html,
        $
      };
    } catch (error: any) {
      logger.error(`Error scraping page: ${url}`, { error: error.message });
      throw error;
    } finally {
      await page.close();
    }
  }

  async scrapeMultiplePages(urls: string[], options: ScrapingOptions = {}): Promise<ScrapedPage[]> {
    const results: ScrapedPage[] = [];
    const semaphore = new Array(config.scraping.maxConcurrentRequests).fill(null);
    
    const scrapeWithSemaphore = async (url: string): Promise<ScrapedPage | null> => {
      try {
        return await this.scrapePage(url, options);
      } catch (error) {
        logger.warn(`Failed to scrape ${url}, skipping`);
        return null;
      }
    };

    const chunks = [];
    for (let i = 0; i < urls.length; i += semaphore.length) {
      chunks.push(urls.slice(i, i + semaphore.length));
    }

    for (const chunk of chunks) {
      const chunkResults = await Promise.all(
        chunk.map(url => scrapeWithSemaphore(url))
      );
      
      results.push(...chunkResults.filter(result => result !== null) as ScrapedPage[]);
      
      // Small delay between chunks to be respectful
      if (chunks.indexOf(chunk) < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  async scrapeWithAxios(url: string): Promise<{ $: cheerio.CheerioAPI; content: string; title: string }> {
    try {
      logger.debug(`Scraping with Axios: ${url}`);
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': config.scraping.userAgent
        },
        timeout: config.scraping.requestTimeout
      });

      const $ = cheerio.load(response.data);
      const content = $('body').text().replace(/\s+/g, ' ').trim();
      const title = $('title').text() || '';

      return { $, content, title };
    } catch (error: any) {
      logger.error(`Error scraping with Axios: ${url}`, { error: error.message });
      throw error;
    }
  }

  async extractLinks(html: string, selector: string, baseUrl?: string): Promise<Array<{title: string, url: string}>> {
    const $ = cheerio.load(html);
    const links: Array<{title: string, url: string}> = [];

    $(selector).each((_, element) => {
      const $el = $(element);
      const href = $el.attr('href');
      const title = $el.text().trim() || $el.attr('title') || '';

      if (href && title) {
        let fullUrl = href;
        if (baseUrl && href.startsWith('/')) {
          fullUrl = new URL(href, baseUrl).toString();
        }
        
        links.push({ title, url: fullUrl });
      }
    });

    return links;
  }
}

export default new ScraperService();
