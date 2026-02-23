import { NaverClient } from "../naver-client.js";
import { AppConfig, FetchNewsInput, FetchNewsOutput } from "../types.js";

export async function fetchNews(
  input: FetchNewsInput,
  config: AppConfig
): Promise<FetchNewsOutput> {
  const categories = input.categories ?? config.news.categories;
  const count = input.count_per_category ?? config.news.count_per_category;

  if (!Array.isArray(categories) || categories.length === 0) {
    throw new Error("categories must be a non-empty array");
  }
  if (typeof count !== "number" || count < 1 || count > 100) {
    throw new Error("count_per_category must be between 1 and 100");
  }

  const client = new NaverClient(config.naver);
  const results: FetchNewsOutput["results"] = [];

  for (const category of categories) {
    const articles = await client.searchNews(category, count);
    results.push({ category, articles });
  }

  return { results };
}
