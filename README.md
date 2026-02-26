# naver-news-skills

네이버 뉴스를 검색해 Notion 페이지에 정리해주는 AI 스킬입니다.
AI 에이전트(Claude 등)와 함께 사용하도록 설계되어 있습니다.

---

## 동작 흐름

```
사용자 → AI 에이전트
            ├─ 1. 뉴스 검색      → fetch-news CLI 호출
            ├─ 2. 기사 검토/선별  ← 에이전트 담당
            ├─ 3. Notion 페이지 작성 → create-notion-page CLI 호출
            └─ 4. 페이지 URL 반환  → 사용자에게 전달
```

---

## 사전 준비

### 1. 네이버 검색 API 키 발급

1. [네이버 개발자 센터](https://developers.naver.com) 접속
2. **Application 등록** → 사용 API에서 **검색** 선택
3. 발급된 **Client ID**와 **Client Secret** 메모

### 2. Notion 통합(Integration) 설정

1. [Notion My Integrations](https://www.notion.so/my-integrations) 접속
2. **새 통합 만들기** → 이름 입력 후 생성
3. 발급된 **Internal Integration Token** 메모
4. 뉴스를 저장할 Notion 페이지를 열고, 우측 상단 `...` → **연결** → 위에서 만든 통합 추가
5. 해당 페이지의 URL에서 Page ID 확인
   예: `https://notion.so/My-Page-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   → `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` 부분이 Page ID

### 3. Node.js 설치

Node.js 18 이상이 필요합니다.

```bash
node --version  # v18.x.x 이상이어야 함
```

---

## 설치

```bash
git clone <repository-url>
cd naver-news-skills
npm install
```

---

## 설정

```bash
cp config.example.json config.json
```

`config.json`을 열고 발급받은 키를 입력합니다:

```json
{
  "naver": {
    "client_id": "네이버_클라이언트_ID",
    "client_secret": "네이버_클라이언트_시크릿"
  },
  "notion": {
    "api_key": "secret_xxxxxxxxxxxxxxxxxxxx",
    "parent_page_id": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  },
  "news": {
    "categories": ["AI", "경제", "기술"],
    "count_per_category": 5
  }
}
```

| 항목 | 설명 |
|---|---|
| `naver.client_id` | 네이버 앱의 Client ID |
| `naver.client_secret` | 네이버 앱의 Client Secret |
| `notion.api_key` | Notion 통합 토큰 (`secret_` 으로 시작) |
| `notion.parent_page_id` | 뉴스 페이지를 만들 Notion 페이지 ID |
| `news.categories` | 기본 검색 키워드 목록 |
| `news.count_per_category` | 카테고리당 기사 수 (1–100) |

> `config.json`은 `.gitignore`에 포함되어 있어 실수로 커밋되지 않습니다.

---

## AI 에이전트와 함께 사용하기

이 프로젝트의 주요 사용 방식입니다. Claude 같은 AI 에이전트에게 아래와 같이 요청하면 됩니다.

**기본 사용 예:**
```
"오늘 AI랑 경제 뉴스 요약해서 Notion에 정리해줘"
```

**카테고리 지정:**
```
"반도체, 부동산 뉴스 각각 3개씩 Notion에 정리해줘"
```

에이전트는 `SKILL.md`를 읽고 CLI 도구를 직접 호출합니다. 별도 설정 없이 `config.json`의 값이 자동으로 사용됩니다.

---

## 직접 CLI로 사용하기

### 뉴스 검색

```bash
# config.json 기본값 사용
node dist/cli/fetch-news.js

# 카테고리와 수량 지정
node dist/cli/fetch-news.js --categories "AI,반도체" --count 3
```

**출력 예시:**
```json
{
  "results": [
    {
      "category": "AI",
      "meta": { "total": 4520, "lastBuildDate": "...", "start": 1, "display": 3 },
      "articles": [
        {
          "title": "GPT-5 출시 임박",
          "link": "https://news.naver.com/...",
          "originallink": "https://techcrunch.com/...",
          "description": "OpenAI가 다음 달 GPT-5를 공개할 예정이라고...",
          "pubDate": "Mon, 23 Feb 2026 10:00:00 +0900"
        }
      ]
    }
  ]
}
```

### Notion 페이지 생성

fetch-news 결과를 JSON으로 그대로 넘기거나, 직접 구성한 JSON을 stdin으로 전달합니다.

```bash
# fetch-news 결과를 파일에 저장했다가 넘기기
node dist/cli/fetch-news.js --categories "AI" --count 3 > articles.json

# articles.json에서 categories 배열을 꺼내 title과 함께 전달
node -e "
  const d = JSON.parse(require('fs').readFileSync('articles.json'));
  process.stdout.write(JSON.stringify({ title: '뉴스 요약 – 2026-02-26', categories: d.results }));
" | node dist/cli/create-notion-page.js
```

**출력 예시:**
```json
{
  "page_url": "https://notion.so/뉴스-요약-2026-02-26-xxxxxxxx",
  "page_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

생성된 Notion 페이지는 다음 형식으로 작성됩니다:

```
## AI

### GPT-5 출시 임박
OpenAI가 다음 달 GPT-5를 공개할 예정이라고...

- 출처: https://news.naver.com/...
- 원본: https://techcrunch.com/...
- 날짜: Mon, 23 Feb 2026 10:00:00 +0900

---
```

---

## 개발

```bash
npm run build      # TypeScript 빌드
npm test           # 전체 테스트 실행
npm run typecheck  # 타입 검사만 실행

# 빌드 없이 바로 실행 (개발용)
npm run dev:fetch  -- --categories "AI" --count 3
```

---

## 프로젝트 구조

```
naver-news-skills/
├── src/
│   ├── cli/
│   │   ├── fetch-news.ts          # fetch-news CLI 진입점
│   │   └── create-notion-page.ts  # create-notion-page CLI 진입점
│   ├── tools/
│   │   ├── fetch-news.ts          # 뉴스 검색 로직 (중복 제거 + 보충)
│   │   └── create-notion-page.ts  # Notion 페이지 생성 로직
│   ├── notion-template.ts         # 템플릿 관리 (기사 데이터 → Notion 블록)
│   ├── naver-client.ts            # 네이버 검색 API 클라이언트
│   ├── notion-client.ts           # Notion API 클라이언트
│   ├── config.ts                  # config.json 로딩 및 검증
│   └── types.ts                   # TypeScript 타입 정의
├── tests/                         # 테스트 파일
├── dist/                          # 빌드 결과물 (pre-built)
├── config.example.json            # 설정 파일 템플릿
├── config.json                    # 실제 설정 (git 제외)
├── SKILL.md                       # AI 에이전트용 사용 가이드
└── CLAUDE.md                      # 개발자용 AI 지침
```

---

## 문제 해결

| 오류 메시지 | 원인 | 해결 |
|---|---|---|
| `authentication failed` | API 키 오류 | `config.json`의 키 값 재확인 |
| `rate limit exceeded` | API 호출 한도 초과 | 잠시 후 재시도. 네이버 기본 한도: 25,000회/일 |
| `not found` (Notion) | 잘못된 `parent_page_id` 또는 통합 미연결 | Notion 페이지에 통합이 연결되어 있는지 확인 |
| `Invalid category` | 카테고리에 특수문자만 포함 | 한글/영문/숫자로 된 키워드 사용 |
| `Invalid JSON input` | stdin JSON 형식 오류 | `{ title, categories }` 형식인지 확인 |
