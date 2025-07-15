"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMService = void 0;
const axios_1 = __importDefault(require("axios"));
const config_1 = require("@/config");
const logger_1 = __importDefault(require("@/utils/logger"));
const restaurant_model_1 = require("@/types/restaurant.model");
const activity_model_1 = require("@/types/activity.model");
class LLMService {
    constructor() {
        // Validate API key exists
        if (!config_1.config.api.perplexityApiKey) {
            logger_1.default.error('LLM_API_KEY is not set in environment variables');
            throw new Error('LLM_API_KEY is required but not found in environment variables');
        }
        logger_1.default.debug('Initializing LLM service with API key', {
            keyLength: config_1.config.api.perplexityApiKey.length,
            keyPrefix: config_1.config.api.perplexityApiKey.substring(0, 10)
        });
    }
    async generateResponse(request) {
        try {
            logger_1.default.debug('Sending request to Perplexity API', {
                prompt: request.prompt.substring(0, 100),
                apiKeyPrefix: config_1.config.api.perplexityApiKey.substring(0, 10)
            });
            const headers = {
                'Authorization': `Bearer ${process.env.NEXT_PUBLIC_PERPLEXITY_API_KEY}`,
                'Content-Type': 'application/json'
            };
            logger_1.default.debug('Using headers for Perplexity API', {
                authorization: headers.Authorization,
                contenttype: headers['Content-Type']
            });
            const response = await axios_1.default.post('https://api.perplexity.ai/chat/completions', {
                model: 'sonar',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful assistant that provides accurate information about restaurants and activities. Always format your responses as valid JSON when requested.'
                    },
                    {
                        role: 'user',
                        content: request.prompt
                    }
                ],
                max_tokens: request.maxTokens || 10000,
                temperature: request.temperature || 0.2,
                top_p: 0.9
            }, {
                headers
            });
            const content = response.data.choices[0].message.content;
            logger_1.default.debug('Received response from Perplexity API', { contentLength: content.length });
            return {
                content,
                success: true
            };
        }
        catch (error) {
            logger_1.default.error('Error calling Perplexity API', {
                error: error.message,
                status: error.response?.status,
                statusText: error.response?.statusText,
                responseData: error.response?.data
            });
            return {
                content: '',
                success: false,
                error: error.message
            };
        }
    }
    async filterRelevantLinks(links, location, option) {
        const prompt = `
      I have a list of links with titles. Please filter and return only those that are relevant to ${option} in ${location}.
      
      Links:
      ${links.map(link => `Title: ${link.title}, URL: ${link.url}`).join('\n')}
      
      Return only a JSON array of objects with 'title' and 'url' fields for the relevant links.
    `;
        const response = await this.generateResponse({ prompt });
        if (!response.success) {
            logger_1.default.warn('Failed to filter links via LLM, returning original list');
            return links;
        }
        try {
            const filtered = JSON.parse(response.content);
            return Array.isArray(filtered) ? filtered : links;
        }
        catch (error) {
            logger_1.default.warn('Failed to parse LLM response for link filtering, returning original list');
            return links;
        }
    }
    async generateStructuredData(content, location, option) {
        let schema;
        let schema_def;
        // Determine schema based on the 'option' from the strategy
        switch (option) {
            case 'restaurants':
            case 'cafes':
            case 'bars & nightlife':
                schema = restaurant_model_1.RestaurantJSONSchema;
                schema_def = restaurant_model_1.RestaurantDefinitions;
                break;
            case 'events':
            case 'local activities':
                schema = activity_model_1.ActivityJSONSchema;
                schema_def = activity_model_1.ActivityDefinitions;
                break;
            default:
                logger_1.default.error(`Unsupported option for generateStructuredData: ${option}`);
                throw new Error(`Unsupported option for generateStructuredData: ${option}`);
        }
        const prompt = `
      Please analyze the following content and extract ${option} information for ${location}.
      
      Content: ${content}
      
      Return the data as a JSON array following this structure:
      ${schema}

      Definitions of the schema fields:
      ${schema_def}
      
      Important: Return only valid JSON, no additional text.
    `;
        const response = await this.generateResponse({ prompt });
        if (!response.success) {
            throw new Error(`Failed to generate structured data: ${response.error}`);
        }
        try {
            // Clean the response to extract JSON
            let cleanedContent = response.content.trim();
            const startBracket = cleanedContent.indexOf('[');
            const endBracket = cleanedContent.lastIndexOf(']');
            if (startBracket !== -1 && endBracket !== -1 && startBracket < endBracket) {
                cleanedContent = cleanedContent.substring(startBracket, endBracket + 1);
            }
            const data = JSON.parse(cleanedContent);
            return Array.isArray(data) ? data : [];
        }
        catch (error) {
            logger_1.default.error('Failed to parse LLM response as JSON', { content: response.content.substring(0, 500) });
            throw new Error('Failed to parse LLM response as valid JSON');
        }
    }
    /** @deprecated Use generateNameAddressListFromUrl instead. This method will be removed in a future version. */
    async generateNameAddressList(content, location, option) {
        const prompt = `
      Please analyze the following content and extract a list of names and addresses for ${option} in ${location}.
      
      Content: ${content}
      
      Your response MUST be a valid JSON array of objects, where each object has a "name" and an "address" key.
      DO NOT include any text, explanations, or markdown formatting (like \`\`\`json) outside of the JSON array.
      Your entire response should be only the raw JSON string.
    `;
        const response = await this.generateResponse({ prompt });
        if (!response.success) {
            throw new Error(`Failed to generate name-address list: ${response.error}`);
        }
        try {
            // Clean the response to extract JSON
            let cleanedContent = response.content.trim();
            // Remove markdown code block fences
            if (cleanedContent.startsWith("```json")) {
                cleanedContent = cleanedContent.substring(7);
                if (cleanedContent.endsWith("```")) {
                    cleanedContent = cleanedContent.slice(0, -3);
                }
            }
            const startBracket = cleanedContent.indexOf('[');
            const endBracket = cleanedContent.lastIndexOf(']');
            if (startBracket !== -1 && endBracket !== -1 && startBracket < endBracket) {
                cleanedContent = cleanedContent.substring(startBracket, endBracket + 1);
            }
            const data = JSON.parse(cleanedContent);
            return Array.isArray(data) ? data : [];
        }
        catch (error) {
            logger_1.default.error('Failed to parse LLM response as JSON for name-address list', { content: response.content.substring(0, 500) });
            throw new Error('Failed to parse LLM response as valid JSON for name-address list');
        }
    }
    async generateNameAddressListFromUrl(url, location, option) {
        const prompt = `
      Please visit the following URL and extract a list of names and addresses for ${option} in ${location}.
      
      URL: ${url}
      
      Return the data as a JSON array of objects with "name" and "address" fields.
      Important: Return only valid JSON, no additional text or explanations.
      Your response MUST be a valid JSON array of objects, where each object has a "name" and an "address" key.
      DO NOT include any text, explanations, or markdown formatting (like \`\`\`json) outside of the JSON array.
      Your entire response should be only the raw JSON string.
    `;
        const response = await this.generateResponse({ prompt });
        if (!response.success) {
            throw new Error(`Failed to generate name-address list from URL: ${response.error}`);
        }
        try {
            // Clean the response to extract JSON
            let cleanedContent = response.content.trim();
            // Remove markdown code block fences
            if (cleanedContent.startsWith("```json")) {
                cleanedContent = cleanedContent.substring(7);
                if (cleanedContent.endsWith("```")) {
                    cleanedContent = cleanedContent.slice(0, -3);
                }
            }
            const startBracket = cleanedContent.indexOf('[');
            const endBracket = cleanedContent.lastIndexOf(']');
            if (startBracket !== -1 && endBracket !== -1 && startBracket < endBracket) {
                cleanedContent = cleanedContent.substring(startBracket, endBracket + 1);
            }
            const data = JSON.parse(cleanedContent);
            logger_1.default.debug('Parsed name-address list from URL', { itemCount: data.length }, { url: url });
            return Array.isArray(data) ? data : [];
        }
        catch (error) {
            logger_1.default.error('Failed to parse LLM response as JSON for name-address list from URL', { content: response.content.substring(0, 500) });
            throw new Error('Failed to parse LLM response as valid JSON for name-address list from URL');
        }
    }
}
exports.LLMService = LLMService;
exports.default = new LLMService();
//# sourceMappingURL=llm.service.js.map