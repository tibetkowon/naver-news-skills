import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { loadConfig } from "./config.js";
import { fetchNews } from "./tools/fetch-news.js";
import { createNotionPage } from "./tools/create-notion-page.js";
const config = loadConfig();
const server = new McpServer({
    name: "naver-news-skills",
    version: "1.0.0",
});
server.tool("fetch_news", "Fetch news articles from Naver Search API by category", {
    categories: z
        .array(z.string())
        .optional()
        .describe("List of categories/keywords to search (overrides config)"),
    count_per_category: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe("Number of articles per category (overrides config)"),
}, async (input) => {
    const result = await fetchNews(input, config);
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify(result, null, 2),
            },
        ],
    };
});
server.tool("create_notion_page", "Create a Notion page with news summary content", {
    title: z.string().describe("Page title (e.g. 'News Summary – 2026-02-23')"),
    content: z
        .string()
        .describe("Markdown-style text content to write to the Notion page"),
}, async (input) => {
    const result = await createNotionPage(input, config);
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify(result, null, 2),
            },
        ],
    };
});
const transport = new StdioServerTransport();
await server.connect(transport);
//# sourceMappingURL=index.js.map