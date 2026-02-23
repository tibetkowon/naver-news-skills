import { loadConfig } from "../config.js";
import { createNotionPage } from "../tools/create-notion-page.js";
function parseArgs() {
    const args = process.argv.slice(2);
    const result = {};
    for (let i = 0; i < args.length; i++) {
        if (args[i] === "--title" && args[i + 1]) {
            result.title = args[i + 1];
            i++;
        }
    }
    return result;
}
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
const { title } = parseArgs();
if (!title) {
    process.stderr.write(JSON.stringify({ error: "--title is required" }) + "\n");
    process.exit(1);
}
try {
    const content = await readStdin();
    const config = loadConfig();
    const result = await createNotionPage({ title, content }, config);
    process.stdout.write(JSON.stringify(result) + "\n");
}
catch (err) {
    process.stderr.write(JSON.stringify({ error: err.message }) + "\n");
    process.exit(1);
}
//# sourceMappingURL=create-notion-page.js.map