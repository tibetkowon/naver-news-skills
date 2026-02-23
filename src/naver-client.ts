import { NaverConfig, NaverArticle, NaverSearchResponse } from "./types.js";

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
    count: number
  ): Promise<NaverArticle[]> {
    const safeCategory = sanitizeCategory(category);
    if (!safeCategory) {
      throw new Error(`Invalid category: "${category}"`);
    }

    const display = Math.min(Math.max(1, count), 100);
    const url = new URL(NAVER_NEWS_URL);
    url.searchParams.set("query", safeCategory);
    url.searchParams.set("display", String(display));
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

    return data.items.map((item) => ({
      title: stripHtml(item.title),
      link: item.link,
      originallink: item.originallink,
      description: stripHtml(item.description),
      pubDate: item.pubDate,
    }));
  }
}
