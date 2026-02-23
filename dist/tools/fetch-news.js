import { NaverClient } from "../naver-client.js";
const DESC_MAX_LEN = 200;
function truncateDescription(desc) {
    if (desc.length <= DESC_MAX_LEN)
        return desc;
    return desc.slice(0, DESC_MAX_LEN) + "…";
}
function shortDate(pubDate) {
    const d = new Date(pubDate);
    if (isNaN(d.getTime()))
        return pubDate;
    return d.toISOString().slice(0, 10); // "2026-02-23"
}
function processArticle(article) {
    const processed = {
        title: article.title,
        link: article.link,
        description: truncateDescription(article.description),
        pubDate: shortDate(article.pubDate),
    };
    // Only include originallink when it differs from link (saves tokens)
    if (article.originallink && article.originallink !== article.link) {
        processed.originallink = article.originallink;
    }
    return processed;
}
function deduplicateResults(results) {
    const seen = new Set();
    return results.map((r) => ({
        ...r,
        articles: r.articles.filter((a) => {
            if (seen.has(a.link))
                return false;
            seen.add(a.link);
            return true;
        }),
    }));
}
export async function fetchNews(input, config) {
    const categories = input.categories ?? config.news.categories;
    const count = input.count_per_category ?? config.news.count_per_category;
    if (!Array.isArray(categories) || categories.length === 0) {
        throw new Error("categories must be a non-empty array");
    }
    if (typeof count !== "number" || count < 1 || count > 100) {
        throw new Error("count_per_category must be between 1 and 100");
    }
    const client = new NaverClient(config.naver);
    const rawResults = [];
    for (const category of categories) {
        const articles = await client.searchNews(category, count);
        rawResults.push({ category, articles: articles.map(processArticle) });
    }
    return { results: deduplicateResults(rawResults) };
}
//# sourceMappingURL=fetch-news.js.map