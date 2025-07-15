import { Request, Response, NextFunction } from 'express';
import { WorkflowFactory } from '@/workflows/workflow.factory';
import { ScrapeResponse } from '@/types/api.types';
import logger from '@/utils/logger';
import nameAddressService from '@/services/nameaddress.service';
import openRiceService from '@/services/openrice.service';
import siteContentService from '@/services/siteContent.service';

export class ScrapeController {
  async scrapeData(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = Date.now();
    const { location, option } = req.params;

    try {
      logger.info(`Received scraping request`, { location, option });

      // Validate location and option
      if (!WorkflowFactory.isWorkflowSupported(location, option)) {
        const error = new Error(`Unsupported location:option combination: ${location}:${option}`);
        (error as any).statusCode = 400;
        (error as any).code = 'UNSUPPORTED_WORKFLOW';
        throw error;
      }

      // Get and execute the appropriate workflow
      const workflow = WorkflowFactory.getWorkflow(location as any, option as any);
      const data = await workflow.execute();

      // Get strategy names used (this would need to be tracked in workflow)
      const strategiesUsed = ['openrice']; // This should come from workflow metadata

      const processingTime = Date.now() - startTime;

      const response: ScrapeResponse = {
        success: true,
        data,
        metadata: {
          location,
          option,
          total_count: data.length,
          strategies_used: strategiesUsed,
          scraped_at: new Date(),
          processing_time_ms: processingTime
        }
      };

      logger.info(`Successfully completed scraping request`, {
        location,
        option,
        totalCount: data.length,
        processingTimeMs: processingTime
      });

      res.json(response);

    } catch (error) {
      logger.error(`Scraping request failed`, {
        location,
        option,
        error: (error as Error).message,
        processingTimeMs: Date.now() - startTime
      });
      next(error);
    }
  }

  async scrapeNameAddress(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { location, option } = req.params;
    try {
      logger.info(`Received name-address scraping request`, { location, option });
      const data = await nameAddressService.scrape(location, option);
      res.json({ success: true, data });
    } catch (error) {
      logger.error(`Name-address scraping request failed`, {
        location,
        option,
        error: (error as Error).message,
      });
      next(error);
    }
  }

  async scrapeSiteContent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      logger.info('Received site content scraping request');
      const content = await siteContentService.getSiteContent();
      res.setHeader('Content-Type', 'text/plain');
      res.send(content);
    } catch (error) {
      logger.error('Site content scraping request failed', {
        error: (error as Error).message,
      });
      next(error);
    }
  }

  async getStatus(req: Request, res: Response): Promise<void> {
    const supportedWorkflows = WorkflowFactory.getSupportedWorkflows();
    
    res.json({
      success: true,
      status: 'operational',
      supported_workflows: supportedWorkflows,
      timestamp: new Date()
    });
  }

  async scrapeHongKongRestaurantsNameAddress(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      logger.info('Received OpenRice Hong Kong restaurants name-address scraping request');
      const data = await nameAddressService.scrapeOpenRiceHongKongRestaurants();
      res.json({ success: true, count: data.length, data });
    } catch (error) {
      logger.error('OpenRice Hong Kong restaurants name-address scraping request failed', {
        error: (error as Error).message,
      });
      next(error);
    }
  }

  async scrapeOpenRiceHongKongRestaurants(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      logger.info('Received OpenRice Hong Kong restaurants scraping request');
      const data = await openRiceService.scrapeOpenRiceHongKongRestaurants();
      res.json({ success: true, count: data.length, data });
    } catch (error) {
      logger.error('OpenRice Hong Kong restaurants scraping request failed', {
        error: (error as Error).message,
      });
      next(error);
    }
  }
}

export default new ScrapeController();
