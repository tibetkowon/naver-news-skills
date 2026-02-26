import { describe, it, expect } from "vitest";
import { applyTemplate } from "../src/notion-template.js";
import { CategoryResult } from "../src/types.js";

const mockMeta = {
  lastBuildDate: "Mon, 23 Feb 2026 10:00:00 +0900",
  total: 2,
  start: 1,
  display: 2,
};

const sampleCategories: CategoryResult[] = [
  {
    category: "AI",
    meta: mockMeta,
    articles: [
      {
        title: "AI 혁신 뉴스",
        link: "https://news.naver.com/1",
        originallink: "https://orig.com/1",
        description: "AI 기술이 빠르게 발전하고 있습니다.",
        pubDate: "Mon, 23 Feb 2026 10:00:00 +0900",
      },
    ],
  },
  {
    category: "경제",
    meta: mockMeta,
    articles: [
      {
        title: "주식 시장 동향",
        link: "https://news.naver.com/2",
        originallink: "https://news.naver.com/2", // same as link
        description: "오늘 주식 시장은 상승세를 보였습니다.",
        pubDate: "Mon, 23 Feb 2026 09:00:00 +0900",
      },
    ],
  },
];

describe("applyTemplate (default)", () => {
  it("includes category as heading_2 (## )", () => {
    const output = applyTemplate(sampleCategories);
    expect(output).toContain("## AI");
    expect(output).toContain("## 경제");
  });

  it("includes article title as heading_3 (### )", () => {
    const output = applyTemplate(sampleCategories);
    expect(output).toContain("### AI 혁신 뉴스");
    expect(output).toContain("### 주식 시장 동향");
  });

  it("includes article description", () => {
    const output = applyTemplate(sampleCategories);
    expect(output).toContain("AI 기술이 빠르게 발전하고 있습니다.");
  });

  it("includes 출처 link", () => {
    const output = applyTemplate(sampleCategories);
    expect(output).toContain("- 출처: https://news.naver.com/1");
  });

  it("includes pubDate", () => {
    const output = applyTemplate(sampleCategories);
    expect(output).toContain("- 날짜: Mon, 23 Feb 2026 10:00:00 +0900");
  });

  it("includes 원본 link when originallink differs from link", () => {
    const output = applyTemplate(sampleCategories);
    expect(output).toContain("- 원본: https://orig.com/1");
  });

  it("omits 원본 link when originallink equals link", () => {
    const output = applyTemplate(sampleCategories);
    // 경제 article has originallink === link
    expect(output).not.toContain("- 원본: https://news.naver.com/2");
  });

  it("omits 원본 line when originallink is absent", () => {
    const categories: CategoryResult[] = [
      {
        category: "tech",
        meta: mockMeta,
        articles: [
          {
            title: "Tech News",
            link: "https://example.com/t",
            description: "Tech desc",
            pubDate: "Mon, 23 Feb 2026 08:00:00 +0900",
          },
        ],
      },
    ];

    const output = applyTemplate(categories);
    expect(output).not.toContain("원본");
  });

  it("uses default template when templateName is unrecognized", () => {
    const output = applyTemplate(sampleCategories, "nonexistent-template");
    // Should fall through to default
    expect(output).toContain("## AI");
    expect(output).toContain("### AI 혁신 뉴스");
  });

  it("handles empty articles array for a category", () => {
    const categories: CategoryResult[] = [
      { category: "empty", meta: mockMeta, articles: [] },
    ];
    const output = applyTemplate(categories);
    expect(output).toContain("## empty");
    expect(output).not.toContain("###");
  });

  it("includes divider between articles", () => {
    const categories: CategoryResult[] = [
      {
        category: "AI",
        meta: mockMeta,
        articles: [
          {
            title: "Article 1",
            link: "https://example.com/1",
            description: "Desc 1",
            pubDate: "Mon, 23 Feb 2026 10:00:00 +0900",
          },
          {
            title: "Article 2",
            link: "https://example.com/2",
            description: "Desc 2",
            pubDate: "Mon, 23 Feb 2026 09:00:00 +0900",
          },
        ],
      },
    ];

    const output = applyTemplate(categories);
    expect(output).toContain("---");
  });
});
