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
