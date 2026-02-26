import { applyTemplate } from "../notion-template.js";
import { NotionClient } from "../notion-client.js";
import {
  AppConfig,
  CreateNotionPageInput,
  CreateNotionPageOutput,
} from "../types.js";

export async function createNotionPage(
  input: CreateNotionPageInput,
  config: AppConfig
): Promise<CreateNotionPageOutput> {
  if (typeof input.title !== "string" || !input.title.trim()) {
    throw new Error("title must be a non-empty string");
  }
  if (!Array.isArray(input.categories) || input.categories.length === 0) {
    throw new Error("categories must be a non-empty array");
  }

  const content = applyTemplate(input.categories, input.template);
  const client = new NotionClient(config.notion);
  return client.createPageWithContent(input.title.trim(), content);
}
