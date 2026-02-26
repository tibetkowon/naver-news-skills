import { NaverConfig, NaverArticle, NaverSearchMeta } from "./types.js";
export declare class NaverClient {
    private config;
    constructor(config: NaverConfig);
    searchNews(category: string, count: number, start?: number): Promise<{
        meta: NaverSearchMeta;
        articles: NaverArticle[];
    }>;
}
//# sourceMappingURL=naver-client.d.ts.map