"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IStrategy = void 0;
class IStrategy {
    constructor(location, option, siteName) {
        this.location = location;
        this.option = option;
        this.siteName = siteName;
    }
    getStrategyName() {
        return `${this.location}-${this.option}-${this.siteName}`;
    }
}
exports.IStrategy = IStrategy;
//# sourceMappingURL=IStrategy.js.map