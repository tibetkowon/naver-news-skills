import { NaverClient } from "../naver-client.js";
import {
  AppConfig,
  CategoryResult,
  FetchNewsInput,
  FetchNewsOutput,
  NaverArticle,
  NaverSearchMeta,
} from "../types.js";

async function fetchUniqueArticles(
  client: NaverClient,
  category: string,
  count: number,
  seenLinks: Set<string>,
  onlyKorean: boolean = true
): Promise<{ meta: NaverSearchMeta; articles: NaverArticle[] }> {
  const unique: NaverArticle[] = [];
  let start = 1;
  let lastMeta: NaverSearchMeta | undefined;

  while (unique.length < count) {
    // When filtering by language, we want to fetch as many as possible (up to 100) 
    // to find enough Korean articles in each API call.
    const batchSize = onlyKorean ? 100 : Math.min(100, count);
    const { meta, articles } = await client.searchNews(
      category,
      batchSize,
      start,
      onlyKorean
    );
    lastMeta = meta;

    if (articles.length === 0) break;

    for (const article of articles) {
      if (!seenLinks.has(article.link) && unique.length < count) {
        seenLinks.add(article.link);
        unique.push(article);
      }
    }

    // No more articles available or reached limit
    // Note: client.searchNews returns up to batchSize items AFTER filtering.
    // If it returns fewer than batchSize, it means there are no more matches in that 100-item block.
    // But we need to keep going if we haven't reached the end of the total search (1000 items).
    start += 100; // Always jump by 100 to get the next page of results
    if (start > 1000) break;
  }

  return { meta: lastMeta!, articles: unique };
}

export async function fetchNews(
  input: FetchNewsInput,
  config: AppConfig
): Promise<FetchNewsOutput> {
  const categories = input.categories ?? config.news.categories;
  const count = input.count_per_category ?? config.news.count_per_category;
  const only_korean = input.only_korean ?? config.news.only_korean ?? true;

  if (!Array.isArray(categories) || categories.length === 0) {
    throw new Error("categories must be a non-empty array");
  }
  if (typeof count !== "number" || count < 1 || count > 100) {
    throw new Error("count_per_category must be between 1 and 100");
  }

  const client = new NaverClient(config.naver);
  const results: CategoryResult[] = [];
  const seenLinks = new Set<string>();

  for (const category of categories) {
    const { meta, articles } = await fetchUniqueArticles(
      client,
      category,
      count,
      seenLinks,
      only_korean
    );
    results.push({ category, meta, articles });
  }

  return { results };
}
