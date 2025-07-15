"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HongKongRestaurantsMerger = void 0;
const IMerger_1 = require("../IMerger");
const logger_1 = __importDefault(require("@/utils/logger"));
class HongKongRestaurantsMerger extends IMerger_1.IMerger {
    merge(results) {
        logger_1.default.debug('Starting Hong Kong restaurants custom merge', { resultCount: results.length });
        const mergedMap = new Map();
        // Group results by strategy
        const resultsByStrategy = new Map();
        for (const result of results) {
            const strategyName = result.metadata.strategy.split('-').pop() || 'unknown';
            resultsByStrategy.set(strategyName, result.data);
        }
        // First pass: collect all unique restaurants
        for (const result of results) {
            for (const restaurant of result.data) {
                const key = this.generateRestaurantKey(restaurant);
                if (!mergedMap.has(key)) {
                    mergedMap.set(key, { ...restaurant });
                }
            }
        }
        // Second pass: intelligently merge data based on strategy priorities
        for (const [key, restaurant] of mergedMap.entries()) {
            const candidates = this.findCandidates(restaurant, results);
            mergedMap.set(key, this.intelligentMerge(candidates));
        }
        const finalResults = Array.from(mergedMap.values());
        logger_1.default.debug('Completed Hong Kong restaurants custom merge', {
            inputItems: results.reduce((sum, r) => sum + r.data.length, 0),
            outputItems: finalResults.length
        });
        return finalResults;
    }
    generateRestaurantKey(restaurant) {
        const name = restaurant.name.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, '');
        const address = restaurant.address.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, '');
        // Use first few words of address for better matching
        const addressWords = address.split(/\s+/).slice(0, 3).join('');
        return `${name}-${addressWords}`;
    }
    findCandidates(target, results) {
        const candidates = [];
        const targetKey = this.generateRestaurantKey(target);
        for (const result of results) {
            for (const restaurant of result.data) {
                if (this.generateRestaurantKey(restaurant) === targetKey) {
                    const strategyName = result.metadata.strategy.split('-').pop() || 'unknown';
                    candidates.push({ restaurant, strategy: strategyName });
                }
            }
        }
        return candidates;
    }
    intelligentMerge(candidates) {
        if (candidates.length === 1) {
            return candidates[0].restaurant;
        }
        // Start with a deep copy of the first candidate to serve as the base
        const merged = JSON.parse(JSON.stringify(candidates[0].restaurant));
        // --- Accumulators for merging ---
        const hiddenGemScores = [];
        const tagsTypeAccumulator = {};
        const tagsGroupAccumulator = {};
        const allSignatureFoods = new Set();
        const allClosingDays = new Set();
        const allClosingDates = new Set();
        const allRecognitions = {};
        // --- Gather data from all candidates ---
        for (const { restaurant } of candidates) {
            // Prefer longest/most descriptive text fields
            if (restaurant.local_name && restaurant.local_name.length > (merged.local_name?.length || 0))
                merged.local_name = restaurant.local_name;
            if (restaurant.address && restaurant.address.length > (merged.address?.length || 0))
                merged.address = restaurant.address;
            if (restaurant.neighborhood && restaurant.neighborhood.length > (merged.neighborhood?.length || 0))
                merged.neighborhood = restaurant.neighborhood;
            if (restaurant.text_embedding && restaurant.text_embedding.length > (merged.text_embedding?.length || 0))
                merged.text_embedding = restaurant.text_embedding;
            if (restaurant.local_tips && restaurant.local_tips.length > (merged.local_tips?.length || 0))
                merged.local_tips = restaurant.local_tips;
            // Collect scores for averaging
            if (restaurant.hidden_gem_score)
                hiddenGemScores.push(restaurant.hidden_gem_score);
            // Collect tags for averaging
            for (const [tag, score] of Object.entries(restaurant.tags_type || {})) {
                if (!tagsTypeAccumulator[tag])
                    tagsTypeAccumulator[tag] = [];
                tagsTypeAccumulator[tag].push(score);
            }
            for (const [tag, score] of Object.entries(restaurant.tags_group || {})) {
                if (!tagsGroupAccumulator[tag])
                    tagsGroupAccumulator[tag] = [];
                tagsGroupAccumulator[tag].push(score);
            }
            // For one-hot encoded budget, take the first valid one
            if (Object.values(restaurant.tags_budget || {}).some(v => v > 0)) {
                if (!Object.values(merged.tags_budget).some(v => v > 0)) {
                    merged.tags_budget = restaurant.tags_budget;
                }
            }
            // Collect unique array items
            restaurant.signature_food?.forEach(food => allSignatureFoods.add(food));
            // Combine recognition objects
            Object.assign(allRecognitions, restaurant.recognition);
        }
        // --- Finalize the merged object ---
        // Average scores
        if (hiddenGemScores.length > 0) {
            merged.hidden_gem_score = Math.round(hiddenGemScores.reduce((a, b) => a + b, 0) / hiddenGemScores.length);
        }
        for (const [tag, scores] of Object.entries(tagsTypeAccumulator)) {
            const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
            merged.tags_type[tag] = avg;
        }
        for (const [tag, scores] of Object.entries(tagsGroupAccumulator)) {
            const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
            merged.tags_group[tag] = avg;
        }
        // Assign combined arrays
        merged.signature_food = Array.from(allSignatureFoods);
        merged.recognition = allRecognitions;
        return merged;
    }
}
exports.HongKongRestaurantsMerger = HongKongRestaurantsMerger;
//# sourceMappingURL=hong-kong-restaurants.merger.js.map