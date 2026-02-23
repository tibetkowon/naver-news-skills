import { NotionClient } from "../notion-client.js";
export async function createNotionPage(input, config) {
    const { title, content } = input;
    if (typeof title !== "string" || !title.trim()) {
        throw new Error("title must be a non-empty string");
    }
    if (typeof content !== "string" || !content.trim()) {
        throw new Error("content must be a non-empty string");
    }
    const client = new NotionClient(config.notion);
    return client.createPageWithContent(title.trim(), content);
}
//# sourceMappingURL=create-notion-page.js.map