import { NaverClient } from "../naver-client.js";
import {
  AppConfig,
  FetchNewsInput,
  FetchNewsOutput,
  NaverArticle,
} from "../types.js";

const DESC_MAX_LEN = 200;

// Extra articles fetched per category to compensate for filtering and
// cross-category deduplication losses. For example, if count=5 and BUFFER=10,
// we request 15 from the API; after filtering + dedup we trim back to 5.
const OVER_FETCH_BUFFER = 10;

function truncateDescription(desc: string): string {
  if (desc.length <= DESC_MAX_LEN) return desc;
  return desc.slice(0, DESC_MAX_LEN) + "…";
}

function shortDate(pubDate: string): string {
  const d = new Date(pubDate);
  if (isNaN(d.getTime())) return pubDate;
  return d.toISOString().slice(0, 10); // "2026-02-23"
}

function processArticle(article: NaverArticle): NaverArticle {
  const processed: NaverArticle = {
    title: article.title,
    link: article.link,
    description: truncateDescription(article.description),
    pubDate: shortDate(article.pubDate),
  };
  // Only include originallink when it differs from link (saves tokens)
  if (article.originallink && article.originallink !== article.link) {
    processed.originallink = article.originallink;
  }
  return processed;
}

/**
 * Returns false for articles that are unlikely to be real, readable news:
 * - Bracket-prefixed notices (e.g. "[알림]", "[공고]", "[광고]", "[보도자료]")
 *   These are typically press releases, administrative notices, or ads
 *   rather than actual news articles.
 */
function isAccessibleArticle(article: NaverArticle): boolean {
  // Filter out notice/press-release style titles like "[알림]", "[공고]"
  if (/^\[.+\]/.test(article.title)) {
    return false;
  }
  return true;
}

function deduplicateResults(
  results: FetchNewsOutput["results"],
  countPerCategory: number
): FetchNewsOutput["results"] {
  const seen = new Set<string>();
  return results.map((r) => ({
    ...r,
    articles: r.articles
      .filter((a) => {
        if (seen.has(a.link)) return false;
        seen.add(a.link);
        return true;
      })
      .slice(0, countPerCategory),
  }));
}

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

  // Over-fetch to compensate for articles removed by filtering and
  // cross-category deduplication, then trim to the requested count after.
  const fetchCount = Math.min(count + OVER_FETCH_BUFFER, 100);
  const client = new NaverClient(config.naver);
  const rawResults: FetchNewsOutput["results"] = [];

  for (const category of categories) {
    const articles = await client.searchNews(category, fetchCount);
    const filtered = articles
      .filter(isAccessibleArticle)
      .map(processArticle);
    rawResults.push({ category, articles: filtered });
  }

  return { results: deduplicateResults(rawResults, count) };
}
