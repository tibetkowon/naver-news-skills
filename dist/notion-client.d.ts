import { NotionConfig, CreateNotionPageOutput } from "./types.js";
export declare class NotionClient {
    private config;
    constructor(config: NotionConfig);
    private get headers();
    private request;
    createPage(title: string): Promise<{
        id: string;
        url: string;
    }>;
    appendBlocks(pageId: string, content: string): Promise<void>;
    createPageWithContent(title: string, content: string): Promise<CreateNotionPageOutput>;
}
//# sourceMappingURL=notion-client.d.ts.map