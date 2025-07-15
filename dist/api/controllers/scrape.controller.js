"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScrapeController = void 0;
const workflow_factory_1 = require("@/workflows/workflow.factory");
const logger_1 = __importDefault(require("@/utils/logger"));
const nameaddress_service_1 = __importDefault(require("@/services/nameaddress.service"));
const openrice_service_1 = __importDefault(require("@/services/openrice.service"));
const siteContent_service_1 = __importDefault(require("@/services/siteContent.service"));
class ScrapeController {
    async scrapeData(req, res, next) {
        const startTime = Date.now();
        const { location, option } = req.params;
        try {
            logger_1.default.info(`Received scraping request`, { location, option });
            // Validate location and option
            if (!workflow_factory_1.WorkflowFactory.isWorkflowSupported(location, option)) {
                const error = new Error(`Unsupported location:option combination: ${location}:${option}`);
                error.statusCode = 400;
                error.code = 'UNSUPPORTED_WORKFLOW';
                throw error;
            }
            // Get and execute the appropriate workflow
            const workflow = workflow_factory_1.WorkflowFactory.getWorkflow(location, option);
            const data = await workflow.execute();
            // Get strategy names used (this would need to be tracked in workflow)
            const strategiesUsed = ['openrice']; // This should come from workflow metadata
            const processingTime = Date.now() - startTime;
            const response = {
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
            logger_1.default.info(`Successfully completed scraping request`, {
                location,
                option,
                totalCount: data.length,
                processingTimeMs: processingTime
            });
            res.json(response);
        }
        catch (error) {
            logger_1.default.error(`Scraping request failed`, {
                location,
                option,
                error: error.message,
                processingTimeMs: Date.now() - startTime
            });
            next(error);
        }
    }
    async scrapeNameAddress(req, res, next) {
        const { location, option } = req.params;
        try {
            logger_1.default.info(`Received name-address scraping request`, { location, option });
            const data = await nameaddress_service_1.default.scrape(location, option);
            res.json({ success: true, data });
        }
        catch (error) {
            logger_1.default.error(`Name-address scraping request failed`, {
                location,
                option,
                error: error.message,
            });
            next(error);
        }
    }
    async scrapeSiteContent(req, res, next) {
        try {
            logger_1.default.info('Received site content scraping request');
            const content = await siteContent_service_1.default.getSiteContent();
            res.setHeader('Content-Type', 'text/plain');
            res.send(content);
        }
        catch (error) {
            logger_1.default.error('Site content scraping request failed', {
                error: error.message,
            });
            next(error);
        }
    }
    async getStatus(req, res) {
        const supportedWorkflows = workflow_factory_1.WorkflowFactory.getSupportedWorkflows();
        res.json({
            success: true,
            status: 'operational',
            supported_workflows: supportedWorkflows,
            timestamp: new Date()
        });
    }
    async scrapeHongKongRestaurantsNameAddress(req, res, next) {
        try {
            logger_1.default.info('Received OpenRice Hong Kong restaurants name-address scraping request');
            const data = await nameaddress_service_1.default.scrapeOpenRiceHongKongRestaurants();
            res.json({ success: true, count: data.length, data });
        }
        catch (error) {
            logger_1.default.error('OpenRice Hong Kong restaurants name-address scraping request failed', {
                error: error.message,
            });
            next(error);
        }
    }
    async scrapeOpenRiceHongKongRestaurants(req, res, next) {
        try {
            logger_1.default.info('Received OpenRice Hong Kong restaurants scraping request');
            const data = await openrice_service_1.default.scrapeOpenRiceHongKongRestaurants();
            res.json({ success: true, count: data.length, data });
        }
        catch (error) {
            logger_1.default.error('OpenRice Hong Kong restaurants scraping request failed', {
                error: error.message,
            });
            next(error);
        }
    }
}
exports.ScrapeController = ScrapeController;
exports.default = new ScrapeController();
//# sourceMappingURL=scrape.controller.js.map