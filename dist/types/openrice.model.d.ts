export interface OpenRiceRestaurant {
    name: string;
    secondaryName?: string;
    address: string;
    neighbourhood?: string;
    pricePoint?: string;
    photoUrls?: string[];
    saved?: string;
    url: string;
    rating?: number | string;
    openriceCategories?: string[];
    ratedHappy?: number;
    ratedOk?: number;
    ratedUnhappy?: number;
    navigation?: string;
    telephone?: string;
    introduction?: string;
    openingHours?: Record<string, string>;
    paymentMethods?: string[];
    otherInfo?: Record<string, boolean>;
    recommendedDishes?: string[];
}
//# sourceMappingURL=openrice.model.d.ts.map