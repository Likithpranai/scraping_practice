export interface LLMRequest {
    prompt: string;
    maxTokens?: number;
    temperature?: number;
}
export interface LLMResponse {
    content: string;
    success: boolean;
    error?: string;
}
export declare class LLMService {
    constructor();
    generateResponse(request: LLMRequest): Promise<LLMResponse>;
    filterRelevantLinks(links: Array<{
        title: string;
        url: string;
    }>, location: string, option: string): Promise<Array<{
        title: string;
        url: string;
    }>>;
    generateStructuredData<T>(content: string, location: string, option: string): Promise<T[]>;
}
declare const _default: LLMService;
export default _default;
//# sourceMappingURL=llm.service.local.d.ts.map