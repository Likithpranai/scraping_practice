import { Request, Response, NextFunction } from 'express';
export declare class ScrapeController {
    scrapeData(req: Request, res: Response, next: NextFunction): Promise<void>;
    scrapeNameAddress(req: Request, res: Response, next: NextFunction): Promise<void>;
    scrapeSiteContent(req: Request, res: Response, next: NextFunction): Promise<void>;
    getStatus(req: Request, res: Response): Promise<void>;
    scrapeHongKongRestaurantsNameAddress(req: Request, res: Response, next: NextFunction): Promise<void>;
    scrapeOpenRiceHongKongRestaurants(req: Request, res: Response, next: NextFunction): Promise<void>;
}
declare const _default: ScrapeController;
export default _default;
//# sourceMappingURL=scrape.controller.d.ts.map