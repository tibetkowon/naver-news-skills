import { describe, it, expect, vi, beforeEach } from "vitest";
import { newsToNotion } from "../../src/tools/news-to-notion.js";
import { AppConfig } from "../../src/types.js";

const mockConfig: AppConfig = {
  naver: { client_id: "id", client_secret: "secret" },
  notion: { api_key: "key", parent_page_id: "parent-123" },
  news: { categories: ["AI", "economy"], count_per_category: 2 },
};

// Each category uses distinct article links to avoid cross-category dedup refetch
const naverResponseFor = (prefix: string) => ({
  ok: true,
  json: async () => ({
    lastBuildDate: "Mon, 23 Feb 2026 10:00:00 +0900",
    total: 10,
    start: 1,
    display: 2,
    items: [
      {
        title: `${prefix} 기사 1`,
        link: `https://news.naver.com/${prefix}/1`,
        originallink: `https://orig.com/${prefix}/1`,
        description: `${prefix} 설명 1`,
        pubDate: "Mon, 23 Feb 2026 10:00:00 +0900",
      },
      {
        title: `${prefix} 기사 2`,
        link: `https://news.naver.com/${prefix}/2`,
        originallink: `https://orig.com/${prefix}/2`,
        description: `${prefix} 설명 2`,
        pubDate: "Mon, 23 Feb 2026 09:00:00 +0900",
      },
    ],
  }),
});

const mockNotionResponse = {
  ok: true,
  json: async () => ({
    id: "new-page-id",
    url: "https://notion.so/new-page-id",
  }),
};

describe("newsToNotion tool", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns page_url and page_id", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce(naverResponseFor("ai"))
        .mockResolvedValueOnce(naverResponseFor("eco"))
        .mockResolvedValueOnce(mockNotionResponse)
        .mockResolvedValueOnce(mockNotionResponse)
    );

    const result = await newsToNotion({}, mockConfig);

    expect(result.page_url).toBe("https://notion.so/new-page-id");
    expect(result.page_id).toBe("new-page-id");
  });

  it("auto-generates title as '뉴스 요약 – YYYY-MM-DD' when title is not provided", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(naverResponseFor("ai"))
      .mockResolvedValueOnce(naverResponseFor("eco"))
      .mockResolvedValueOnce(mockNotionResponse)
      .mockResolvedValueOnce(mockNotionResponse);
    vi.stubGlobal("fetch", fetchMock);

    await newsToNotion({}, mockConfig);

    const createPageCall = fetchMock.mock.calls.find(([url]: [string]) =>
      url.includes("/pages")
    ) as [string, RequestInit] | undefined;
    expect(createPageCall).toBeDefined();

    const body = JSON.parse(createPageCall![1].body as string) as Record<string, unknown>;
    const titleProp = (body["properties"] as Record<string, unknown>)["title"] as Record<string, unknown>;
    const richText = titleProp["title"] as Array<Record<string, unknown>>;
    const textContent = (richText[0]["text"] as Record<string, unknown>)["content"] as string;

    expect(textContent).toMatch(/^뉴스 요약 – \d{4}-\d{2}-\d{2}$/);
  });

  it("uses provided title when specified", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(naverResponseFor("ai"))
      .mockResolvedValueOnce(naverResponseFor("eco"))
      .mockResolvedValueOnce(mockNotionResponse)
      .mockResolvedValueOnce(mockNotionResponse);
    vi.stubGlobal("fetch", fetchMock);

    await newsToNotion({ title: "커스텀 제목" }, mockConfig);

    const createPageCall = fetchMock.mock.calls.find(([url]: [string]) =>
      url.includes("/pages")
    ) as [string, RequestInit] | undefined;
    const body = JSON.parse(createPageCall![1].body as string) as Record<string, unknown>;
    const titleProp = (body["properties"] as Record<string, unknown>)["title"] as Record<string, unknown>;
    const richText = titleProp["title"] as Array<Record<string, unknown>>;
    const textContent = (richText[0]["text"] as Record<string, unknown>)["content"] as string;

    expect(textContent).toBe("커스텀 제목");
  });

  it("passes categories override to Naver API", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(naverResponseFor("semi"))
      .mockResolvedValueOnce(mockNotionResponse)
      .mockResolvedValueOnce(mockNotionResponse);
    vi.stubGlobal("fetch", fetchMock);

    await newsToNotion({ categories: ["반도체"] }, mockConfig);

    const naverCall = fetchMock.mock.calls[0] as [string];
    expect(naverCall[0]).toContain("query=%EB%B0%98%EB%8F%84%EC%B2%B4"); // "반도체" URL-encoded
  });

  it("passes count_per_category override to Naver API", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(naverResponseFor("ai"))
      .mockResolvedValueOnce(naverResponseFor("eco"))
      .mockResolvedValueOnce(mockNotionResponse)
      .mockResolvedValueOnce(mockNotionResponse);
    vi.stubGlobal("fetch", fetchMock);

    await newsToNotion({ count_per_category: 7 }, mockConfig);

    const naverCall = fetchMock.mock.calls[0] as [string];
    expect(naverCall[0]).toContain("display=7");
  });

  it("propagates Naver API errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => "Unauthorized",
      })
    );

    await expect(newsToNotion({}, mockConfig)).rejects.toThrow("authentication failed");
  });

  it("propagates Notion API errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce(naverResponseFor("ai"))
        .mockResolvedValueOnce(naverResponseFor("eco"))
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: async () => ({ message: "Unauthorized" }),
        })
    );

    await expect(newsToNotion({}, mockConfig)).rejects.toThrow("authentication failed");
  });
});
