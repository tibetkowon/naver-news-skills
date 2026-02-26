import { describe, it, expect, vi, beforeEach } from "vitest";
import { createNotionPage } from "../../src/tools/create-notion-page.js";
import { AppConfig, CategoryResult } from "../../src/types.js";

const mockConfig: AppConfig = {
  naver: { client_id: "id", client_secret: "secret" },
  notion: { api_key: "key", parent_page_id: "parent-123" },
  news: { categories: ["AI"], count_per_category: 5 },
};

const mockMeta = {
  lastBuildDate: "Mon, 23 Feb 2026 10:00:00 +0900",
  total: 1,
  start: 1,
  display: 1,
};

const mockCategories: CategoryResult[] = [
  {
    category: "AI",
    meta: mockMeta,
    articles: [
      {
        title: "AI 뉴스",
        link: "https://example.com/1",
        originallink: "https://orig.com/1",
        description: "AI 관련 최신 뉴스입니다.",
        pubDate: "Mon, 23 Feb 2026 10:00:00 +0900",
      },
    ],
  },
];

describe("createNotionPage tool", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("creates page and returns url and id", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: "new-page-id",
          url: "https://notion.so/new-page-id",
        }),
      })
    );

    const result = await createNotionPage(
      { title: "News Summary", categories: mockCategories },
      mockConfig
    );

    expect(result.page_id).toBe("new-page-id");
    expect(result.page_url).toBe("https://notion.so/new-page-id");
  });

  it("throws when title is empty", async () => {
    await expect(
      createNotionPage({ title: "", categories: mockCategories }, mockConfig)
    ).rejects.toThrow("title");
  });

  it("throws when title is only whitespace", async () => {
    await expect(
      createNotionPage({ title: "   ", categories: mockCategories }, mockConfig)
    ).rejects.toThrow("title");
  });

  it("throws when categories is empty array", async () => {
    await expect(
      createNotionPage({ title: "Title", categories: [] }, mockConfig)
    ).rejects.toThrow("categories");
  });

  it("trims whitespace from title before creating page", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "p1", url: "https://notion.so/p1" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await createNotionPage(
      { title: "  News Summary  ", categories: mockCategories },
      mockConfig
    );

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string) as Record<string, unknown>;
    const titleProp = (
      body["properties"] as Record<string, unknown>
    )["title"] as Record<string, unknown>;
    const richText = titleProp["title"] as Array<Record<string, unknown>>;
    const textContent = (richText[0]["text"] as Record<string, unknown>)[
      "content"
    ];
    expect(textContent).toBe("News Summary");
  });

  it("passes template to applyTemplate when specified", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "p1", url: "https://notion.so/p1" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    // Should not throw even with explicit template
    const result = await createNotionPage(
      { title: "Title", categories: mockCategories, template: "default" },
      mockConfig
    );

    expect(result.page_id).toBe("p1");
  });
});
