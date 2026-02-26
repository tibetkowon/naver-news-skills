import { describe, it, expect, vi, beforeEach } from "vitest";
import { NaverClient } from "../src/naver-client.js";

const mockConfig = {
  client_id: "test-client-id",
  client_secret: "test-client-secret",
};

function makeApiResponse(items = [mockItem], extra = {}) {
  return {
    ok: true,
    json: async () => ({
      lastBuildDate: "Mon, 23 Feb 2026 10:00:00 +0900",
      total: 100,
      start: 1,
      display: items.length,
      items,
      ...extra,
    }),
  };
}

const mockItem = {
  title: "Test Title",
  link: "https://example.com/1",
  originallink: "https://orig.com/1",
  description: "Test description",
  pubDate: "Mon, 23 Feb 2026 10:00:00 +0900",
};

describe("NaverClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns articles with HTML stripped from title and description", async () => {
    const htmlItem = {
      title: "<b>AI</b> 뉴스",
      link: "https://example.com/1",
      originallink: "https://orig.com/1",
      description: "설명 &amp; <em>강조</em>",
      pubDate: "Mon, 23 Feb 2026 10:00:00 +0900",
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(makeApiResponse([htmlItem]))
    );

    const client = new NaverClient(mockConfig);
    const { articles } = await client.searchNews("AI", 1);

    expect(articles).toHaveLength(1);
    expect(articles[0].title).toBe("AI 뉴스");
    expect(articles[0].description).toBe("설명 & 강조");
  });

  it("returns meta with lastBuildDate, total, start, display", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          lastBuildDate: "Mon, 23 Feb 2026 10:00:00 +0900",
          total: 42,
          start: 1,
          display: 1,
          items: [mockItem],
        }),
      })
    );

    const client = new NaverClient(mockConfig);
    const { meta } = await client.searchNews("AI", 1);

    expect(meta.total).toBe(42);
    expect(meta.lastBuildDate).toBe("Mon, 23 Feb 2026 10:00:00 +0900");
    expect(meta.start).toBe(1);
    expect(meta.display).toBe(1);
  });

  it("sends correct Naver API headers", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        lastBuildDate: "",
        total: 0,
        start: 1,
        display: 0,
        items: [],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = new NaverClient(mockConfig);
    await client.searchNews("technology", 5);

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("query=technology");
    expect(url).toContain("display=5");
    expect(url).toContain("start=1");
    expect((options.headers as Record<string, string>)["X-Naver-Client-Id"]).toBe(
      "test-client-id"
    );
    expect(
      (options.headers as Record<string, string>)["X-Naver-Client-Secret"]
    ).toBe("test-client-secret");
  });

  it("includes start parameter in URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        lastBuildDate: "",
        total: 0,
        start: 11,
        display: 0,
        items: [],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = new NaverClient(mockConfig);
    await client.searchNews("AI", 5, 11);

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain("start=11");
  });

  it("clamps display to 100 max", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        lastBuildDate: "",
        total: 0,
        start: 1,
        display: 0,
        items: [],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = new NaverClient(mockConfig);
    await client.searchNews("economy", 999);

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain("display=100");
  });

  it("throws on 401 authentication error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => "Unauthorized",
      })
    );

    const client = new NaverClient(mockConfig);
    await expect(client.searchNews("AI", 5)).rejects.toThrow(
      "authentication failed"
    );
  });

  it("throws on 429 rate limit error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => "Too Many Requests",
      })
    );

    const client = new NaverClient(mockConfig);
    await expect(client.searchNews("AI", 5)).rejects.toThrow("rate limit");
  });

  it("throws on network failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("ECONNREFUSED"))
    );

    const client = new NaverClient(mockConfig);
    await expect(client.searchNews("AI", 5)).rejects.toThrow("Network error");
  });

  it("throws on invalid category that becomes empty after sanitization", async () => {
    const client = new NaverClient(mockConfig);
    // "!!!" contains no word/hangul characters, sanitizes to empty string
    await expect(client.searchNews("!!!", 5)).rejects.toThrow(
      "Invalid category"
    );
  });

  it("filters out non-Korean articles when onlyKorean is true", async () => {
    const mixedItems = [
      {
        title: "Korean News 한국 뉴스",
        link: "https://example.com/ko",
        originallink: "https://orig.com/ko",
        description: "한국어 설명",
        pubDate: "Mon, 23 Feb 2026 10:00:00 +0900",
      },
      {
        title: "English News only",
        link: "https://example.com/en",
        originallink: "https://orig.com/en",
        description: "English description only",
        pubDate: "Mon, 23 Feb 2026 10:00:00 +0900",
      },
    ];

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(makeApiResponse(mixedItems))
    );

    const client = new NaverClient(mockConfig);
    const { articles } = await client.searchNews("AI", 10, 1, true);

    expect(articles).toHaveLength(1);
    expect(articles[0].title).toContain("한국 뉴스");
  });
});
