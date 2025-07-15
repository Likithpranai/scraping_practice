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
    /** @deprecated Use generateNameAddressListFromUrl instead. This method will be removed in a future version. */
    generateNameAddressList(content: string, location: string, option: string): Promise<Array<{
        name: string;
        address: string;
    }>>;
    generateNameAddressListFromUrl(url: string, location: string, option: string): Promise<Array<{
        name: string;
        address: string;
    }>>;
}
declare const _default: LLMService;
export default _default;
//# sourceMappingURL=llm.service.d.ts.map