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

function escapeMarkdown(text: string): string {
  // Escape square brackets to avoid breaking markdown link syntax
  return text.replace(/\[/g, "\\[").replace(/\]/g, "\\]");
}

function defaultTemplate(categories: CategoryResult[]): string {
  const parts: string[] = [];

  for (const { category, articles } of categories) {
    const emoji = getCategoryEmoji(category);
    parts.push(`## ${emoji} ${category}`);
    parts.push("");

    for (const article of articles) {
      // Use Markdown link syntax for title hyperlink, escaping inner brackets
      const safeTitle = escapeMarkdown(article.title);
      parts.push(`### [${safeTitle}](${article.link})`);
      
      if (article.description) {
        parts.push(article.description);
      }

      parts.push("");
      parts.push("---");
      parts.push("");
    }
  }

  return parts.join("\n").trim();
}
