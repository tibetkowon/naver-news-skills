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

function getCategoryEmoji(category: string): string {
  const map: Record<string, string> = {
    AI: "🤖",
    인공지능: "🤖",
    경제: "💰",
    금융: "🏦",
    증권: "📈",
    IT: "💻",
    기술: "🛠️",
    테크: "🧪",
    정치: "⚖️",
    사회: "👥",
    세계: "🌐",
    생활: "🏠",
    문화: "🎨",
    연예: "🎬",
    스포츠: "⚽",
    반도체: "📟",
    부동산: "🏢",
    주식: "📊",
    비트코인: "🪙",
    코인: "🪙",
    가상화폐: "🪙",
  };

  const clean = category.toUpperCase().trim();
  for (const [key, emoji] of Object.entries(map)) {
    if (clean.includes(key.toUpperCase())) return emoji;
  }
  return "📰";
}

function formatDate(pubDate: string): string {
  try {
    const date = new Date(pubDate);
    if (isNaN(date.getTime())) return pubDate;

    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");

    return `${y}-${m}-${d} ${hh}:${mm}`;
  } catch {
    return pubDate;
  }
}

function defaultTemplate(categories: CategoryResult[]): string {
  const parts: string[] = [];

  for (const { category, articles } of categories) {
    const emoji = getCategoryEmoji(category);
    parts.push(`## ${emoji} ${category}`);
    parts.push("");

    for (const article of articles) {
      // Use Markdown link syntax for title hyperlink
      parts.push(`### [${article.title}](${article.link})`);
      parts.push(`📅 ${formatDate(article.pubDate)}`);
      
      if (article.description) {
        parts.push(article.description);
        parts.push("");
      }

      parts.push(`- 출처: ${article.link}`);
      if (article.originallink && article.originallink !== article.link) {
        parts.push(`- 원본: ${article.originallink}`);
      }
      parts.push("");
      parts.push("---");
      parts.push("");
    }
  }

  return parts.join("\n").trim();
}
