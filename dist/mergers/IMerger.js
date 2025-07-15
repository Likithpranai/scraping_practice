"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IMerger = void 0;
class IMerger {
    generateUniqueKey(item) {
        // Default implementation - can be overridden
        const name = item.name?.toLowerCase().replace(/\s+/g, '') || '';
        const address = item.address?.toLowerCase().replace(/\s+/g, '') || '';
        return `${name}-${address}`;
    }
}
exports.IMerger = IMerger;
//# sourceMappingURL=IMerger.js.map