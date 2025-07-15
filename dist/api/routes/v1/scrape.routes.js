"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const scrape_controller_1 = __importDefault(require("@/api/controllers/scrape.controller"));
const router = (0, express_1.Router)();
// GET /api/v1/scrape/status - Get API status and supported workflows
router.get('/status', scrape_controller_1.default.getStatus);
// GET /api/v1/scrape/openrice/hongkongrestaurants - Scrape name and address for location and option
router.get('/openrice/hongkongrestaurants', scrape_controller_1.default.scrapeOpenRiceHongKongRestaurants);
// GET /api/v1/scrape/site - Scrape site content
router.get('/site', scrape_controller_1.default.scrapeSiteContent);
// GET /api/v1/scrape/nameaddr/:location/:option - Scrape name and address for location and option
router.get('/nameaddr/:location/:option', scrape_controller_1.default.scrapeNameAddress);
// GET /api/v1/scrape/:location/:option - Scrape data for location and option
router.get('/:location/:option', scrape_controller_1.default.scrapeData);
exports.default = router;
//# sourceMappingURL=scrape.routes.js.map