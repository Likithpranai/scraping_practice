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
            // throw new Error('LLM_API_KEY is required but not found in environment variables');
        }
        logger_1.default.debug('Initializing LLM service with API key', {
            keyLength: config_1.config.api.perplexityApiKey.length,
            keyPrefix: config_1.config.api.perplexityApiKey.substring(0, 10)
        });
    }
    async generateResponse(request) {
        try {
            // logger.debug('Sending request to Perplexity API', { 
            //   prompt: request.prompt.substring(0, 100),
            //   apiKeyPrefix: config.api.perplexityApiKey.substring(0, 10)
            // });
            // const headers = {
            // 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_PERPLEXITY_API_KEY}`,
            // 'Content-Type': 'application/json'
            // };
            // logger.debug('Using headers for Perplexity API', {
            //   authorization: headers.Authorization,
            //   contenttype: headers['Content-Type']
            // });
            // const response = await axios.post(
            //   'https://api.perplexity.ai/chat/completions',
            //   {
            //     model: 'sonar-pro',
            //     messages: [
            //       {
            //         role: 'system',
            //         content: 'You are a helpful assistant that provides accurate information about restaurants and activities. Always format your responses as valid JSON when requested.'
            //       },
            //       {
            //         role: 'user',
            //         content: request.prompt
            //       }
            //     ],
            //     max_tokens: request.maxTokens || 10000,
            //     temperature: request.temperature || 0.2,
            //     top_p: 0.9
            //   },
            //   {
            //     headers
            //   }
            // );
            const response = await axios_1.default.post('http://localhost:8000/generate', {
                prompt: request.prompt,
            });
            const content = response.data.generated_text;
            logger_1.default.debug('Received response from Local LLM API', { contentLength: content.length });
            return {
                content,
                success: true
            };
        }
        catch (error) {
            logger_1.default.error('Error calling Local LLM API', {
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
}
exports.LLMService = LLMService;
exports.default = new LLMService();
//# sourceMappingURL=llm.service.local.js.map