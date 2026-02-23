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
