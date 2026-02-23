# CLAUDE.md

This file provides guidance to AI assistants (Claude and others) when working with this repository.

## Project Overview

**naver-news-skills** is a project for integrating Naver News into skill-based or agent workflows. It is intended to provide structured access to Naver's news content (articles, topics, categories) through a programmatic interface suitable for use as an AI assistant skill, MCP server, or API wrapper.

> **Note:** This repository is in initial setup. Update this file as the codebase grows.

---

## Repository State

This repository is currently empty. The first step is to establish the project structure. Likely candidates based on the project name:

- A Node.js/TypeScript MCP (Model Context Protocol) server exposing Naver News tools
- A Python service wrapping the Naver News API
- A CLI tool for fetching and summarizing Naver News content

Confirm the intended stack with the project owner before starting implementation.

---

## Development Setup

Once files are added, document the setup here. Expected sections:

### Prerequisites

- Node.js >= 18 (if TypeScript/JS) or Python >= 3.10 (if Python)
- A valid [Naver Developers](https://developers.naver.com) API key (Client ID + Client Secret)

### Environment Variables

```bash
NAVER_CLIENT_ID=your_client_id
NAVER_CLIENT_SECRET=your_client_secret
```

Store these in a `.env` file (never commit it). Add `.env` to `.gitignore`.

### Install Dependencies

```bash
# Node.js
npm install

# Python
pip install -r requirements.txt
```

### Run in Development

```bash
# Node.js
npm run dev

# Python
python -m naver_news_skills
```

---

## Build & Test

```bash
# Run tests
npm test         # or: pytest

# Lint
npm run lint     # or: ruff check .

# Type check
npm run typecheck  # or: mypy .

# Build (if compiled output is needed)
npm run build
```

All of the above should pass before merging any PR. Claude should run these commands after making changes and fix any failures.

---

## Project Structure (Expected)

```
naver-news-skills/
├── src/                   # Source code
│   ├── index.ts           # Entry point
│   ├── naver-client.ts    # Naver News API HTTP client
│   ├── tools/             # Individual skill/tool definitions
│   └── types.ts           # Shared TypeScript types
├── tests/                 # Unit and integration tests
├── .env.example           # Example environment variable file
├── .gitignore
├── package.json           # or pyproject.toml / requirements.txt
├── tsconfig.json          # (TypeScript projects)
├── CLAUDE.md              # This file
└── README.md
```

Update this section to match the actual structure once files are added.

---

## Key Conventions

### Git Workflow

- Feature branches must be named `claude/<description>-<session-id>`
- Never push directly to `main` or `master`
- Write clear, imperative commit messages: `Add Naver News search tool`, `Fix pagination bug in article listing`
- One logical change per commit

### Code Style

- **TypeScript**: Use strict mode (`"strict": true` in tsconfig). Prefer `const`, avoid `any`.
- **Python**: Follow PEP 8. Use type hints. Format with `black` or `ruff`.
- Keep functions small and single-purpose.
- Avoid hardcoding API endpoints or credentials — use constants or environment variables.

### API Integration Notes

- The Naver Search API base URL is `https://openapi.naver.com/v1/search/news.json`
- Required headers: `X-Naver-Client-Id` and `X-Naver-Client-Secret`
- Key query parameters: `query`, `display` (results per page, max 100), `start` (offset), `sort` (`sim` for relevance, `date` for recency)
- API responses are in JSON; articles include `title`, `link`, `description`, `pubDate`, `originallink`
- Strip HTML tags from `title` and `description` fields before displaying or passing to an LLM

### Error Handling

- Always handle HTTP errors from the Naver API gracefully (rate limits, auth errors, malformed queries)
- Log errors with enough context to debug, but never log raw API credentials
- Return structured error objects rather than throwing raw exceptions where possible

### Security

- Never commit `.env` files, API keys, or secrets
- Validate and sanitize all user-supplied search queries before forwarding to the Naver API
- Do not store or cache raw news content beyond the session unless explicitly required

---

## Naver News API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/v1/search/news.json` | GET | Search news articles by keyword |

**Rate limits**: Check the [Naver Developers dashboard](https://developers.naver.com) for your app's quota. Default is 25,000 requests/day.

---

## Common Tasks for Claude

- **Add a new tool/skill**: Create a file in `src/tools/`, define input/output types, register it in `src/index.ts`, and add tests in `tests/`
- **Update API client**: Edit `src/naver-client.ts` (or equivalent); update tests
- **Fix a bug**: Read the failing test or error message, trace to root cause, fix minimally, confirm tests pass
- **Refactor**: Only refactor when explicitly asked. Avoid restructuring unrelated code.

---

## Out of Scope

- Do not implement scraping of Naver pages not covered by the official API
- Do not add authentication flows beyond what the Naver API requires
- Do not store user data or news content persistently unless explicitly requested
