import { readFileSync } from "fs";
import { resolve } from "path";
const CONFIG_PATH = resolve(process.cwd(), "config.json");
function validateConfig(raw) {
    if (typeof raw !== "object" || raw === null) {
        throw new Error("config.json must be a JSON object");
    }
    const obj = raw;
    // Naver
    if (typeof obj["naver"] !== "object" || obj["naver"] === null) {
        throw new Error("config.json: missing 'naver' section");
    }
    const naver = obj["naver"];
    if (typeof naver["client_id"] !== "string" || !naver["client_id"]) {
        throw new Error("config.json: naver.client_id is required");
    }
    if (typeof naver["client_secret"] !== "string" || !naver["client_secret"]) {
        throw new Error("config.json: naver.client_secret is required");
    }
    // Notion
    if (typeof obj["notion"] !== "object" || obj["notion"] === null) {
        throw new Error("config.json: missing 'notion' section");
    }
    const notion = obj["notion"];
    if (typeof notion["api_key"] !== "string" || !notion["api_key"]) {
        throw new Error("config.json: notion.api_key is required");
    }
    if (typeof notion["parent_page_id"] !== "string" ||
        !notion["parent_page_id"]) {
        throw new Error("config.json: notion.parent_page_id is required");
    }
    // News
    if (typeof obj["news"] !== "object" || obj["news"] === null) {
        throw new Error("config.json: missing 'news' section");
    }
    const news = obj["news"];
    if (!Array.isArray(news["categories"]) || news["categories"].length === 0) {
        throw new Error("config.json: news.categories must be a non-empty array of strings");
    }
    for (const cat of news["categories"]) {
        if (typeof cat !== "string") {
            throw new Error("config.json: news.categories must contain strings only");
        }
    }
    if (typeof news["count_per_category"] !== "number" ||
        news["count_per_category"] < 1 ||
        news["count_per_category"] > 100) {
        throw new Error("config.json: news.count_per_category must be a number between 1 and 100");
    }
    return {
        naver: {
            client_id: naver["client_id"],
            client_secret: naver["client_secret"],
        },
        notion: {
            api_key: notion["api_key"],
            parent_page_id: notion["parent_page_id"],
        },
        news: {
            categories: news["categories"],
            count_per_category: news["count_per_category"],
        },
    };
}
export function loadConfig() {
    let raw;
    try {
        const content = readFileSync(CONFIG_PATH, "utf-8");
        raw = JSON.parse(content);
    }
    catch (err) {
        if (err.code === "ENOENT") {
            throw new Error(`config.json not found. Copy config.example.json to config.json and fill in your credentials.`);
        }
        throw new Error(`Failed to read config.json: ${err.message}`);
    }
    return validateConfig(raw);
}
//# sourceMappingURL=config.js.map