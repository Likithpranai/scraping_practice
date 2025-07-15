import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import scrapeRoutes from './routes/v1/scrape.routes';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import { config } from '@/config';
import logger from '@/utils/logger';
import scraperService from '@/services/scraper.service';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    query: req.query,
    params: req.params,
    userAgent: req.get('User-Agent')
  });
  next();
});

// Routes
app.use('/api/v1/scrape', scrapeRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date(),
    uptime: process.uptime()
  });
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await scraperService.closeBrowser();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await scraperService.closeBrowser();
  process.exit(0);
});

const PORT = config.server.port;

app.listen(PORT, () => {
  logger.info(`Roameo Scraping API server running on port ${PORT}`, {
    nodeEnv: config.server.nodeEnv,
    port: PORT,
    perplexityApiKeyPresent: !!config.api.perplexityApiKey,
    perplexityApiKeyLength: config.api.perplexityApiKey?.length || 0,
    perplexityApiKeyPrefix: config.api.perplexityApiKey?.substring(0, 10) || 'none'
  });
});

export default app;
