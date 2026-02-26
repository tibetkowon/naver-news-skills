import { fetchNews } from "./fetch-news.js";
import { createNotionPage } from "./create-notion-page.js";
import {
  AppConfig,
  NewsToNotionInput,
  NewsToNotionOutput,
} from "../types.js";

function buildTitle(input: NewsToNotionInput): string {
  if (input.title?.trim()) return input.title.trim();
  return `뉴스 요약 – ${new Date().toISOString().slice(0, 10)}`;
}

export async function newsToNotion(
  input: NewsToNotionInput,
  config: AppConfig
): Promise<NewsToNotionOutput> {
  const { results } = await fetchNews(
    {
      categories: input.categories,
      count_per_category: input.count_per_category,
    },
    config
  );

  return createNotionPage(
    {
      title: buildTitle(input),
      categories: results,
      template: input.template,
    },
    config
  );
}
