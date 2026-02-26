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
  link: "https://example.com/1",
  originallink: "https://orig.com/1",
  description: "Test description",
  pubDate: "Mon, 23 Feb 2026 10:00:00 +0900",
};

function makeApiResponse(items = [mockArticle], total = 1) {
  return {
    ok: true,
    json: async () => ({
      lastBuildDate: "Mon, 23 Feb 2026 10:00:00 +0900",
      total,
      start: 1,
      display: items.length,
      items,
    }),
  };
}

describe("fetchNews tool", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches articles for each config category", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeApiResponse()));

    const result = await fetchNews({}, mockConfig);

    expect(result.results).toHaveLength(2);
    expect(result.results[0].category).toBe("AI");
    expect(result.results[1].category).toBe("economy");
    expect(result.results[0].articles).toHaveLength(1);
  });

  it("includes meta in each category result", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          lastBuildDate: "Mon, 23 Feb 2026 10:00:00 +0900",
          total: 42,
          start: 1,
          display: 1,
          items: [mockArticle],
        }),
      })
    );

    const result = await fetchNews({ categories: ["AI"] }, mockConfig);

    expect(result.results[0].meta).toBeDefined();
    expect(result.results[0].meta.total).toBe(42);
    expect(result.results[0].meta.lastBuildDate).toBe("Mon, 23 Feb 2026 10:00:00 +0900");
  });

  it("overrides categories when provided", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeApiResponse([])));

    const result = await fetchNews({ categories: ["sports"] }, mockConfig);

    expect(result.results).toHaveLength(1);
    expect(result.results[0].category).toBe("sports");
  });

  it("overrides count_per_category when provided", async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeApiResponse([]));
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

  it("returns description without truncation", async () => {
    const longDesc = "a".repeat(500);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(makeApiResponse([{ ...mockArticle, description: longDesc }]))
    );

    const result = await fetchNews({ categories: ["AI"] }, mockConfig);
    expect(result.results[0].articles[0].description).toBe(longDesc);
  });

  it("returns pubDate as-is from API without conversion", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeApiResponse()));

    const result = await fetchNews({ categories: ["AI"] }, mockConfig);
    expect(result.results[0].articles[0].pubDate).toBe(
      "Mon, 23 Feb 2026 10:00:00 +0900"
    );
  });

  it("returns originallink even when identical to link", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        makeApiResponse([{ ...mockArticle, originallink: mockArticle.link }])
      )
    );

    const result = await fetchNews({ categories: ["AI"] }, mockConfig);
    expect(result.results[0].articles[0].originallink).toBe(mockArticle.link);
  });

  it("returns originallink when different from link", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeApiResponse()));

    const result = await fetchNews({ categories: ["AI"] }, mockConfig);
    expect(result.results[0].articles[0].originallink).toBe("https://orig.com/1");
  });

  it("deduplicates articles with the same link across categories", async () => {
    // Both categories return the same single article — no replacement available
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeApiResponse()));

    // config has ["AI", "economy"] — both return same link
    const result = await fetchNews({}, mockConfig);

    expect(result.results).toHaveLength(2);
    expect(result.results[0].articles).toHaveLength(1); // first category keeps it
    expect(result.results[1].articles).toHaveLength(0); // duplicate removed, no replacement
  });

  it("fetches replacement articles when duplicates are found", async () => {
    const dupArticle = { ...mockArticle, link: "https://example.com/dup" };
    const newArticle = { ...mockArticle, link: "https://example.com/new", title: "New Article" };

    let callCount = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          // Category 1 (AI): returns dup article
          return {
            ok: true,
            json: async () => ({
              lastBuildDate: "Mon, 23 Feb 2026 10:00:00 +0900",
              total: 10,
              start: 1,
              display: 1,
              items: [dupArticle],
            }),
          };
        }
        if (callCount === 2) {
          // Category 2 (economy): first batch returns dup — duplicate detected
          return {
            ok: true,
            json: async () => ({
              lastBuildDate: "Mon, 23 Feb 2026 10:00:00 +0900",
              total: 10,
              start: 1,
              display: 1,
              items: [dupArticle],
            }),
          };
        }
        // Category 2 (economy): second batch (replacement) returns new article
        return {
          ok: true,
          json: async () => ({
            lastBuildDate: "Mon, 23 Feb 2026 10:00:00 +0900",
            total: 10,
            start: 2,
            display: 1,
            items: [newArticle],
          }),
        };
      })
    );

    const result = await fetchNews(
      { categories: ["AI", "economy"], count_per_category: 1 },
      mockConfig
    );

    expect(result.results[0].articles).toHaveLength(1);
    expect(result.results[0].articles[0].link).toBe("https://example.com/dup");
    expect(result.results[1].articles).toHaveLength(1);
    expect(result.results[1].articles[0].link).toBe("https://example.com/new");
    // fetch was called 3 times: 1 for AI, 1 for economy (dup), 1 for economy (replacement)
    expect(callCount).toBe(3);
  });
});
