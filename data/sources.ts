import type { SourceType } from "@/lib/projects";

export interface Source {
  url: string;
  creator: string;
  sourceType: SourceType;
  isFree: boolean;
  pages?: number; // how many pages to scrape (for paginated sites)
}

export const SOURCES: Source[] = [
  {
    url: "https://www.yarnspirations.com/collections/patterns",
    creator: "Yarnspirations",
    sourceType: "PDF",
    isFree: true,
    pages: 3,
  },
  {
    url: "https://ko-fi.com/Q5Q1D70DZ/shop",
    creator: "ko-fi shop",
    sourceType: "PDF",
    isFree: false,
    pages: 1,
  },
  {
    url: "https://chubbiesbyash.com/free-crochet-pattern/page/2/",
    creator: "Chubbies by Ash",
    sourceType: "Blog",
    isFree: true,
    pages: 2,
  },
  {
    url: "https://www.thefriendlyredfox.com/category/amigurumi/page/4/",
    creator: "The Friendly Red Fox",
    sourceType: "Blog",
    isFree: true,
    pages: 2,
  },
  {
    url: "https://www.youtube.com/@by.ananyaa",
    creator: "by.ananyaa",
    sourceType: "YouTube",
    isFree: true,
  },
  {
    url: "https://www.youtube.com/channel/UCMatRWidE6WTpV5TPWSIjqA",
    creator: "YouTube Channel",
    sourceType: "YouTube",
    isFree: true,
  },
  {
    url: "https://www.youtube.com/@VivCrochets",
    creator: "VivCrochets",
    sourceType: "YouTube",
    isFree: true,
  },
  {
    url: "https://www.youtube.com/@etmsstudio",
    creator: "etmsstudio",
    sourceType: "YouTube",
    isFree: true,
  },
  {
    url: "https://www.youtube.com/@wonder_netting",
    creator: "wonder_netting",
    sourceType: "YouTube",
    isFree: true,
  },
  {
    url: "https://www.ribblr.com/shop/smolbearystudio",
    creator: "SmolbearyStudio",
    sourceType: "Ribblr",
    isFree: false,
  },
];
