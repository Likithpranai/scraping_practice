import { Router } from 'express';
import scrapeController from '@/api/controllers/scrape.controller';

const router = Router();

// GET /api/v1/scrape/status - Get API status and supported workflows
router.get('/status', scrapeController.getStatus);

// GET /api/v1/scrape/openrice/hongkongrestaurants - Scrape name and address for location and option
router.get('/openrice/hongkongrestaurants', scrapeController.scrapeOpenRiceHongKongRestaurants);

// GET /api/v1/scrape/site - Scrape site content
router.get('/site', scrapeController.scrapeSiteContent);

// GET /api/v1/scrape/nameaddr/:location/:option - Scrape name and address for location and option
router.get('/nameaddr/:location/:option', scrapeController.scrapeNameAddress);

// GET /api/v1/scrape/:location/:option - Scrape data for location and option
router.get('/:location/:option', scrapeController.scrapeData);



export default router;

