import { readFileSync } from "node:fs";
import * as path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { simpleExtractMappings } from "../parsers/simpleExtractMappings";
import type { ParserContext, ParserResult, TabularRow } from "../parsers/parserContract";
import type { FileAdapterContext, FileAdapterResult } from "../fileAdapters/types";
import type { ParseIssue, Platform } from "../types/settlement";
import { runFileParseOrchestrator } from "./fileParseOrchestrator";

const adapterContext: FileAdapterContext = {
  batchId: "batch-orchestrator",
  company: "raon",
  platform: "guru_company",
  saleMonth: "2026-06",
  sourceFileName: "guru-company.csv",
  fileKind: "csv",
};

const parserContext: ParserContext = {
  batchId: "batch-orchestrator",
  company: "raon",
  platform: "guru_company",
  saleMonth: "2026-06",
  sourceFileName: "guru-company.csv",
};

function createGuruCompanyCsv(): string {
  const mapping = simpleExtractMappings.guru_company.columns;

  return [
    [
      mapping.workTitle,
      mapping.author,
      mapping.grossSales,
      mapping.settlementAmount,
    ].join(","),
    ["검은 별의 서점", "한도윤", "18420", "7368"].join(","),
  ].join("\n");
}

function createIssue(
  issueType: ParseIssue["issueType"],
  message: string,
  platform: Platform = "guru_company",
): ParseIssue {
  return {
    issueId: `batch-orchestrator-${platform}-${issueType}`,
    batchId: "batch-orchestrator",
    company: "raon",
    platform,
    severity: "error",
    issueType,
    message,
    sourceFileName: "guru-company.csv",
  };
}

function readMisterblueSampleWorkbook(): Uint8Array {
  return readFileSync(
    path.resolve(
      process.cwd(),
      "tmp/platform-samples/misterblue/작품별정산_2026-04-01_2026-04-30.xlsx",
    ),
  );
}

function readEpyrusSampleCsv(): Uint8Array {
  return readFileSync(
    path.resolve(
      process.cwd(),
      "tmp/platform-samples/epyrus/2026년04월정산내역_라온E＆M.csv",
    ),
  );
}

function readPanmurimSampleWorkbook(): Uint8Array {
  return readFileSync(
    path.resolve(
      process.cwd(),
      "tmp/platform-samples/panmurim/（주）라온이앤엠_2026년 5월.xlsx",
    ),
  );
}

function readBookcubeSampleWorkbook(): Uint8Array {
  return readFileSync(
    path.resolve(
      process.cwd(),
      "tmp/platform-samples/bookcube/북큐브 상세매출 2026-5~2026-5 (1).xlsx",
    ),
  );
}

function readOnestoreSampleWorkbook(): Uint8Array {
  return readFileSync(
    path.resolve(
      process.cwd(),
      "tmp/platform-samples/onestore/정산내역_20260608_163327.xlsx",
    ),
  );
}

function readKyoboSampleWorkbook(): Uint8Array {
  return readFileSync(
    path.resolve(
      process.cwd(),
      "tmp/platform-samples/kyobo/정산내역조회.xlsx",
    ),
  );
}

function readNovelpiaSampleHtmlXls(): string {
  return readFileSync(
    path.resolve(
      process.cwd(),
      "tmp/platform-samples/novelpia/일별 정산.xls",
    ),
    "utf8",
  );
}

describe("file parse orchestrator", () => {
  it("runs CSV adapter then parser registry to create SettlementRow objects", () => {
    const result = runFileParseOrchestrator({
      fileKind: "csv",
      platform: "guru_company",
      adapterContext,
      parserContext,
      fileContent: createGuruCompanyCsv(),
    });

    expect(result.issues).toEqual([]);
    expect(result.rows).toEqual([
      expect.objectContaining({
        company: "raon",
        platform: "guru_company",
        workTitle: "검은 별의 서점",
        mailerContentTitle: "검은 별의 서점",
        author: "한도윤",
        grossSales: 18420,
        settlementAmount: 7368,
        sourceFileName: "guru-company.csv",
        sourceRowIndex: 2,
      }),
    ]);
  });

  it("runs the Epyrus CP949 sample through the file orchestrator", () => {
    const result = runFileParseOrchestrator({
      fileKind: "csv",
      platform: "epyrus",
      adapterContext: {
        ...adapterContext,
        company: "raon",
        platform: "epyrus",
        saleMonth: "2026-04",
        sourceFileName: "2026년04월정산내역_라온E＆M.csv",
        fileKind: "csv",
      },
      parserContext: {
        ...parserContext,
        company: "raon",
        platform: "epyrus",
        saleMonth: "2026-04",
        sourceFileName: "2026년04월정산내역_라온E＆M.csv",
      },
      fileContent: readEpyrusSampleCsv(),
    });

    expect(result.issues).toEqual([]);
    expect(result.rows).toHaveLength(151);
    expect(result.rows[0]).toEqual(
      expect.objectContaining({
        platform: "epyrus",
        saleMonth: "2026-04",
        workTitle: "그의 비밀 2",
        mailerContentTitle: "그의 비밀 2",
        author: "시커먼스",
        publisher: "라온E＆M",
        grossSales: 2720,
        settlementAmount: 1904,
        sourceFileName: "2026년04월정산내역_라온E＆M.csv",
        sourceRowIndex: 2,
      }),
    );
  });

  it("runs the Misterblue XLSX adapter and parser through the file orchestrator", () => {
    const result = runFileParseOrchestrator({
      fileKind: "xlsx",
      platform: "misterblue",
      adapterContext: {
        ...adapterContext,
        company: "raon",
        platform: "misterblue",
        saleMonth: "2026-04",
        sourceFileName: "작품별정산_2026-04-01_2026-04-30.xlsx",
        fileKind: "xlsx",
      },
      parserContext: {
        ...parserContext,
        company: "raon",
        platform: "misterblue",
        saleMonth: "2026-04",
        sourceFileName: "작품별정산_2026-04-01_2026-04-30.xlsx",
      },
      fileContent: readMisterblueSampleWorkbook(),
    });

    expect(result.issues).toEqual([]);
    expect(result.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          platform: "misterblue",
          saleMonth: "2026-04",
          workTitle: "대물로 태어나게 해주세요!",
          mailerContentTitle: "대물로 태어나게 해주세요!",
          grossSales: 480000,
          settlementAmount: 296949.5,
          sourceFileName: "작품별정산_2026-04-01_2026-04-30.xlsx",
        }),
        expect.objectContaining({
          platform: "misterblue",
          saleMonth: "2026-04",
          workTitle: "대물로 태어나게 해주세요!",
          mailerContentTitle: "대물로 태어나게 해주세요!(app)",
          grossSales: 99960,
          settlementAmount: 61839.7,
          sourceFileName: "작품별정산_2026-04-01_2026-04-30.xlsx",
        }),
      ]),
    );
  });

  it("runs the Panmurim XLSX adapter and parser through the file orchestrator", () => {
    const result = runFileParseOrchestrator({
      fileKind: "xlsx",
      platform: "panmurim",
      adapterContext: {
        ...adapterContext,
        company: "raon",
        platform: "panmurim",
        saleMonth: "2026-05",
        sourceFileName: "（주）라온이앤엠_2026년 5월.xlsx",
        fileKind: "xlsx",
      },
      parserContext: {
        ...parserContext,
        company: "raon",
        platform: "panmurim",
        saleMonth: "2026-05",
        sourceFileName: "（주）라온이앤엠_2026년 5월.xlsx",
      },
      fileContent: readPanmurimSampleWorkbook(),
    });

    expect(result.issues).toEqual([]);
    expect(result.rows).toHaveLength(354);
    expect(result.rows[0]).toEqual(
      expect.objectContaining({
        platform: "panmurim",
        saleMonth: "2026-05",
        workTitle: "그의 비밀 2권",
        mailerContentTitle: "그의 비밀 2권",
        author: "시커먼스",
        publisher: "라온E&M",
        grossSales: 3200,
        settlementAmount: 2240,
        sourceFileName: "（주）라온이앤엠_2026년 5월.xlsx",
        sourceRowIndex: 5,
      }),
    );
  });

  it("runs the Bookcube XLSX adapter and parser through the file orchestrator", () => {
    const result = runFileParseOrchestrator({
      fileKind: "xlsx",
      platform: "bookcube",
      adapterContext: {
        ...adapterContext,
        company: "raon",
        platform: "bookcube",
        saleMonth: "2026-05",
        sourceFileName: "북큐브 상세매출 2026-5~2026-5 (1).xlsx",
        fileKind: "xlsx",
      },
      parserContext: {
        ...parserContext,
        company: "raon",
        platform: "bookcube",
        saleMonth: "2026-05",
        sourceFileName: "북큐브 상세매출 2026-5~2026-5 (1).xlsx",
      },
      fileContent: readBookcubeSampleWorkbook(),
    });

    expect(result.issues).toEqual([]);
    expect(result.rows).toHaveLength(5);
    expect(result.rows[0]).toEqual(
      expect.objectContaining({
        platform: "bookcube",
        saleMonth: "2026-05",
        workTitle: "짝사랑을 끝냈더니 소꿉친구들이 나에게 집착한다 1",
        mailerContentTitle: "짝사랑을 끝냈더니 소꿉친구들이 나에게 집착한다 1",
        author: "봄날의복길이",
        publisher: "B cafe",
        grossSales: 3000,
        settlementAmount: 2100,
        sourceFileName: "북큐브 상세매출 2026-5~2026-5 (1).xlsx",
        sourceRowIndex: 3,
      }),
    );
  });

  it("runs the Kyobo XLSX adapter and parser through the file orchestrator", () => {
    const result = runFileParseOrchestrator({
      fileKind: "xlsx",
      platform: "kyobo",
      adapterContext: {
        ...adapterContext,
        company: "sr",
        platform: "kyobo",
        saleMonth: "2026-05",
        sourceFileName: "정산내역조회.xlsx",
        fileKind: "xlsx",
      },
      parserContext: {
        ...parserContext,
        company: "sr",
        platform: "kyobo",
        saleMonth: "2026-05",
        sourceFileName: "정산내역조회.xlsx",
      },
      fileContent: readKyoboSampleWorkbook(),
    });

    expect(result.issues).toEqual([]);
    expect(result.rows).toHaveLength(46);
    expect(result.rows[0]).toEqual(
      expect.objectContaining({
        company: "sr",
        platform: "kyobo",
        saleMonth: "2026-05",
        workTitle: "1챕터의 고인물. 6",
        mailerContentTitle: "1챕터의 고인물. 6",
        author: "산호초",
        publisher: "Arete",
        grossSales: 900,
        settlementAmount: 450,
        sourceFileName: "정산내역조회.xlsx",
        sourceRowIndex: 2,
      }),
    );
  });

  it("runs the Novelpia HTML-XLS adapter and parser through the file orchestrator", () => {
    const result = runFileParseOrchestrator({
      fileKind: "html_xls",
      platform: "novelpia",
      adapterContext: {
        ...adapterContext,
        company: "raon",
        platform: "novelpia",
        saleMonth: "2026-05",
        sourceFileName: "일별 정산.xls",
        fileKind: "html_xls",
      },
      parserContext: {
        ...parserContext,
        company: "raon",
        platform: "novelpia",
        saleMonth: "2026-05",
        sourceFileName: "일별 정산.xls",
      },
      fileContent: readNovelpiaSampleHtmlXls(),
    });

    expect(result.issues).toEqual([]);
    expect(result.rows).toHaveLength(116);
    expect(result.rows[0]).toEqual(
      expect.objectContaining({
        company: "raon",
        platform: "novelpia",
        saleMonth: "2026-05",
        workTitle: "객잔 주인이 요리를 너무 잘함",
        mailerContentTitle: "객잔 주인이 요리를 너무 잘함",
        author: "해씨",
        grossSales: 3800,
        settlementAmount: 2394,
        sourceFileName: "일별 정산.xls",
        sourceRowIndex: 2,
      }),
    );
  });

  it("runs the Onestore XLSX adapter and parser through the file orchestrator", () => {
    const result = runFileParseOrchestrator({
      fileKind: "xlsx",
      platform: "onestore",
      adapterContext: {
        ...adapterContext,
        company: "raon",
        platform: "onestore",
        saleMonth: "2026-06",
        sourceFileName: "정산내역_20260608_163327.xlsx",
        fileKind: "xlsx",
      },
      parserContext: {
        ...parserContext,
        company: "raon",
        platform: "onestore",
        saleMonth: "2026-06",
        sourceFileName: "정산내역_20260608_163327.xlsx",
      },
      fileContent: readOnestoreSampleWorkbook(),
    });

    expect(result.issues).toEqual([]);
    expect(result.rows).toHaveLength(13209);
    expect(result.rows[0]).toEqual(
      expect.objectContaining({
        company: "sr",
        platform: "onestore",
        saleMonth: "2026-06",
        workTitle: "레이드 커맨더 4권",
        mailerContentTitle: "레이드 커맨더 4권",
        author: "산호초",
        publisher: "Arete",
        grossSales: 3200,
        settlementAmount: 2016,
        sourceFileName: "정산내역_20260608_163327.xlsx",
        sourceRowIndex: 3,
      }),
    );
  });

  it("returns adapter parse_error without calling the parser when adapter fails", () => {
    const parseRows = vi.fn<
      (platform: Platform, context: ParserContext, rows: TabularRow[]) => ParserResult
    >();
    const result = runFileParseOrchestrator(
      {
        fileKind: "csv",
        platform: "guru_company",
        adapterContext,
        parserContext,
        fileContent: "",
      },
      {
        parseRows,
      },
    );

    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        issueType: "parse_error",
        message: expect.stringContaining("empty"),
      }),
    ]);
    expect(parseRows).not.toHaveBeenCalled();
  });

  it("returns parse_error for an unsupported fileKind", () => {
    const result = runFileParseOrchestrator({
      fileKind: "unsupported_kind" as "csv",
      platform: "guru_company",
      adapterContext,
      parserContext,
      fileContent: createGuruCompanyCsv(),
    });

    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        issueType: "parse_error",
        message: expect.stringContaining("Unsupported fileKind"),
      }),
    ]);
  });

  it("returns registry issue for an unsupported platform", () => {
    const result = runFileParseOrchestrator({
      fileKind: "csv",
      platform: "series",
      adapterContext: { ...adapterContext, platform: "series" },
      parserContext: { ...parserContext, platform: "series" },
      fileContent: createGuruCompanyCsv(),
    });

    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        platform: "series",
        issueType: "mapping_failed",
      }),
    ]);
  });

  it("merges adapter issues and parser issues", () => {
    const adapterIssue = createIssue("parse_error", "adapter warning-like issue");
    const parserIssue = createIssue("missing_column", "parser issue");
    const adapter = vi.fn<(context: FileAdapterContext, file: unknown) => FileAdapterResult>(() => ({
      rows: [{ sourceFileName: "guru-company.csv", sourceRowIndex: 2 }],
      issues: [adapterIssue],
    }));
    const parseRows = vi.fn<
      (platform: Platform, context: ParserContext, rows: TabularRow[]) => ParserResult
    >(() => ({
      rows: [],
      issues: [parserIssue],
    }));

    const result = runFileParseOrchestrator(
      {
        fileKind: "csv",
        platform: "guru_company",
        adapterContext,
        parserContext,
        fileContent: "ignored",
      },
      {
        adapters: {
          csv: adapter,
        },
        parseRows,
      },
    );

    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual([adapterIssue, parserIssue]);
  });

  it("normalizes parserContext.platform to the requested platform", () => {
    const parseRows = vi.fn<
      (platform: Platform, context: ParserContext, rows: TabularRow[]) => ParserResult
    >(() => ({
      rows: [],
      issues: [],
    }));

    runFileParseOrchestrator(
      {
        fileKind: "csv",
        platform: "guru_company",
        adapterContext,
        parserContext: { ...parserContext, platform: "series" },
        fileContent: createGuruCompanyCsv(),
      },
      {
        parseRows,
      },
    );

    expect(parseRows).toHaveBeenCalledWith(
      "guru_company",
      expect.objectContaining({ platform: "guru_company" }),
      expect.any(Array),
    );
  });
});
