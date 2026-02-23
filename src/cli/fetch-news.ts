import { loadConfig } from "../config.js";
import { fetchNews } from "../tools/fetch-news.js";

function parseArgs(): { categories?: string[]; count_per_category?: number } {
  const args = process.argv.slice(2);
  const result: { categories?: string[]; count_per_category?: number } = {};

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
    }
  }

  return result;
}

try {
  const config = loadConfig();
  const input = parseArgs();
  const result = await fetchNews(input, config);
  process.stdout.write(JSON.stringify(result) + "\n");
} catch (err) {
  process.stderr.write(JSON.stringify({ error: (err as Error).message }) + "\n");
  process.exit(1);
}
