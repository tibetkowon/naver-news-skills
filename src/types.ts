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
  originallink?: string; // omitted when identical to link (token reduction)
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

export interface CategoryResult {
  category: string;
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
  content: string;
}

export interface CreateNotionPageOutput {
  page_url: string;
  page_id: string;
}
