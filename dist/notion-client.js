const NOTION_API_BASE = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";
function buildRichText(text) {
    // Notion has a 2000-char limit per rich_text element
    const chunks = [];
    for (let i = 0; i < text.length; i += 2000) {
        chunks.push({ type: "text", text: { content: text.slice(i, i + 2000) } });
    }
    return chunks;
}
function contentToBlocks(content) {
    const lines = content.split("\n");
    const blocks = [];
    for (const line of lines) {
        if (line.startsWith("# ")) {
            blocks.push({
                object: "block",
                type: "heading_1",
                heading_1: { rich_text: buildRichText(line.slice(2)) },
            });
        }
        else if (line.startsWith("## ")) {
            blocks.push({
                object: "block",
                type: "heading_2",
                heading_2: { rich_text: buildRichText(line.slice(3)) },
            });
        }
        else if (line.startsWith("### ")) {
            blocks.push({
                object: "block",
                type: "heading_3",
                heading_3: { rich_text: buildRichText(line.slice(4)) },
            });
        }
        else if (line.startsWith("- ") || line.startsWith("* ")) {
            blocks.push({
                object: "block",
                type: "bulleted_list_item",
                bulleted_list_item: { rich_text: buildRichText(line.slice(2)) },
            });
        }
        else {
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
    config;
    constructor(config) {
        this.config = config;
    }
    get headers() {
        return {
            Authorization: `Bearer ${this.config.api_key}`,
            "Content-Type": "application/json",
            "Notion-Version": NOTION_VERSION,
        };
    }
    async request(method, path, body) {
        let response;
        try {
            response = await fetch(`${NOTION_API_BASE}${path}`, {
                method,
                headers: this.headers,
                body: body !== undefined ? JSON.stringify(body) : undefined,
            });
        }
        catch (err) {
            throw new Error(`Network error calling Notion API: ${err.message}`);
        }
        if (!response.ok) {
            const body = await response.json().catch(() => ({}));
            const message = body["message"] ?? response.statusText;
            if (response.status === 401) {
                throw new Error("Notion API authentication failed. Check your api_key.");
            }
            if (response.status === 404) {
                throw new Error("Notion page not found. Check your parent_page_id and integration permissions.");
            }
            if (response.status === 429) {
                throw new Error("Notion API rate limit exceeded. Please try again later.");
            }
            throw new Error(`Notion API error ${response.status}: ${message}`);
        }
        return response.json();
    }
    async createPage(title) {
        const data = await this.request("POST", "/pages", {
            parent: { page_id: this.config.parent_page_id },
            properties: {
                title: {
                    title: buildRichText(title),
                },
            },
        });
        const page = data;
        return {
            id: page["id"],
            url: page["url"],
        };
    }
    async appendBlocks(pageId, content) {
        const blocks = contentToBlocks(content);
        // Notion allows max 100 blocks per request
        for (let i = 0; i < blocks.length; i += 100) {
            const chunk = blocks.slice(i, i + 100);
            await this.request("PATCH", `/blocks/${pageId}/children`, {
                children: chunk,
            });
        }
    }
    async createPageWithContent(title, content) {
        const page = await this.createPage(title);
        await this.appendBlocks(page.id, content);
        return {
            page_url: page.url,
            page_id: page.id,
        };
    }
}
//# sourceMappingURL=notion-client.js.map