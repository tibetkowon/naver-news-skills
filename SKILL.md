# SKILL.md — naver-news-skills

This document describes how to use the `naver-news-skills` CLI as an AI agent.

---

## Overview

Single CLI script that handles everything end-to-end:

```
node dist/cli/news-to-notion.js [--categories "AI,경제"] [--count 5] [--title "..."]
```

1. Fetches news from the Naver Search API (one request per category)
2. Applies the built-in template to format the articles
3. Creates a Notion page and returns the URL

**No intermediate steps required.** You call one command and get back a page URL.

---

## Requirements

- Node.js >= 18
- `dist/` is pre-built and committed — no build step needed
- `config.json` must exist in the project root with valid credentials

---

## Workflow

```
1. Read config.json — if missing fields, prompt user and save before proceeding
2. Run: node dist/cli/news-to-notion.js [args]
3. Return the page_url to the user
```

---

## Configuration

`config.json` schema:

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
    "count_per_category": 5
  }
}
```

All fields are required. On first run or when fields are missing, prompt the user for each value and write them to `config.json`.

---

## Tool: `node dist/cli/news-to-notion.js`

All arguments are optional. Defaults come from `config.json`.

| Argument | Description |
|---|---|
| `--categories "A,B,C"` | Comma-separated search keywords. Overrides `news.categories`. |
| `--count N` | Articles per category (1–100). Overrides `news.count_per_category`. |
| `--title "..."` | Notion page title. Auto-generated as `뉴스 요약 – YYYY-MM-DD` if omitted. |

**Output (stdout):**
```json
{"page_url":"https://notion.so/...","page_id":"xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"}
```

**Error (stderr):**
```json
{"error":"error message here"}
```

**Examples:**
```bash
# Use all config defaults
node dist/cli/news-to-notion.js

# Specify categories and article count
node dist/cli/news-to-notion.js --categories "AI,반도체,경제" --count 5

# Custom page title
node dist/cli/news-to-notion.js --categories "AI" --count 3 --title "AI 뉴스 – 2월 4주차"
```

---

## Notion Page Format

The skill automatically formats the Notion page as follows:

```
## {category}

### {article title}
{article description}

- 출처: {link}
- 원본: {originallink}   ← only when different from link
- 날짜: {pubDate}

---

(repeated for each article and category)
```

---

## Error Handling

| Error contains | Cause | Action |
|---|---|---|
| `client_id` / `client_secret` missing | No Naver credentials | Prompt user, update `config.json`, retry |
| `api_key` / `parent_page_id` missing | No Notion credentials | Prompt user, update `config.json`, retry |
| `authentication failed` | Invalid API key | Ask user to re-enter the credential |
| `rate limit exceeded` | API quota hit | Inform user; suggest retrying shortly |
| `not found` (Notion) | Wrong `parent_page_id` or integration not connected | Ask user to verify page ID and integration |
| `Invalid category` | Category string has no usable characters | Ask user for a plain keyword (Korean/English/numbers) |
| `Network error` | Connectivity issue | Inform user; do not retry more than once |

---

## Full Example Session

```
User: "오늘 AI랑 경제 뉴스 정리해서 Notion에 올려줘"

Agent:
  1. Verify config.json exists and all fields are present
  2. Run: node dist/cli/news-to-notion.js --categories "AI,경제" --count 5
  3. Receive: {"page_url":"https://notion.so/...","page_id":"..."}
  4. Reply: "완료됐습니다! Notion 페이지에서 확인하세요: https://notion.so/..."
```

---

## Source Files (for reference)

| File | Purpose |
|---|---|
| `src/cli/news-to-notion.ts` | CLI entry point |
| `src/tools/news-to-notion.ts` | Orchestrates fetch → template → create page |
| `src/tools/fetch-news.ts` | Naver news fetching with dedup + replacement |
| `src/tools/create-notion-page.ts` | Notion page creation via template |
| `src/notion-template.ts` | Template: converts article data to Notion blocks |
| `src/naver-client.ts` | Naver Search API HTTP client |
| `src/notion-client.ts` | Notion API HTTP client |
| `src/config.ts` | Config loading and validation |
| `src/types.ts` | TypeScript type definitions |
