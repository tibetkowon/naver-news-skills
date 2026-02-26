import { loadConfig } from "../config.js";
import { newsToNotion } from "../tools/news-to-notion.js";

function parseArgs(): {
  categories?: string[];
  count_per_category?: number;
  title?: string;
  only_korean?: boolean;
} {
  const args = process.argv.slice(2);
  const result: {
    categories?: string[];
    count_per_category?: number;
    title?: string;
    only_korean?: boolean;
  } = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--categories" && args[i + 1]) {
      result.categories = args[i + 1]
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      i++;
    } else if (args[i] === "--count" && args[i + 1]) {
      const n = parseInt(args[i + 1], 10);
      if (!isNaN(n)) result.count_per_category = n;
      i++;
    } else if (args[i] === "--title" && args[i + 1]) {
      result.title = args[i + 1];
      i++;
    } else if (args[i] === "--only-korean") {
      result.only_korean = true;
    }
  }

  return result;
}

try {
  const config = loadConfig();
  const input = parseArgs();
  const result = await newsToNotion(input, config);
  process.stdout.write(JSON.stringify(result) + "\n");
} catch (err) {
  process.stderr.write(
    JSON.stringify({ error: (err as Error).message }) + "\n"
  );
  process.exit(1);
}
