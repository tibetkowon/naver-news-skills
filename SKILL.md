# SKILL.md — naver-news-skills CLI

This document describes how to use the `naver-news-skills` CLI tools as an AI agent.

---

## Overview

Two CLI scripts that handle all API calls:

1. `node dist/cli/fetch-news.js` — Fetches news from Naver Search API (raw API data)
2. `node dist/cli/create-notion-page.js` — Creates a Notion page from structured article data

You (the agent) are responsible for reviewing and optionally editing the articles between these two steps. Page formatting is handled automatically by the skill via a built-in template.

---

## Requirements

- Node.js >= 18
- No installation needed — `dist/` is pre-built and committed to the repository

---

## End-to-End Workflow

```
1. (Optional) Read config.json — verify or prompt user for missing credentials
2. node dist/cli/fetch-news.js [--categories "AI,경제"] [--count 5]
3. Review returned articles; select or edit titles/descriptions  ← YOUR responsibility
4. echo '<json>' | node dist/cli/create-notion-page.js
5. Return the Notion page URL to the user
```

---

## Configuration

The scripts read from `config.json` in the project root.

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

### `node dist/cli/fetch-news.js`

Fetches articles from the Naver Search API. Returns API data with minimal transformation (HTML tags stripped, all other fields returned as-is).

**Arguments** (all optional — defaults come from `config.json`):

| Argument | Description |
|---|---|
| `--categories "A,B,C"` | Comma-separated keywords. Overrides `news.categories` in config. |
| `--count N` | Articles per category (1–100). Overrides `news.count_per_category` in config. |

**Deduplication:** If the same article URL appears in multiple categories, it is automatically removed from later categories. If articles are removed due to duplication, additional API requests are made to fill the quota with fresh articles.

**Output (stdout):**

```json
{
  "results": [
    {
      "category": "AI",
      "meta": {
        "lastBuildDate": "Mon, 23 Feb 2026 10:00:00 +0900",
        "total": 4520,
        "start": 1,
        "display": 5
      },
      "articles": [
        {
          "title": "Article title",
          "link": "https://news.naver.com/...",
          "originallink": "https://original-source.com/...",
          "description": "Article description (full length, as returned by API)",
          "pubDate": "Mon, 23 Feb 2026 10:00:00 +0900"
        }
      ]
    }
  ]
}
```

**Field notes:**
- `meta` — Naver API response metadata for the category query
- `description` — full text (no truncation); HTML tags stripped
- `pubDate` — RFC 2822 format, exactly as returned by the Naver API
- `originallink` — original source URL; always included when returned by the API

**On error (stderr):**
```json
{"error":"error message here"}
```

**Examples:**
```bash
# Use config defaults
node dist/cli/fetch-news.js

# Override categories and count
node dist/cli/fetch-news.js --categories "AI,기술,경제" --count 5
```

---

### `node dist/cli/create-notion-page.js`

Creates a new Notion page from structured article data. Reads a JSON object from **stdin**.

The skill applies a built-in template to the article data and converts it to Notion blocks automatically — **you do not need to write any Markdown**.

**Input (stdin):** JSON with the following shape

```json
{
  "title": "뉴스 요약 – 2026-02-23",
  "categories": [
    {
      "category": "AI",
      "meta": { ... },
      "articles": [
        {
          "title": "Article title",
          "link": "https://...",
          "originallink": "https://...",
          "description": "Description text",
          "pubDate": "Mon, 23 Feb 2026 10:00:00 +0900"
        }
      ]
    }
  ],
  "template": "default"
}
```

| Field | Required | Description |
|---|---|---|
| `title` | Yes | Notion page title. Whitespace is trimmed. |
| `categories` | Yes | Array of category results (same shape as `fetch-news` output). |
| `template` | No | Template name. Currently only `"default"` is supported. Omit to use default. |

**Default template page structure:**

```
## {category}

### {article.title}
{article.description}

- 출처: {article.link}
- 원본: {article.originallink}   ← only when different from link
- 날짜: {article.pubDate}

---
```

**Output (stdout):**
```json
{"page_url":"https://notion.so/...","page_id":"xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"}
```

**On error (stderr):**
```json
{"error":"error message here"}
```

**Example:**
```bash
# Pass the full fetch-news result (optionally edited) to create-notion-page
node dist/cli/fetch-news.js --categories "AI,경제" --count 5 > articles.json

# Edit articles.json if needed, then:
cat articles.json | node -e "
  const fs = require('fs');
  const data = JSON.parse(fs.readFileSync('/dev/stdin', 'utf8'));
  process.stdout.write(JSON.stringify({
    title: '뉴스 요약 – 2026-02-23',
    categories: data.results
  }));
" | node dist/cli/create-notion-page.js
```

Or build the JSON inline:
```bash
echo '{"title":"뉴스 요약 – 2026-02-23","categories":[...]}' | \
  node dist/cli/create-notion-page.js
```

---

## Recommended Agent Workflow

```
1. Run fetch-news to get articles
2. Review each article's title and description
   - Remove articles that are off-topic or duplicate in content
   - You may edit titles or descriptions for clarity
   - Ensure count is reasonable per category
3. Build the JSON input:
   {
     "title": "뉴스 요약 – {today's date}",
     "categories": <filtered/edited results array from fetch-news>
   }
4. Pipe the JSON to create-notion-page
5. Return the page_url to the user
```

The `categories` field for `create-notion-page` accepts the same structure as `fetch-news` output (`results` array). You can pass it directly or after editing.

---

## Error Handling

| Error message contains | Meaning | Action |
|---|---|---|
| `client_id` / `client_secret` / `api_key` / `parent_page_id` | Missing config field | Prompt user for the value, update `config.json`, retry |
| `authentication failed` | Invalid API key | Ask the user to verify and re-enter the credential |
| `rate limit exceeded` | API quota hit | Inform the user; suggest retrying after a short wait |
| `not found` (Notion) | Wrong `parent_page_id` or missing integration permission | Ask the user to verify the page ID and that the integration is connected |
| `Invalid category` | Category string has no valid characters after sanitization | Ask the user to use a plain keyword (letters/numbers/Korean only) |
| `Invalid JSON input` | stdin was not valid JSON | Check the JSON structure matches the required schema |
| `Network error` | Connectivity issue | Inform the user; do not retry automatically more than once |

---

## Full Example Session

```
User: "오늘 AI랑 경제 뉴스 요약해서 Notion에 정리해줘"

Agent:
  1. Run: node dist/cli/fetch-news.js --categories "AI,경제" --count 5
  2. Receive JSON with articles (5 per category, full description, raw pubDate)
  3. Review articles — remove any off-topic items, optionally edit titles
  4. Run: echo '<json>' | node dist/cli/create-notion-page.js
     where <json> = { "title": "뉴스 요약 – 2026-02-26", "categories": <edited results> }
  5. Receive { "page_url": "https://notion.so/...", "page_id": "..." }
  6. Reply: "요약이 완료됐습니다. Notion 페이지에서 확인하세요: https://notion.so/..."
```

---

## Source Files (for reference)

| File | Purpose |
|---|---|
| `src/cli/fetch-news.ts` | CLI entry point for fetch_news |
| `src/cli/create-notion-page.ts` | CLI entry point for create_notion_page |
| `src/tools/fetch-news.ts` | fetch_news logic (dedup with replacement) |
| `src/tools/create-notion-page.ts` | create_notion_page logic (applies template) |
| `src/notion-template.ts` | Template system — converts article data to Notion blocks |
| `src/naver-client.ts` | Naver Search API HTTP client (with pagination support) |
| `src/notion-client.ts` | Notion API HTTP client |
| `src/config.ts` | Config loading and validation |
| `src/types.ts` | All TypeScript types |
