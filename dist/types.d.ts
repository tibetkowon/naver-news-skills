export interface NaverConfig {
    client_id: string;
    client_secret: string;
}
export interface NotionConfig {
    api_key: string;
    parent_page_id: string;
}
export interface NewsConfig {
    categories: string[];
    count_per_category: number;
}
export interface AppConfig {
    naver: NaverConfig;
    notion: NotionConfig;
    news: NewsConfig;
}
export interface NaverArticle {
    title: string;
    link: string;
    originallink?: string;
    description: string;
    pubDate: string;
}
export interface NaverSearchResponse {
    lastBuildDate: string;
    total: number;
    start: number;
    display: number;
    items: NaverArticle[];
}
export interface NaverSearchMeta {
    lastBuildDate: string;
    total: number;
    start: number;
    display: number;
}
export interface CategoryResult {
    category: string;
    meta: NaverSearchMeta;
    articles: NaverArticle[];
}
export interface FetchNewsInput {
    categories?: string[];
    count_per_category?: number;
}
export interface FetchNewsOutput {
    results: CategoryResult[];
}
export interface CreateNotionPageInput {
    title: string;
    categories: CategoryResult[];
    template?: string;
}
export interface CreateNotionPageOutput {
    page_url: string;
    page_id: string;
}
//# sourceMappingURL=types.d.ts.map