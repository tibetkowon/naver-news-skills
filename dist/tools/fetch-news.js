import { NaverClient } from "../naver-client.js";
async function fetchUniqueArticles(client, category, count, seenLinks) {
    const unique = [];
    let start = 1;
    let lastMeta;
    while (unique.length < count) {
        const batchSize = Math.min(100, count);
        const { meta, articles } = await client.searchNews(category, batchSize, start);
        lastMeta = meta;
        for (const article of articles) {
            if (!seenLinks.has(article.link) && unique.length < count) {
                seenLinks.add(article.link);
                unique.push(article);
            }
        }
        // No more articles available
        if (articles.length < batchSize)
            break;
        start += batchSize;
        if (start > 1000)
            break;
    }
    return { meta: lastMeta, articles: unique };
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
    const results = [];
    const seenLinks = new Set();
    for (const category of categories) {
        const { meta, articles } = await fetchUniqueArticles(client, category, count, seenLinks);
        results.push({ category, meta, articles });
    }
    return { results };
}
//# sourceMappingURL=fetch-news.js.map