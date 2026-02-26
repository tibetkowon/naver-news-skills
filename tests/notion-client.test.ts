import { describe, it, expect, vi, beforeEach } from "vitest";
import { NotionClient } from "../src/notion-client.js";

const mockConfig = {
  api_key: "secret-notion-key",
  parent_page_id: "parent-page-123",
};

function mockFetchSuccess(responses: unknown[]) {
  let callCount = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(async () => {
      const res = responses[callCount] ?? responses[responses.length - 1];
      callCount++;
      return {
        ok: true,
        json: async () => res,
      };
    })
  );
}

describe("NotionClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a page and returns id and url", async () => {
    mockFetchSuccess([
      { id: "page-abc", url: "https://notion.so/page-abc" },
      { results: [] }, // appendBlocks response
    ]);

    const client = new NotionClient(mockConfig);
    const result = await client.createPageWithContent(
      "Test Title",
      "Hello World"
    );

    expect(result.page_id).toBe("page-abc");
    expect(result.page_url).toBe("https://notion.so/page-abc");
  });

  it("sends correct Authorization header", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "p1", url: "https://notion.so/p1" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = new NotionClient(mockConfig);
    await client.createPage("My Page");

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((options.headers as Record<string, string>)["Authorization"]).toBe(
      "Bearer secret-notion-key"
    );
    expect(
      (options.headers as Record<string, string>)["Notion-Version"]
    ).toBe("2022-06-28");
  });

  it("splits large content into multiple block requests (>100 blocks)", async () => {
    // 150 lines of content → should trigger 2 PATCH requests
    const content = Array.from({ length: 150 }, (_, i) => `Line ${i}`).join(
      "\n"
    );

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "p2", url: "https://notion.so/p2" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = new NotionClient(mockConfig);
    await client.createPageWithContent("Big Page", content);

    // 1 POST (create page) + 2 PATCH (append 100 + 50 blocks)
    expect(fetchMock.mock.calls.length).toBe(3);
  });

  it("recognizes '---' as a divider block", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "p3", url: "https://notion.so/p3" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = new NotionClient(mockConfig);
    await client.appendBlocks("page-id", "Some text\n---\nOther text");

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string);
    const dividerBlock = body.children[1];

    expect(dividerBlock.type).toBe("divider");
    expect(dividerBlock.divider).toEqual({});
  });

  it("throws on 401 authentication error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ message: "Unauthorized" }),
      })
    );

    const client = new NotionClient(mockConfig);
    await expect(client.createPage("Title")).rejects.toThrow(
      "authentication failed"
    );
  });

  it("throws on 404 page not found", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ message: "Could not find page" }),
      })
    );

    const client = new NotionClient(mockConfig);
    await expect(client.createPage("Title")).rejects.toThrow("not found");
  });

  it("throws on network failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("ECONNREFUSED"))
    );

    const client = new NotionClient(mockConfig);
    await expect(client.createPage("Title")).rejects.toThrow("Network error");
  });
});
