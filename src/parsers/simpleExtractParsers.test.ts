import { describe, expect, it } from "vitest";
import type { ParserContext, TabularRow } from "./parserContract";
import { parseAladin } from "./aladin";
import { parseEpyrus } from "./epyrus";
import { parseGuruCompany } from "./guruCompany";
import { parseKyobo } from "./kyobo";
import { parseMootoon } from "./mootoon";
import { parseYes24 } from "./yes24";
import { simpleExtractMappings } from "./simpleExtractMappings";
import type { SimpleExtractPlatform } from "./simpleExtractMappings";

type ParserFn = (context: ParserContext, rows: TabularRow[]) => ReturnType<typeof parseMootoon>;

type ParserCase = {
  platform: SimpleExtractPlatform;
  parse: ParserFn;
  validRow: TabularRow;
  expected: {
    workTitle: string;
    author: string;
    publisher?: string;
    grossSales: number;
    settlementAmount: number;
  };
  missingColumn: string;
  blankColumn: string;
  invalidMoneyColumn: string;
};

const cases: ParserCase[] = [
  {
    platform: "mootoon",
    parse: parseMootoon,
    validRow: {
      작가: "서도윤",
      타이틀: "검은 별의 서점",
      대상금액: "18,420",
      정산금액: "7,368",
    },
    expected: {
      workTitle: "검은 별의 서점",
      author: "서도윤",
      grossSales: 18420,
      settlementAmount: 7368,
    },
    missingColumn: "정산금액",
    blankColumn: "타이틀",
    invalidMoneyColumn: "대상금액",
  },
  {
    platform: "epyrus",
    parse: parseEpyrus,
    validRow: {
      제목: "검은 별의 서점",
      저자: "서도윤",
      출판사: "라온북스",
      판매금액: "18,420",
      정산액: "7,368",
    },
    expected: {
      workTitle: "검은 별의 서점",
      author: "서도윤",
      publisher: "라온북스",
      grossSales: 18420,
      settlementAmount: 7368,
    },
    missingColumn: "정산액",
    blankColumn: "제목",
    invalidMoneyColumn: "판매금액",
  },
  {
    platform: "kyobo",
    parse: parseKyobo,
    validRow: {
      상품명: "검은 별의 서점",
      저자: "서도윤",
      출판사: "라온북스",
      정산대상판매가총액: "18,420",
      정산액: "7,368",
    },
    expected: {
      workTitle: "검은 별의 서점",
      author: "서도윤",
      publisher: "라온북스",
      grossSales: 18420,
      settlementAmount: 7368,
    },
    missingColumn: "정산액",
    blankColumn: "상품명",
    invalidMoneyColumn: "정산대상판매가총액",
  },
  {
    platform: "yes24",
    parse: parseYes24,
    validRow: {
      도서명: "검은 별의 서점",
      저자명: "서도윤",
      출판사: "라온북스",
      서점판매가: "18,420",
      출판사정산액: "7,368",
    },
    expected: {
      workTitle: "검은 별의 서점",
      author: "서도윤",
      publisher: "라온북스",
      grossSales: 18420,
      settlementAmount: 7368,
    },
    missingColumn: "출판사정산액",
    blankColumn: "도서명",
    invalidMoneyColumn: "서점판매가",
  },
  {
    platform: "aladin",
    parse: parseAladin,
    validRow: {
      제목: "검은 별의 서점",
      저자명: "서도윤",
      출판사명: "라온북스",
      판매가: "18,420",
      정산액: "7,368",
    },
    expected: {
      workTitle: "검은 별의 서점",
      author: "서도윤",
      publisher: "라온북스",
      grossSales: 18420,
      settlementAmount: 7368,
    },
    missingColumn: "정산액",
    blankColumn: "제목",
    invalidMoneyColumn: "판매가",
  },
  {
    platform: "guru_company",
    parse: parseGuruCompany,
    validRow: {
      작품명: "검은 별의 서점",
      작가: "서도윤",
      정산대상금액: "18,420",
      콘텐츠정산금액: "7,368",
    },
    expected: {
      workTitle: "검은 별의 서점",
      author: "서도윤",
      grossSales: 18420,
      settlementAmount: 7368,
    },
    missingColumn: "콘텐츠정산금액",
    blankColumn: "작품명",
    invalidMoneyColumn: "정산대상금액",
  },
];

function contextFor(platform: SimpleExtractPlatform): ParserContext {
  return {
    batchId: "batch-test",
    company: "raon",
    platform,
    saleMonth: "2026-06",
    sourceFileName: `${platform}-sample.xlsx`,
  };
}

describe.each(cases)("$platform simple extract parser", (parserCase) => {
  it("creates SettlementRow values from mapped columns", () => {
    const result = parserCase.parse(contextFor(parserCase.platform), [parserCase.validRow]);

    expect(result.issues).toEqual([]);
    expect(result.rows).toEqual([
      expect.objectContaining({
        rowId: `batch-test-${parserCase.platform}-2`,
        company: "raon",
        platform: parserCase.platform,
        saleMonth: "2026-06",
        workTitle: parserCase.expected.workTitle,
        mailerContentTitle: parserCase.expected.workTitle,
        author: parserCase.expected.author,
        ...(parserCase.expected.publisher ? { publisher: parserCase.expected.publisher } : {}),
        grossSales: parserCase.expected.grossSales,
        settlementAmount: parserCase.expected.settlementAmount,
        sourceFileName: `${parserCase.platform}-sample.xlsx`,
        sourceRowIndex: 2,
        issues: [],
      }),
    ]);
  });

  it("returns missing_column when a required mapped column is absent", () => {
    const row = { ...parserCase.validRow };
    delete row[parserCase.missingColumn];

    const result = parserCase.parse(contextFor(parserCase.platform), [row]);

    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        issueType: "missing_column",
        severity: "error",
        sourceFileName: `${parserCase.platform}-sample.xlsx`,
      }),
    ]);
  });

  it("returns missing_field when a required mapped value is blank", () => {
    const result = parserCase.parse(contextFor(parserCase.platform), [
      {
        ...parserCase.validRow,
        [parserCase.blankColumn]: "",
      },
    ]);

    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        issueType: "missing_field",
        severity: "error",
        sourceRowIndex: 2,
      }),
    ]);
  });

  it("returns invalid_value when money columns cannot be parsed", () => {
    const result = parserCase.parse(contextFor(parserCase.platform), [
      {
        ...parserCase.validRow,
        [parserCase.invalidMoneyColumn]: "not-a-number",
      },
    ]);

    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        issueType: "invalid_value",
        severity: "error",
        sourceRowIndex: 2,
      }),
    ]);
  });
});

describe("implemented Simple Extract mappings", () => {
  it("marks all first-pass Simple Extract mappings as ready", () => {
    expect(
      Object.values(simpleExtractMappings).map((mapping) => [mapping.platform, mapping.status]),
    ).toEqual([
      ["novelpia", "ready"],
      ["mootoon", "ready"],
      ["epyrus", "ready"],
      ["kyobo", "ready"],
      ["yes24", "ready"],
      ["aladin", "ready"],
      ["guru_company", "ready"],
    ]);
  });
});
