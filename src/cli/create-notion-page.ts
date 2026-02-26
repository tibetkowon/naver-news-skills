import { loadConfig } from "../config.js";
import { createNotionPage } from "../tools/create-notion-page.js";
import { CreateNotionPageInput } from "../types.js";

async function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", reject);
  });
}

async function main(): Promise<void> {
  const raw = await readStdin();
  let input: CreateNotionPageInput;
  try {
    input = JSON.parse(raw) as CreateNotionPageInput;
  } catch {
    process.stderr.write(
      JSON.stringify({ error: "Invalid JSON input. Expected: { title, categories, template? }" }) + "\n"
    );
    process.exit(1);
    return;
  }

  const config = loadConfig();
  const result = await createNotionPage(input, config);
  process.stdout.write(JSON.stringify(result) + "\n");
}

main().catch((err: Error) => {
  process.stderr.write(JSON.stringify({ error: err.message }) + "\n");
  process.exit(1);
});
