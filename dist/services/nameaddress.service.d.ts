import { NameAddress } from '@/types/nameaddress.model';
export declare class NameAddressService {
    private llmService;
    constructor();
    private getUrls;
    scrape(location: string, option: string): Promise<NameAddress[]>;
    scrapeOpenRiceHongKongRestaurants(): Promise<NameAddress[]>;
}
declare const _default: NameAddressService;
export default _default;
//# sourceMappingURL=nameaddress.service.d.ts.map