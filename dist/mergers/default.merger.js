"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultMerger = void 0;
const IMerger_1 = require("./IMerger");
const logger_1 = __importDefault(require("@/utils/logger"));
class DefaultMerger extends IMerger_1.IMerger {
    merge(results) {
        logger_1.default.debug('Starting default merge process', { resultCount: results.length });
        const mergedMap = new Map();
        // Flatten all results and create a map to handle duplicates
        for (const result of results) {
            for (const item of result.data) {
                const key = this.generateUniqueKey(item);
                if (!mergedMap.has(key)) {
                    mergedMap.set(key, item);
                }
                else {
                    // If duplicate exists, keep the one with more complete data
                    const existing = mergedMap.get(key);
                    const merged = this.mergeItems(existing, item);
                    mergedMap.set(key, merged);
                }
            }
        }
        const finalResults = Array.from(mergedMap.values());
        logger_1.default.debug('Completed default merge process', {
            inputItems: results.reduce((sum, r) => sum + r.data.length, 0),
            outputItems: finalResults.length
        });
        return finalResults;
    }
    mergeItems(existing, newItem) {
        // Simple merge strategy: prefer non-empty values from newItem, fallback to existing
        const merged = { ...existing };
        Object.keys(newItem).forEach(key => {
            const newValue = newItem[key];
            const existingValue = merged[key];
            // Prefer non-empty values
            if (newValue && (!existingValue || this.isEmptyValue(existingValue))) {
                merged[key] = newValue;
            }
        });
        return merged;
    }
    isEmptyValue(value) {
        if (value === null || value === undefined)
            return true;
        if (typeof value === 'string' && value.trim() === '')
            return true;
        if (Array.isArray(value) && value.length === 0)
            return true;
        if (typeof value === 'object' && Object.keys(value).length === 0)
            return true;
        return false;
    }
}
exports.DefaultMerger = DefaultMerger;
//# sourceMappingURL=default.merger.js.map