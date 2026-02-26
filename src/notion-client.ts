import { NotionConfig, CreateNotionPageOutput } from "./types.js";

const NOTION_API_BASE = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

interface NotionRichText {
  type: "text";
  text: { content: string };
}

interface NotionBlock {
  object: "block";
  type: string;
  [key: string]: unknown;
}

function buildRichText(text: string): NotionRichText[] {
  // Notion has a 2000-char limit per rich_text element
  const chunks: NotionRichText[] = [];
  for (let i = 0; i < text.length; i += 2000) {
    chunks.push({ type: "text", text: { content: text.slice(i, i + 2000) } });
  }
  return chunks;
}

function contentToBlocks(content: string): NotionBlock[] {
  const lines = content.split("\n");
  const blocks: NotionBlock[] = [];

  for (const line of lines) {
    if (line === "---") {
      blocks.push({
        object: "block",
        type: "divider",
        divider: {},
      });
    } else if (line.startsWith("# ")) {
      blocks.push({
        object: "block",
        type: "heading_1",
        heading_1: { rich_text: buildRichText(line.slice(2)) },
      });
    } else if (line.startsWith("## ")) {
      blocks.push({
        object: "block",
        type: "heading_2",
        heading_2: { rich_text: buildRichText(line.slice(3)) },
      });
    } else if (line.startsWith("### ")) {
      blocks.push({
        object: "block",
        type: "heading_3",
        heading_3: { rich_text: buildRichText(line.slice(4)) },
      });
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      blocks.push({
        object: "block",
        type: "bulleted_list_item",
        bulleted_list_item: { rich_text: buildRichText(line.slice(2)) },
      });
    } else {
      blocks.push({
        object: "block",
        type: "paragraph",
        paragraph: { rich_text: line ? buildRichText(line) : [] },
      });
    }
  }

  return blocks;
}

export class NotionClient {
  private config: NotionConfig;

  constructor(config: NotionConfig) {
    this.config = config;
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.api_key}`,
      "Content-Type": "application/json",
      "Notion-Version": NOTION_VERSION,
    };
  }

  private async request(
    method: string,
    path: string,
    body?: unknown
  ): Promise<unknown> {
    let response: Response;
    try {
      response = await fetch(`${NOTION_API_BASE}${path}`, {
        method,
        headers: this.headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch (err) {
      throw new Error(
        `Network error calling Notion API: ${(err as Error).message}`
      );
    }

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const message =
        (body as Record<string, unknown>)["message"] ?? response.statusText;

      if (response.status === 401) {
        throw new Error(
          "Notion API authentication failed. Check your api_key."
        );
      }
      if (response.status === 404) {
        throw new Error(
          "Notion page not found. Check your parent_page_id and integration permissions."
        );
      }
      if (response.status === 429) {
        throw new Error("Notion API rate limit exceeded. Please try again later.");
      }
      throw new Error(`Notion API error ${response.status}: ${message}`);
    }

    return response.json();
  }

  async createPage(title: string): Promise<{ id: string; url: string }> {
    const data = await this.request("POST", "/pages", {
      parent: { page_id: this.config.parent_page_id },
      properties: {
        title: {
          title: buildRichText(title),
        },
      },
    });

    const page = data as Record<string, unknown>;
    return {
      id: page["id"] as string,
      url: page["url"] as string,
    };
  }

  async appendBlocks(pageId: string, content: string): Promise<void> {
    const blocks = contentToBlocks(content);

    // Notion allows max 100 blocks per request
    for (let i = 0; i < blocks.length; i += 100) {
      const chunk = blocks.slice(i, i + 100);
      await this.request("PATCH", `/blocks/${pageId}/children`, {
        children: chunk,
      });
    }
  }

  async createPageWithContent(
    title: string,
    content: string
  ): Promise<CreateNotionPageOutput> {
    const page = await this.createPage(title);
    await this.appendBlocks(page.id, content);
    return {
      page_url: page.url,
      page_id: page.id,
    };
  }
}
