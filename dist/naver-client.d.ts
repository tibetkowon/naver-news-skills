import { NaverConfig, NaverArticle } from "./types.js";
export declare class NaverClient {
    private config;
    constructor(config: NaverConfig);
    searchNews(category: string, count: number): Promise<NaverArticle[]>;
}
//# sourceMappingURL=naver-client.d.ts.map