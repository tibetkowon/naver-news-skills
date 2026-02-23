import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchNews } from "../../src/tools/fetch-news.js";
import { AppConfig } from "../../src/types.js";

const mockConfig: AppConfig = {
  naver: { client_id: "id", client_secret: "secret" },
  notion: { api_key: "key", parent_page_id: "page" },
  news: { categories: ["AI", "economy"], count_per_category: 3 },
};

const mockArticle = {
  title: "Test Article",
  link: "https://example.com",
  originallink: "https://orig.com",
  description: "Test description",
  pubDate: "Mon, 23 Feb 2026 10:00:00 +0900",
};

describe("fetchNews tool", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches articles for each config category", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          lastBuildDate: "",
          total: 1,
          start: 1,
          display: 1,
          items: [mockArticle],
        }),
      })
    );

    const result = await fetchNews({}, mockConfig);

    expect(result.results).toHaveLength(2);
    expect(result.results[0].category).toBe("AI");
    expect(result.results[1].category).toBe("economy");
    expect(result.results[0].articles).toHaveLength(1);
  });

  it("overrides categories when provided", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          lastBuildDate: "",
          total: 0,
          start: 1,
          display: 0,
          items: [],
        }),
      })
    );

    const result = await fetchNews({ categories: ["sports"] }, mockConfig);

    expect(result.results).toHaveLength(1);
    expect(result.results[0].category).toBe("sports");
  });

  it("overrides count_per_category when provided", async () => {
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

    await fetchNews({ count_per_category: 10 }, mockConfig);

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain("display=10");
  });

  it("throws when categories is empty array", async () => {
    await expect(
      fetchNews({ categories: [] }, mockConfig)
    ).rejects.toThrow("non-empty");
  });

  it("throws when count_per_category is out of range", async () => {
    await expect(
      fetchNews({ count_per_category: 0 }, mockConfig)
    ).rejects.toThrow("between 1 and 100");
  });
});
