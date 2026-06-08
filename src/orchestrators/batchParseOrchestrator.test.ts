import { describe, expect, it } from "vitest";
import { parseCsvAdapter } from "../fileAdapters";
import type { FileAdapterContext, FileAdapterResult } from "../fileAdapters/types";
import type { TabularRow } from "../parsers";
import {
  SERIES_CATEGORY_COLUMN_MAPPINGS,
  SERIES_IDENTITY_COLUMNS,
  SERIES_REFERENCE_COLUMNS,
} from "../parsers/seriesColumnMappings";
import { simpleExtractMappings, type SimpleExtractPlatform } from "../parsers/simpleExtractMappings";
import type { Company, ParseIssue, Platform } from "../types/settlement";
import { runBatchParseOrchestrator } from "./batchParseOrchestrator";

function createSimpleExtractCsv(
  platform: SimpleExtractPlatform,
  values: {
    workTitle: string;
    author: string;
    grossSales: string;
    settlementAmount: string;
    publisher?: string;
  },
): string {
  const mapping = simpleExtractMappings[platform].columns;
  const headers = [
    mapping.workTitle,
    mapping.author,
    mapping.publisher,
    mapping.grossSales,
    mapping.settlementAmount,
  ].filter(Boolean);
  const row = [
    values.workTitle,
    values.author,
    values.publisher,
    values.grossSales,
    values.settlementAmount,
  ].filter((value) => value !== undefined);

  return [headers.join(","), row.join(",")].join("\n");
}

function createFile(input: {
  company: Company;
  platform: Platform;
  fileName: string;
  saleMonth?: string;
  content: unknown;
  fileKind?: "csv";
  slot?: string;
}) {
  return {
    company: input.company,
    platform: input.platform,
    fileKind: input.fileKind ?? "csv",
    fileName: input.fileName,
    saleMonth: input.saleMonth ?? "2026-06",
    slot: input.slot,
    content: input.content,
  };
}

function createSeriesRow(input: {
  sourceFileName: string;
  amount: number;
  title?: string;
}): TabularRow {
  return {
    [SERIES_IDENTITY_COLUMNS.workTitle]: input.title ?? "Same Series Work",
    [SERIES_IDENTITY_COLUMNS.author]: "Series Author",
    [SERIES_IDENTITY_COLUMNS.publisher]: "Arete",
    [SERIES_CATEGORY_COLUMN_MAPPINGS.cookie_auto_charge[5]]: input.amount,
    [SERIES_REFERENCE_COLUMNS.total]: input.amount,
    sourceFileName: input.sourceFileName,
    sourceRowIndex: 2,
  };
}

function createSeriesFile(input: {
  company?: Company;
  saleMonth?: string;
  fileName: string;
  slot: "general" | "app";
  amount: number;
}) {
  return createFile({
    company: input.company ?? "sr",
    platform: "series",
    fileName: input.fileName,
    saleMonth: input.saleMonth,
    slot: input.slot,
    content: createSeriesRow({
      sourceFileName: input.fileName,
      amount: input.amount,
    }),
  });
}

function createSeriesFiles(): ReturnType<typeof createSeriesFile>[] {
  return [
    createSeriesFile({ fileName: "general-1.csv", slot: "general", amount: 100 }),
    createSeriesFile({ fileName: "general-2.csv", slot: "general", amount: 200 }),
    createSeriesFile({ fileName: "general-3.csv", slot: "general", amount: 300 }),
    createSeriesFile({ fileName: "app-1.csv", slot: "app", amount: 400 }),
    createSeriesFile({ fileName: "app-2.csv", slot: "app", amount: 500 }),
    createSeriesFile({ fileName: "app-3.csv", slot: "app", amount: 600 }),
  ];
}

function createSeriesAdapter(issueByFileName: Record<string, ParseIssue> = {}) {
  return (context: FileAdapterContext, file: unknown): FileAdapterResult => {
    if (context.platform !== "series") {
      return parseCsvAdapter(context, file);
    }

    const row = file as TabularRow;
    const sourceFileName = String(row.sourceFileName);

    return {
      rows: [row],
      issues: issueByFileName[sourceFileName] === undefined ? [] : [issueByFileName[sourceFileName]],
    };
  };
}

describe("batch parse orchestrator", () => {
  it("parses raon and sr files in one batch", () => {
    const result = runBatchParseOrchestrator({
      batchId: "batch-parse-1",
      files: [
        createFile({
          company: "raon",
          platform: "guru_company",
          fileName: "raon-guru.csv",
          content: createSimpleExtractCsv("guru_company", {
            workTitle: "검은 별의 서점",
            author: "한도윤",
            grossSales: "18420",
            settlementAmount: "7368",
          }),
        }),
        createFile({
          company: "sr",
          platform: "kyobo",
          fileName: "sr-kyobo.csv",
          content: createSimpleExtractCsv("kyobo", {
            workTitle: "푸른 달",
            author: "서하린",
            publisher: "에스알",
            grossSales: "25000",
            settlementAmount: "10000",
          }),
        }),
      ],
    });

    expect(result.issues).toEqual([]);
    expect(result.rows).toEqual([
      expect.objectContaining({
        company: "raon",
        platform: "guru_company",
        saleMonth: "2026-06",
        sourceFileName: "raon-guru.csv",
        workTitle: "검은 별의 서점",
      }),
      expect.objectContaining({
        company: "sr",
        platform: "kyobo",
        saleMonth: "2026-06",
        sourceFileName: "sr-kyobo.csv",
        workTitle: "푸른 달",
      }),
    ]);
    expect(result.fileResults).toEqual([
      expect.objectContaining({ fileName: "raon-guru.csv", status: "success", rowCount: 1, issueCount: 0 }),
      expect.objectContaining({ fileName: "sr-kyobo.csv", status: "success", rowCount: 1, issueCount: 0 }),
    ]);
  });

  it("keeps successful rows when another file fails", () => {
    const result = runBatchParseOrchestrator({
      batchId: "batch-parse-2",
      files: [
        createFile({
          company: "raon",
          platform: "guru_company",
          fileName: "valid.csv",
          content: createSimpleExtractCsv("guru_company", {
            workTitle: "검은 별의 서점",
            author: "한도윤",
            grossSales: "18420",
            settlementAmount: "7368",
          }),
        }),
        createFile({
          company: "sr",
          platform: "yes24",
          fileName: "empty.csv",
          content: "",
        }),
      ],
    });

    expect(result.rows).toHaveLength(1);
    expect(result.issues).toEqual([
      expect.objectContaining({
        company: "sr",
        platform: "yes24",
        issueType: "parse_error",
        sourceFileName: "empty.csv",
      }),
    ]);
    expect(result.fileResults).toEqual([
      expect.objectContaining({ fileName: "valid.csv", status: "success", rowCount: 1, issueCount: 0 }),
      expect.objectContaining({ fileName: "empty.csv", status: "failed", rowCount: 0, issueCount: 1 }),
    ]);
  });

  it("preserves company, platform, saleMonth, and sourceFileName per row", () => {
    const result = runBatchParseOrchestrator({
      batchId: "batch-parse-3",
      files: [
        createFile({
          company: "sr",
          platform: "aladin",
          fileName: "sr-aladin.csv",
          saleMonth: "2026-05",
          content: createSimpleExtractCsv("aladin", {
            workTitle: "바람의 기록",
            author: "김서윤",
            publisher: "에스알",
            grossSales: "33000",
            settlementAmount: "13200",
          }),
        }),
      ],
    });

    expect(result.rows[0]).toEqual(
      expect.objectContaining({
        company: "sr",
        platform: "aladin",
        saleMonth: "2026-05",
        sourceFileName: "sr-aladin.csv",
      }),
    );
  });

  it("returns series group validation issues in the batch result", () => {
    const result = runBatchParseOrchestrator({
      batchId: "batch-parse-4",
      files: [
        createFile({
          company: "raon",
          platform: "series",
          fileName: "series.csv",
          content: createSimpleExtractCsv("guru_company", {
            workTitle: "검은 별의 서점",
            author: "한도윤",
            grossSales: "18420",
            settlementAmount: "7368",
          }),
        }),
      ],
    });

    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({ platform: "series", issueType: "mapping_failed" }),
    ]);
    expect(result.fileResults[0]).toEqual(
      expect.objectContaining({ fileName: "series.csv", status: "success", rowCount: 1, issueCount: 0 }),
    );
  });

  it("groups series files by company, saleMonth, and platform before running the group parser", () => {
    const result = runBatchParseOrchestrator(
      {
        batchId: "batch-series-1",
        files: createSeriesFiles(),
      },
      {
        adapters: {
          csv: createSeriesAdapter(),
        },
      },
    );

    expect(result.issues).toEqual([]);
    expect(result.rows).toEqual([
      expect.objectContaining({
        company: "sr",
        platform: "series",
        saleMonth: "2026-06",
        workTitle: "Same Series Work",
        mailerContentTitle: "Same Series Work",
        grossSales: 600,
        settlementAmount: 407.4,
        sourceFileName: "general-1.csv",
      }),
      expect.objectContaining({
        company: "sr",
        platform: "series",
        saleMonth: "2026-06",
        workTitle: "Same Series Work",
        mailerContentTitle: "Same Series Work(app)",
        grossSales: 1500,
        settlementAmount: 1018.5,
        sourceFileName: "app-1.csv",
      }),
    ]);
    expect(result.fileResults).toHaveLength(6);
    expect(result.fileResults).toEqual(
      createSeriesFiles().map((file) =>
        expect.objectContaining({
          fileName: file.fileName,
          status: "success",
          rowCount: 1,
          issueCount: 0,
        }),
      ),
    );
  });

  it("keeps non-series files on the existing single-file orchestrator path", () => {
    const result = runBatchParseOrchestrator(
      {
        batchId: "batch-mixed-1",
        files: [
          createFile({
            company: "raon",
            platform: "guru_company",
            fileName: "raon-guru.csv",
            content: createSimpleExtractCsv("guru_company", {
              workTitle: "Simple Work",
              author: "Simple Author",
              grossSales: "18420",
              settlementAmount: "7368",
            }),
          }),
          ...createSeriesFiles(),
        ],
      },
      {
        adapters: {
          csv: createSeriesAdapter(),
        },
      },
    );

    expect(result.issues).toEqual([]);
    expect(result.rows).toEqual([
      expect.objectContaining({
        platform: "guru_company",
        workTitle: "Simple Work",
        grossSales: 18420,
      }),
      expect.objectContaining({
        platform: "series",
        mailerContentTitle: "Same Series Work",
        grossSales: 600,
      }),
      expect.objectContaining({
        platform: "series",
        mailerContentTitle: "Same Series Work(app)",
        grossSales: 1500,
      }),
    ]);
  });

  it("does not distribute series group validation issues into per-file results", () => {
    const files = createSeriesFiles().slice(0, 5);

    const result = runBatchParseOrchestrator(
      {
        batchId: "batch-series-invalid",
        files,
      },
      {
        adapters: {
          csv: createSeriesAdapter(),
        },
      },
    );

    expect(result.rows).toEqual([]);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        platform: "series",
        issueType: "mapping_failed",
      }),
    );
    expect(result.fileResults).toEqual(
      files.map((file) =>
        expect.objectContaining({
          fileName: file.fileName,
          status: "success",
          rowCount: 1,
          issueCount: 0,
        }),
      ),
    );
  });

  it("returns unsupported fileKind issues in the batch result", () => {
    const result = runBatchParseOrchestrator({
      batchId: "batch-parse-5",
      files: [
        {
          company: "raon",
          platform: "guru_company",
          fileKind: "unsupported_kind" as "csv",
          fileName: "unknown.dat",
          saleMonth: "2026-06",
          content: "ignored",
        },
      ],
    });

    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({ issueType: "parse_error", message: expect.stringContaining("Unsupported fileKind") }),
    ]);
    expect(result.fileResults[0]).toEqual(
      expect.objectContaining({ fileName: "unknown.dat", status: "failed", rowCount: 0, issueCount: 1 }),
    );
  });
});
