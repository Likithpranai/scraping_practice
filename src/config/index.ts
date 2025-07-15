import dotenv from 'dotenv';

dotenv.config();

export const config = {
  server: {
    port: parseInt(process.env.PORT || '3001', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  api: {
    perplexityApiKey: process.env.PERPLEXITY_API_KEY || '',
  },
  scraping: {
    userAgent: process.env.USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || '30000', 10),
    maxConcurrentRequests: parseInt(process.env.MAX_CONCURRENT_REQUESTS || '5', 10),
  },
  browser: {
    headless: process.env.HEADLESS_BROWSER === 'true',
    timeout: parseInt(process.env.BROWSER_TIMEOUT || '60000', 10),
  },
};

export default config;
