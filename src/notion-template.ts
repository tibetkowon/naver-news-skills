import { CategoryResult } from "./types.js";

export type TemplateName = "default";

/**
 * Convert structured article data into a markdown string for Notion page creation.
 * The template name determines the page layout. Defaults to "default".
 */
export function applyTemplate(
  categories: CategoryResult[],
  templateName: string = "default"
): string {
  switch (templateName) {
    case "default":
    default:
      return defaultTemplate(categories);
  }
}

function defaultTemplate(categories: CategoryResult[]): string {
  const parts: string[] = [];

  for (const { category, articles } of categories) {
    parts.push(`## ${category}`);
    parts.push("");

    for (const article of articles) {
      parts.push(`### ${article.title}`);
      parts.push("");
      if (article.description) {
        parts.push(article.description);
        parts.push("");
      }
      parts.push(`- 출처: ${article.link}`);
      if (article.originallink && article.originallink !== article.link) {
        parts.push(`- 원본: ${article.originallink}`);
      }
      parts.push(`- 날짜: ${article.pubDate}`);
      parts.push("");
      parts.push("---");
      parts.push("");
    }
  }

  return parts.join("\n").trim();
}
