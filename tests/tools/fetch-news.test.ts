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

  it("truncates description longer than 200 chars", async () => {
    const longDesc = "a".repeat(250);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          lastBuildDate: "",
          total: 1,
          start: 1,
          display: 1,
          items: [{ ...mockArticle, description: longDesc }],
        }),
      })
    );

    const result = await fetchNews({ categories: ["AI"] }, mockConfig);
    const desc = result.results[0].articles[0].description;
    expect(desc.length).toBeLessThanOrEqual(202); // 200 chars + "…"
    expect(desc.endsWith("…")).toBe(true);
  });

  it("does not truncate description of 200 chars or less", async () => {
    const shortDesc = "a".repeat(200);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          lastBuildDate: "",
          total: 1,
          start: 1,
          display: 1,
          items: [{ ...mockArticle, description: shortDesc }],
        }),
      })
    );

    const result = await fetchNews({ categories: ["AI"] }, mockConfig);
    expect(result.results[0].articles[0].description).toBe(shortDesc);
  });

  it("shortens pubDate to YYYY-MM-DD format", async () => {
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

    const result = await fetchNews({ categories: ["AI"] }, mockConfig);
    expect(result.results[0].articles[0].pubDate).toBe("2026-02-23");
  });

  it("omits originallink when identical to link", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          lastBuildDate: "",
          total: 1,
          start: 1,
          display: 1,
          items: [{ ...mockArticle, originallink: mockArticle.link }],
        }),
      })
    );

    const result = await fetchNews({ categories: ["AI"] }, mockConfig);
    expect(result.results[0].articles[0].originallink).toBeUndefined();
  });

  it("keeps originallink when different from link", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          lastBuildDate: "",
          total: 1,
          start: 1,
          display: 1,
          items: [mockArticle], // originallink is "https://orig.com"
        }),
      })
    );

    const result = await fetchNews({ categories: ["AI"] }, mockConfig);
    expect(result.results[0].articles[0].originallink).toBe("https://orig.com");
  });

  it("deduplicates articles with the same link across categories", async () => {
    // Both categories return the same article link
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

    // config has ["AI", "economy"] — both return same link
    const result = await fetchNews({}, mockConfig);

    expect(result.results).toHaveLength(2);
    expect(result.results[0].articles).toHaveLength(1); // first category keeps it
    expect(result.results[1].articles).toHaveLength(0); // duplicate removed
  });
});
