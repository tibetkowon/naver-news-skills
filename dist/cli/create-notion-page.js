import { loadConfig } from "../config.js";
import { createNotionPage } from "../tools/create-notion-page.js";
async function readStdin() {
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
async function main() {
    const raw = await readStdin();
    let input;
    try {
        input = JSON.parse(raw);
    }
    catch {
        process.stderr.write(JSON.stringify({ error: "Invalid JSON input. Expected: { title, categories, template? }" }) + "\n");
        process.exit(1);
        return;
    }
    const config = loadConfig();
    const result = await createNotionPage(input, config);
    process.stdout.write(JSON.stringify(result) + "\n");
}
main().catch((err) => {
    process.stderr.write(JSON.stringify({ error: err.message }) + "\n");
    process.exit(1);
});
//# sourceMappingURL=create-notion-page.js.map