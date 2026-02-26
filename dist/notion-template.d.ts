import { CategoryResult } from "./types.js";
export type TemplateName = "default";
/**
 * Convert structured article data into a markdown string for Notion page creation.
 * The template name determines the page layout. Defaults to "default".
 */
export declare function applyTemplate(categories: CategoryResult[], templateName?: string): string;
//# sourceMappingURL=notion-template.d.ts.map