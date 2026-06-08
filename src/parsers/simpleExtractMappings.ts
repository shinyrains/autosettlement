import type { Platform } from "../types/settlement";
import type { SimpleExtractMapping } from "./parserContract";

export type SimpleExtractPlatform =
  | "novelpia"
  | "mootoon"
  | "epyrus"
  | "kyobo"
  | "yes24"
  | "aladin"
  | "guru_company";

export const simpleExtractMappings: Record<SimpleExtractPlatform, SimpleExtractMapping> = {
  novelpia: {
    platform: "novelpia",
    status: "ready",
    columns: {
      workTitle: "상품명",
      author: "작가명",
      grossSales: "판매금액",
      settlementAmount: "정산금액",
    },
  },
  mootoon: {
    platform: "mootoon",
    status: "ready",
    columns: {
      workTitle: "타이틀",
      author: "작가",
      grossSales: "대상금액",
      settlementAmount: "정산금액",
    },
  },
  epyrus: {
    platform: "epyrus",
    status: "ready",
    columns: {
      workTitle: "제목",
      author: "저자",
      publisher: "출판사",
      grossSales: "판매금액",
      settlementAmount: "정산액",
    },
  },
  kyobo: {
    platform: "kyobo",
    status: "ready",
    columns: {
      workTitle: "상품명",
      author: "저자",
      publisher: "출판사",
      grossSales: "정산대상판매가총액",
      settlementAmount: "정산액",
    },
  },
  yes24: {
    platform: "yes24",
    status: "ready",
    columns: {
      workTitle: "도서명",
      author: "저자명",
      publisher: "출판사",
      grossSales: "서점판매가",
      settlementAmount: "출판사정산액",
    },
  },
  aladin: {
    platform: "aladin",
    status: "ready",
    columns: {
      workTitle: "제목",
      author: "저자명",
      publisher: "출판사명",
      grossSales: "판매가",
      settlementAmount: "정산액",
    },
  },
  guru_company: {
    platform: "guru_company",
    status: "ready",
    columns: {
      workTitle: "작품명",
      author: "작가",
      grossSales: "정산대상금액",
      settlementAmount: "콘텐츠정산금액",
    },
  },
};

export const simpleExtractPlatforms = Object.keys(simpleExtractMappings) as SimpleExtractPlatform[];

export function isSimpleExtractPlatform(platform: Platform): platform is SimpleExtractPlatform {
  return platform in simpleExtractMappings;
}
