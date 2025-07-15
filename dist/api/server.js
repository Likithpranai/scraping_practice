"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const scrape_routes_1 = __importDefault(require("./routes/v1/scrape.routes"));
const errorHandler_1 = require("./middlewares/errorHandler");
const config_1 = require("@/config");
const logger_1 = __importDefault(require("@/utils/logger"));
const scraper_service_1 = __importDefault(require("@/services/scraper.service"));
const app = (0, express_1.default)();
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Request logging middleware
app.use((req, res, next) => {
    logger_1.default.info(`${req.method} ${req.path}`, {
        query: req.query,
        params: req.params,
        userAgent: req.get('User-Agent')
    });
    next();
});
// Routes
app.use('/api/v1/scrape', scrape_routes_1.default);
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date(),
        uptime: process.uptime()
    });
});
// Error handling
app.use(errorHandler_1.notFoundHandler);
app.use(errorHandler_1.errorHandler);
// Graceful shutdown
process.on('SIGTERM', async () => {
    logger_1.default.info('SIGTERM received, shutting down gracefully');
    await scraper_service_1.default.closeBrowser();
    process.exit(0);
});
process.on('SIGINT', async () => {
    logger_1.default.info('SIGINT received, shutting down gracefully');
    await scraper_service_1.default.closeBrowser();
    process.exit(0);
});
const PORT = config_1.config.server.port;
app.listen(PORT, () => {
    logger_1.default.info(`Roameo Scraping API server running on port ${PORT}`, {
        nodeEnv: config_1.config.server.nodeEnv,
        port: PORT,
        perplexityApiKeyPresent: !!config_1.config.api.perplexityApiKey,
        perplexityApiKeyLength: config_1.config.api.perplexityApiKey?.length || 0,
        perplexityApiKeyPrefix: config_1.config.api.perplexityApiKey?.substring(0, 10) || 'none'
    });
});
exports.default = app;
//# sourceMappingURL=server.js.map