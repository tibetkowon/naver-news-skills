import { describe, it, expect, vi, beforeEach } from "vitest";
import { createNotionPage } from "../../src/tools/create-notion-page.js";
import { AppConfig } from "../../src/types.js";

const mockConfig: AppConfig = {
  naver: { client_id: "id", client_secret: "secret" },
  notion: { api_key: "key", parent_page_id: "parent-123" },
  news: { categories: ["AI"], count_per_category: 5 },
};

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
      { title: "News Summary", content: "Some news content" },
      mockConfig
    );

    expect(result.page_id).toBe("new-page-id");
    expect(result.page_url).toBe("https://notion.so/new-page-id");
  });

  it("throws when title is empty", async () => {
    await expect(
      createNotionPage({ title: "", content: "content" }, mockConfig)
    ).rejects.toThrow("title");
  });

  it("throws when title is only whitespace", async () => {
    await expect(
      createNotionPage({ title: "   ", content: "content" }, mockConfig)
    ).rejects.toThrow("title");
  });

  it("throws when content is empty", async () => {
    await expect(
      createNotionPage({ title: "Title", content: "" }, mockConfig)
    ).rejects.toThrow("content");
  });

  it("trims whitespace from title before creating page", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "p1", url: "https://notion.so/p1" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await createNotionPage(
      { title: "  News Summary  ", content: "content" },
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
});
