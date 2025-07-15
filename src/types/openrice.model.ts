export interface OpenRiceRestaurant {
    
    // innertext of the only span with class="name"
    name: string;
    
    // innertext of the only div with class="smaller-font-name"
    secondaryName?: string;

    // innertext of the only a with attribute data-href="#map"
    address: string;

    // innertext of (div with class="header-poi-district" > a)
    neighbourhood?: string;

    // innertext of (div with class="header-poi-price" > a)
    pricePoint?: string; // e.g. "$101-200"

    // 1. for all (div.popular-dish-list-with-cover > li.caption-container > a > div.photo), the link is inside the style as `style="background-image: url(https://static8.orstatic.com/...)"`
    // 2. for all (div.restaurant-photo), the link is inside the style as `style="background-image: url(https://static8.orstatic.com/...)"`
    photoUrls?: string[];

    // innertext of div with class="header-bookmark-count"
    saved?: string;

    // url of the restaurant page
    url: string;

    // innertext of the only div with class="header-score"
    rating?: number | string;

    // innertext of all a under div with class="header-poi-categories"
    openriceCategories?: string[]; // e.g. ["japanese", "wine"]

    // innertext of 2nd div under div with class="header-smile-section"
    ratedHappy?: number;

    // innertext of 4th div under div with class="header-smile-section"
    ratedOk?: number;

    // innertext of 6th div under div with class="header-smile-section"
    ratedUnhappy?: number;

    // innertext of (section with class="transport-section" > div)
    navigation?: string; // e.g. "2-min walk from Exit A2, Mong Kok MTR Station"

    // innertext of (section with class="telephone-section" > div with class="content")
    telephone?: string;

    // innertext of (section with class="introduction-section" > div with class="content")
    introduction?: string;

    // innertext of all divs with class="opening-hours-date" and their corresponding divs with class="opening-hours-time", exclude the "Today" entry
    openingHours?: Record<string, string>;

    // inner text of all spans under div with class="comma-tags"
    paymentMethods?: string[];

    // all key-value pairs with key: div with class="condition-item" > span with class="condition-name", value: true if class of (div with class="condition-item" > 1st span) contains "d_sr2_lhs_tick_desktop"; false otherwise
    otherInfo?: Record<string, boolean>;

    // innertext of all (div.popular-dish-list-with-cover > li.caption-container > a > div.caption)
    recommendedDishes?: string[];
}