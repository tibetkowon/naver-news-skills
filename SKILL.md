# SKILL.md — naver-news-skills CLI

This document describes how to use the `naver-news-skills` CLI tools as an AI agent.

---

## Overview

Two CLI scripts that handle all API calls, returning pre-processed, token-minimal JSON:

1. `node dist/cli/fetch-news.js` — Fetches news from Naver Search API
2. `node dist/cli/create-notion-page.js` — Creates a Notion page with content

You (the agent) are responsible for summarizing and editing the articles between these two steps.

---

## Requirements

- Node.js >= 18
- No installation needed — `dist/` is pre-built and committed to the repository

---

## End-to-End Workflow

```
1. (Optional) Read config.json — verify or prompt user for missing credentials
2. node dist/cli/fetch-news.js [--categories "AI,경제"] [--count 5]
3. Summarize and edit the returned articles  ← YOUR responsibility
4. echo "<summary>" | node dist/cli/create-notion-page.js --title "뉴스 요약 – 2026-02-23"
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

Fetches articles from the Naver Search API. Pre-processes results to minimize tokens.

**Arguments** (all optional — defaults come from `config.json`):

| Argument | Description |
|---|---|
| `--categories "A,B,C"` | Comma-separated keywords. Overrides `news.categories` in config. |
| `--count N` | Articles per category (1–100). Overrides `news.count_per_category` in config. |

**Output (stdout):** compact JSON

```json
{"results":[{"category":"AI","articles":[{"title":"Article title","link":"https://news.naver.com/...","originallink":"https://original-source.com/...","description":"Short description (max 200 chars)…","pubDate":"2026-02-23"}]}]}
```

**Token reduction applied automatically:**
- `description` truncated to 200 characters
- `pubDate` shortened to `YYYY-MM-DD`
- `originallink` omitted when identical to `link`
- Duplicate articles (same `link`) removed across categories

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

Creates a new Notion page and writes the provided content as blocks. Reads content from **stdin**.

**Arguments:**

| Argument | Required | Description |
|---|---|---|
| `--title "..."` | Yes | Page title. Whitespace is trimmed. |

**Input (stdin):** page body as Markdown-style text

**Supported Markdown syntax:**

| Syntax | Notion Block Type |
|---|---|
| `# Heading` | `heading_1` |
| `## Heading` | `heading_2` |
| `### Heading` | `heading_3` |
| `- item` or `* item` | `bulleted_list_item` |
| Any other line | `paragraph` |

**Output (stdout):**
```json
{"page_url":"https://notion.so/...","page_id":"xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"}
```

**On error (stderr):**
```json
{"error":"error message here"}
```

**Examples:**
```bash
# Pipe content from a variable
echo "# AI\n\n- Article 1 summary\n- Article 2 summary" | \
  node dist/cli/create-notion-page.js --title "뉴스 요약 – 2026-02-23"

# Pipe from a file
cat summary.md | node dist/cli/create-notion-page.js --title "뉴스 요약"
```

---

## Recommended Content Format

When building the content for `create-notion-page`, structure it like this:

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
  1. Run: node dist/cli/fetch-news.js --categories "AI,경제" --count 5
  2. Receive compact JSON with 10 articles (5 per category, pre-processed)
  3. Summarize each article in 2–3 sentences (in Korean)
  4. Build Markdown content string
  5. Run: echo "<content>" | node dist/cli/create-notion-page.js --title "뉴스 요약 – 2026-02-23"
  6. Receive { "page_url": "https://notion.so/...", "page_id": "..." }
  7. Reply: "요약이 완료됐습니다. Notion 페이지에서 확인하세요: https://notion.so/..."
```

---

## Source Files (for reference)

| File | Purpose |
|---|---|
| `src/cli/fetch-news.ts` | CLI entry point for fetch_news |
| `src/cli/create-notion-page.ts` | CLI entry point for create_notion_page |
| `src/tools/fetch-news.ts` | fetch_news logic + token reduction |
| `src/tools/create-notion-page.ts` | create_notion_page logic |
| `src/naver-client.ts` | Naver Search API HTTP client |
| `src/notion-client.ts` | Notion API HTTP client |
| `src/config.ts` | Config loading and validation |
| `src/types.ts` | All TypeScript types |
