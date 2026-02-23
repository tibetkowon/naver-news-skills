# CLAUDE.md

This file provides guidance to AI assistants (Claude and others) when working with this repository.

---

## Project Overview

**naver-news-skills** is an AI skill (MCP server) that enables AI models to:

1. Collect news from Naver News via the Naver Search API
2. Summarize collected articles (handled by the AI model)
3. Write the summarized content to a Notion page
4. Return the Notion page URL to the user

The project acts as the **tool layer** in an AI workflow — the AI model orchestrates the overall task while this skill handles API calls and data formatting.

---

## End-to-End Workflow (Scenario)

```
User
 └─▶ AI Model
       ├─ [Step 1] Read config file; prompt user for any missing values and save them
       ├─ [Step 2] Call skill: fetch_news(categories, count)        ← skill
       ├─ [Step 3] Summarize and edit the returned articles          ← AI
       ├─ [Step 4] Call skill: create_notion_page(summary_content)  ← skill
       ├─ [Step 5] Return Notion page URL to user                    ← AI
       └─ [Step 6] User opens URL and reads news                     ← user
```

---

## Features

### News Collection
- Search news articles by keyword/category using the Naver Search API
- Support multiple interest categories in a single run
- Control the number of articles fetched per category
- Strip HTML tags from `title` and `description` before returning

### Notion Integration
- Create a new Notion page under a configured parent page
- Write structured news summaries as Notion blocks
- Return the URL of the created page

### Configuration Management
- All credentials and preferences are stored in a config file (`config.json`)
- On first run the AI model interactively collects missing values and persists them
- Config is never committed to version control

---

## Configuration File

Path: `config.json` (git-ignored)
Reference template: `config.example.json`

```json
{
  "naver": {
    "client_id": "YOUR_NAVER_CLIENT_ID",
    "client_secret": "YOUR_NAVER_CLIENT_SECRET"
  },
  "notion": {
    "api_key": "YOUR_NOTION_API_KEY",
    "parent_page_id": "YOUR_NOTION_PAGE_ID"
  },
  "news": {
    "categories": ["AI", "technology", "economy"],
    "count_per_category": 5
  }
}
```

### Field Descriptions

| Field | Description |
|---|---|
| `naver.client_id` | Naver Developers app Client ID |
| `naver.client_secret` | Naver Developers app Client Secret |
| `notion.api_key` | Notion integration API key |
| `notion.parent_page_id` | ID of the Notion page where news pages will be created |
| `news.categories` | List of topics/keywords to search |
| `news.count_per_category` | Number of articles to fetch per category (max 100) |

---

## Project Structure

```
naver-news-skills/
├── src/
│   ├── index.ts                  # MCP server entry point; registers all tools
│   ├── config.ts                 # Load and validate config.json
│   ├── naver-client.ts           # Naver Search API HTTP client
│   ├── notion-client.ts          # Notion API client (create page, append blocks)
│   ├── tools/
│   │   ├── fetch-news.ts         # Tool: fetch_news — search and return articles
│   │   └── create-notion-page.ts # Tool: create_notion_page — write summary to Notion
│   └── types.ts                  # Shared TypeScript types
├── tests/
│   ├── naver-client.test.ts
│   ├── notion-client.test.ts
│   └── tools/
│       ├── fetch-news.test.ts
│       └── create-notion-page.test.ts
├── config.example.json           # Example config (no real credentials)
├── config.json                   # Actual config — NEVER commit this
├── .gitignore
├── package.json
├── tsconfig.json
├── CLAUDE.md                     # This file
└── README.md
```

---

## Tool Definitions

### `fetch_news`

Fetches news articles from the Naver Search API for each configured category.

**Input**
```typescript
{
  categories?: string[];       // Override config categories (optional)
  count_per_category?: number; // Override config count (optional)
}
```

**Output**
```typescript
{
  results: Array<{
    category: string;
    articles: Array<{
      title: string;       // HTML stripped
      link: string;
      originallink: string;
      description: string; // HTML stripped
      pubDate: string;
    }>;
  }>;
}
```

---

### `create_notion_page`

Creates a Notion page under the configured parent page and writes the provided content.

**Input**
```typescript
{
  title: string;    // Page title (e.g. "News Summary – 2026-02-23")
  content: string;  // Markdown-style text; converted to Notion blocks
}
```

**Output**
```typescript
{
  page_url: string; // Public or internal URL of the created Notion page
  page_id: string;
}
```

---

## Development Setup

### Prerequisites

- Node.js >= 18
- A valid [Naver Developers](https://developers.naver.com) app (Client ID + Client Secret)
- A [Notion integration](https://www.notion.so/my-integrations) with write access to the target page

### Install Dependencies

```bash
npm install
```

### Configure

```bash
cp config.example.json config.json
# Edit config.json with your credentials and preferences
```

### Run in Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

---

## Build & Test

```bash
npm test          # Run all tests
npm run lint      # ESLint
npm run typecheck # TypeScript type checking
npm run build     # Compile TypeScript
```

All checks must pass before merging any PR. Fix all failures before committing.

---

## API References

### Naver Search API

| Endpoint | Method | Description |
|---|---|---|
| `https://openapi.naver.com/v1/search/news.json` | GET | Search news by keyword |

**Required headers**: `X-Naver-Client-Id`, `X-Naver-Client-Secret`

**Key query parameters**:
- `query`: search keyword
- `display`: number of results (1–100)
- `start`: pagination offset (1–1000)
- `sort`: `sim` (relevance) or `date` (recency)

**Rate limit**: 25,000 requests/day (default). Check your app quota on the Naver Developers dashboard.

### Notion API

| Endpoint | Method | Description |
|---|---|---|
| `https://api.notion.com/v1/pages` | POST | Create a new page |
| `https://api.notion.com/v1/blocks/{id}/children` | PATCH | Append blocks to a page |

**Required header**: `Authorization: Bearer YOUR_NOTION_API_KEY`
**API version header**: `Notion-Version: 2022-06-28`

---

## Key Conventions

### Git Workflow

- Feature branches must be named `claude/<description>-<session-id>`
- Never push directly to `main` or `master`
- Write clear, imperative commit messages: `Add fetch_news tool`, `Fix HTML stripping in Naver client`
- One logical change per commit

### Code Style

- TypeScript strict mode (`"strict": true` in tsconfig)
- Prefer `const`; avoid `any`
- Keep functions small and single-purpose
- Never hardcode credentials or API URLs — use `config.ts` and constants

### Error Handling

- Handle all HTTP errors from Naver and Notion APIs (auth errors, rate limits, invalid input)
- Log errors with context but never log raw credentials
- Return structured error objects; avoid throwing raw exceptions across tool boundaries

### Security

- `config.json` must be in `.gitignore` — never commit it
- Validate and sanitize all category strings before forwarding to the Naver API
- Do not cache or persist raw news content between sessions unless explicitly required

---

## Common Tasks for Claude

- **Add a new tool**: Create `src/tools/<tool-name>.ts`, define input/output types in `types.ts`, register in `src/index.ts`, add tests in `tests/tools/`
- **Update Naver client**: Edit `src/naver-client.ts` and update `tests/naver-client.test.ts`
- **Update Notion client**: Edit `src/notion-client.ts` and update `tests/notion-client.test.ts`
- **Change config schema**: Update `config.ts`, `config.example.json`, and this file's Configuration section
- **Fix a bug**: Read the failing test, trace to root cause, fix minimally, confirm all tests pass

---

## Notion Page Format

When calling `create_notion_page`, the AI model must use the following format for the `content` field.
The skill's markdown parser supports: `# h1`, `## h2`, `### h3`, `- bullet`, `---` divider, inline `[text](url)` links, and plain paragraphs.

### Template

```
## {카테고리명}

### {기사 제목}

{2–3줄 분량의 핵심 요약. 객관적 사실 위주로 작성.}

- 🔗 [원문 보기]({originallink 우선, 없으면 link})

---

### {다음 기사 제목}

{요약}

- 🔗 [원문 보기]({url})

---

## {다음 카테고리명}

### {기사 제목}
...
```

### Rules

| Element | Rule |
|---|---|
| Page title | `뉴스 요약 – YYYY-MM-DD` (오늘 날짜) |
| 카테고리 헤더 | `## {category}` — 카테고리당 H2 하나 |
| 기사 헤더 | `### {title}` — 기사 제목 그대로 H3 |
| 요약 | H3 바로 아래 빈 줄 + 2–3문장 평문 |
| 링크 | `- 🔗 [원문 보기]({url})` — `originallink` 우선, 없으면 `link` 사용 |
| 구분선 | 같은 카테고리 내 기사 사이에 `---` 삽입; 카테고리 마지막 기사 뒤에는 생략 |
| 빈 줄 | 각 요소(헤더·요약·링크) 사이에 빈 줄 한 줄 |

### Example

```
## AI

### OpenAI, GPT-5 공개 일정 발표

OpenAI가 다음 달 GPT-5를 공개한다고 밝혔다. 이번 모델은 추론 능력과 멀티모달 처리 성능이
크게 향상됐으며, 기업용 API는 출시 당일부터 제공될 예정이다.

- 🔗 [원문 보기](https://techcrunch.com/...)

---

### 삼성전자, AI 칩 자체 개발 가속화

삼성전자가 자체 AI 가속 칩 개발에 3조 원을 추가 투자한다고 발표했다. 엔비디아 의존도를
줄이기 위한 전략으로, 2026년 하반기 양산을 목표로 하고 있다.

- 🔗 [원문 보기](https://zdnet.co.kr/...)

## 경제

### 한국은행, 기준금리 동결 결정

한국은행 금융통화위원회가 기준금리를 현행 3.25%로 동결하기로 결정했다. 고물가와
경기 둔화 우려가 동시에 작용하면서 금리 조정을 유보한 것으로 풀이된다.

- 🔗 [원문 보기](https://news.mt.co.kr/...)
```

---

## Out of Scope

- No scraping of Naver pages outside the official Search API
- No user authentication beyond Naver and Notion API keys
- No persistent storage of news content across sessions
- No frontend UI — this is a headless skill/tool layer only
