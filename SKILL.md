# SKILL.md — naver-news-skills MCP Server

This document describes how to use the `naver-news-skills` MCP server as an AI agent.

---

## Overview

This MCP server exposes two tools that work together in a news summarization workflow:

1. **`fetch_news`** — Fetches news articles from the Naver Search API by category
2. **`create_notion_page`** — Creates a Notion page with the provided content and returns its URL

You (the agent) are responsible for summarizing and editing the articles between these two steps. The tools handle all API communication, HTML stripping, and data formatting.

---

## End-to-End Workflow

```
1. (Optional) Read config.json — verify or prompt user for missing credentials
2. Call fetch_news(categories?, count_per_category?)
3. Summarize and edit the returned articles  ← YOUR responsibility
4. Call create_notion_page(title, content)
5. Return the Notion page URL to the user
```

---

## Configuration

The server reads from `config.json` in the project root. If it is missing or incomplete, the server will throw an error before any tool runs.

**Schema:**
```json
{
  "naver": {
    "client_id": "string",
    "client_secret": "string"
  },
  "notion": {
    "api_key": "string",
    "parent_page_id": "string"
  },
  "news": {
    "categories": ["string"],
    "count_per_category": 1
  }
}
```

**On first run or missing config**, prompt the user for each missing value and write them to `config.json` before calling any tool.

---

## Tool Reference

### `fetch_news`

Fetches articles from the Naver Search API for one or more categories.

**Input parameters** (all optional — defaults come from `config.json`):

| Parameter | Type | Description |
|---|---|---|
| `categories` | `string[]` | Keywords to search. Overrides `news.categories` in config. |
| `count_per_category` | `number` (1–100) | Articles per category. Overrides `news.count_per_category` in config. |

**Output:**
```json
{
  "results": [
    {
      "category": "AI",
      "articles": [
        {
          "title": "Article title (HTML stripped)",
          "link": "https://news.naver.com/...",
          "originallink": "https://original-source.com/...",
          "description": "Short description (HTML stripped)",
          "pubDate": "Mon, 23 Feb 2026 10:00:00 +0900"
        }
      ]
    }
  ]
}
```

**Notes:**
- HTML tags and common HTML entities are stripped from `title` and `description`.
- Results are sorted by recency (`sort=date`).
- Category strings containing only special characters (e.g. `"!!!"`) are rejected with an error.

**Example call:**
```json
{
  "tool": "fetch_news",
  "input": {
    "categories": ["AI", "economy"],
    "count_per_category": 5
  }
}
```

---

### `create_notion_page`

Creates a new Notion page under the configured parent page and writes the provided content as blocks.

**Input parameters** (all required):

| Parameter | Type | Description |
|---|---|---|
| `title` | `string` | Page title. Whitespace is trimmed. Cannot be empty. |
| `content` | `string` | Page body. Supports Markdown-style headings and lists (see below). Cannot be empty. |

**Supported Markdown syntax in `content`:**

| Syntax | Notion Block Type |
|---|---|
| `# Heading` | `heading_1` |
| `## Heading` | `heading_2` |
| `### Heading` | `heading_3` |
| `- item` or `* item` | `bulleted_list_item` |
| Any other line | `paragraph` |

**Output:**
```json
{
  "page_url": "https://notion.so/...",
  "page_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

**Notes:**
- Content is automatically split into chunks of 100 blocks to comply with the Notion API limit.
- Rich text elements are split at 2000 characters each (Notion limit).
- The created page is a child of `notion.parent_page_id` in config.

**Example call:**
```json
{
  "tool": "create_notion_page",
  "input": {
    "title": "News Summary – 2026-02-23",
    "content": "# AI\n\n- Article 1: ...\n- Article 2: ...\n\n# Economy\n\n- Article 1: ..."
  }
}
```

---

## Recommended Content Format

When writing the `content` argument for `create_notion_page`, structure it like this for readability:

```
# {Category Name}

## {Article Title}
{1–3 sentence summary}
Source: {link}
Published: {pubDate}

## {Article Title}
...

# {Next Category}
...
```

---

## Error Handling

If a tool returns an error, interpret it as follows and take appropriate action:

| Error message contains | Meaning | Action |
|---|---|---|
| `client_id` / `client_secret` / `api_key` / `parent_page_id` | Missing config field | Prompt user for the value, update `config.json`, retry |
| `authentication failed` | Invalid API key | Ask the user to verify and re-enter the credential |
| `rate limit exceeded` | API quota hit | Inform the user; suggest retrying after a short wait |
| `not found` (Notion) | Wrong `parent_page_id` or missing integration permission | Ask the user to verify the page ID and that the integration is connected |
| `Invalid category` | Category string has no valid characters after sanitization | Ask the user to use a plain keyword (letters/numbers/Korean only) |
| `Network error` | Connectivity issue | Inform the user; do not retry automatically more than once |

---

## Full Example Session

```
User: "오늘 AI랑 경제 뉴스 요약해서 Notion에 정리해줘"

Agent:
  1. Call fetch_news({ categories: ["AI", "경제"], count_per_category: 5 })
  2. Receive 10 articles (5 per category)
  3. Summarize each article in 2–3 sentences (in Korean, matching user's language)
  4. Build content string with Markdown structure
  5. Call create_notion_page({
       title: "뉴스 요약 – 2026-02-23",
       content: "# AI\n\n## 제목1\n요약...\n..."
     })
  6. Receive { page_url: "https://notion.so/...", page_id: "..." }
  7. Reply: "요약이 완료됐습니다. Notion 페이지에서 확인하세요: https://notion.so/..."
```

---

## Source Files (for reference)

| File | Purpose |
|---|---|
| `src/tools/fetch-news.ts` | `fetch_news` tool logic |
| `src/tools/create-notion-page.ts` | `create_notion_page` tool logic |
| `src/naver-client.ts` | Naver Search API HTTP client |
| `src/notion-client.ts` | Notion API HTTP client |
| `src/config.ts` | Config loading and validation |
| `src/types.ts` | All TypeScript types |
