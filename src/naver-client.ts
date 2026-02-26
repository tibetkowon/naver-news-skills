import { NaverConfig, NaverArticle, NaverSearchMeta, NaverSearchResponse } from "./types.js";

const NAVER_NEWS_URL = "https://openapi.naver.com/v1/search/news.json";

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, "").replace(/&[a-zA-Z]+;/g, (entity) => {
    const entities: Record<string, string> = {
      "&amp;": "&",
      "&lt;": "<",
      "&gt;": ">",
      "&quot;": '"',
      "&#39;": "'",
      "&apos;": "'",
    };
    return entities[entity] ?? entity;
  });
}

function sanitizeCategory(category: string): string {
  // Only allow safe characters for query params
  return category.trim().replace(/[^\w\s가-힣ㄱ-ㅎㅏ-ㅣ\-]/g, "");
}

export class NaverClient {
  private config: NaverConfig;

  constructor(config: NaverConfig) {
    this.config = config;
  }

  async searchNews(
    category: string,
    count: number,
    start: number = 1,
    onlyKorean: boolean = false,
    whitelistDomains: string[] = [],
    blacklistDomains: string[] = []
  ): Promise<{ meta: NaverSearchMeta; articles: NaverArticle[] }> {
    const safeCategory = sanitizeCategory(category);
    if (!safeCategory) {
      throw new Error(`Invalid category: "${category}"`);
    }

    const display = Math.min(Math.max(1, count), 100);
    const safeStart = Math.max(1, Math.min(1000, start));
    const url = new URL(NAVER_NEWS_URL);
    url.searchParams.set("query", safeCategory);
    url.searchParams.set("display", String(display));
    url.searchParams.set("start", String(safeStart));
    url.searchParams.set("sort", "date");

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        headers: {
          "X-Naver-Client-Id": this.config.client_id,
          "X-Naver-Client-Secret": this.config.client_secret,
        },
      });
    } catch (err) {
      throw new Error(
        `Network error calling Naver API: ${(err as Error).message}`
      );
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      if (response.status === 401) {
        throw new Error(
          "Naver API authentication failed. Check your client_id and client_secret."
        );
      }
      if (response.status === 429) {
        throw new Error(
          "Naver API rate limit exceeded. Please try again later."
        );
      }
      throw new Error(
        `Naver API error ${response.status}: ${body}`
      );
    }

    const data = (await response.json()) as NaverSearchResponse;
    const items = data.items.map((item) => ({
      title: stripHtml(item.title),
      link: item.link,
      originallink: item.originallink,
      description: stripHtml(item.description),
      pubDate: item.pubDate,
    }));

    let filteredArticles = items;

    // 1. Language filtering
    if (onlyKorean) {
      filteredArticles = filteredArticles.filter((article) => {
        const koreanRegex = /[가-힣ㄱ-ㅎㅏ-ㅣ]/;
        return (
          koreanRegex.test(article.title) ||
          koreanRegex.test(article.description)
        );
      });
    }

    // 2. Domain Whitelist filtering
    if (whitelistDomains.length > 0) {
      filteredArticles = filteredArticles.filter((article) => {
        const targetLink = article.originallink || article.link;
        return whitelistDomains.some((domain) => targetLink.includes(domain));
      });
    }

    // 3. Domain Blacklist filtering
    if (blacklistDomains.length > 0) {
      filteredArticles = filteredArticles.filter((article) => {
        const targetLink = article.originallink || article.link;
        return !blacklistDomains.some((domain) => targetLink.includes(domain));
      });
    }

    return {
      meta: {
        lastBuildDate: data.lastBuildDate,
        total: data.total,
        start: data.start,
        display: data.display,
      },
      articles: filteredArticles.slice(0, count),
    };
  }
}
