import { describe, expect, it } from "vitest";
import { parseCsvAdapter } from "../fileAdapters";
import type { FileAdapterContext, FileAdapterResult } from "../fileAdapters/types";
import type { TabularRow } from "../parsers";
import {
  SERIES_CATEGORY_COLUMN_MAPPINGS,
  SERIES_IDENTITY_COLUMNS,
  SERIES_REFERENCE_COLUMNS,
} from "../parsers/seriesColumnMappings";
import { RIDIBOOKS_REQUIRED_COLUMNS as RIDIBOOKS_COLUMNS } from "../parsers/ridibooksCalcConstants";
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
  fileKind?: "csv" | "xlsx";
  slot?: string;
  eventPeriod?: {
    startDate: string;
    endDate: string;
  };
}) {
  return {
    company: input.company,
    platform: input.platform,
    fileKind: input.fileKind ?? "csv",
    fileName: input.fileName,
    saleMonth: input.saleMonth ?? "2026-06",
    slot: input.slot,
    eventPeriod: input.eventPeriod,
    content: input.content,
  };
}

function createSeriesRow(input: {
  sourceFileName: string;
  amount: number;
  title?: string;
  author?: string;
  publisher?: string;
  googleExternal?: number;
}): TabularRow {
  return {
    [SERIES_IDENTITY_COLUMNS.workTitle]: input.title ?? "Same Series Work",
    [SERIES_IDENTITY_COLUMNS.author]: input.author ?? "Series Author",
    [SERIES_IDENTITY_COLUMNS.publisher]: input.publisher ?? "Arete",
    [SERIES_CATEGORY_COLUMN_MAPPINGS.cookie_auto_charge[5]]: input.amount,
    [SERIES_CATEGORY_COLUMN_MAPPINGS.google_external[1]]: input.googleExternal ?? 0,
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

function createSanitizedSeriesSampleRows(sourceFileName: string, multiplier: number): TabularRow[] {
  return [
    createSeriesRow({
      sourceFileName,
      title: "Sanitized Series Work 1",
      author: "Author 1",
      amount: 700 * multiplier,
    }),
    createSeriesRow({
      sourceFileName,
      title: "Sanitized Series Work 2",
      author: "Author 2",
      amount: 300 * multiplier,
      googleExternal: 120 * multiplier,
    }),
    createSeriesRow({
      sourceFileName,
      title: "Sanitized Series Work 3",
      author: "Author 3",
      amount: 200 * multiplier,
    }),
    createSeriesRow({
      sourceFileName,
      title: "Sanitized Series Work 4",
      author: "Author 4",
      amount: 100 * multiplier,
    }),
    createSeriesRow({
      sourceFileName,
      title: "Sanitized Series Work 5",
      author: "Author 5",
      amount: 0,
    }),
  ];
}

function createSanitizedSeriesSampleFile(input: {
  fileName: string;
  slot: "general" | "app";
  multiplier: number;
}) {
  return createFile({
    company: "sr",
    platform: "series",
    fileName: input.fileName,
    slot: input.slot,
    content: createSanitizedSeriesSampleRows(input.fileName, input.multiplier),
  });
}

function createSanitizedSeriesSampleFiles(): ReturnType<typeof createSanitizedSeriesSampleFile>[] {
  return [
    createSanitizedSeriesSampleFile({ fileName: "series-general-1.xls", slot: "general", multiplier: 1 }),
    createSanitizedSeriesSampleFile({ fileName: "series-general-2.xls", slot: "general", multiplier: 2 }),
    createSanitizedSeriesSampleFile({ fileName: "series-general-3.xls", slot: "general", multiplier: 3 }),
    createSanitizedSeriesSampleFile({ fileName: "series-app-1.xls", slot: "app", multiplier: 4 }),
    createSanitizedSeriesSampleFile({ fileName: "series-app-2.xls", slot: "app", multiplier: 5 }),
    createSanitizedSeriesSampleFile({ fileName: "series-app-3.xls", slot: "app", multiplier: 6 }),
  ];
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
    if (
      context.platform !== "series"
      && context.platform !== "ridibooks"
      && context.platform !== "munpia"
    ) {
      return parseCsvAdapter(context, file);
    }

    const rows = Array.isArray(file) ? (file as TabularRow[]) : [file as TabularRow];
    const sourceFileName = String(rows[0]?.sourceFileName);

    return {
      rows,
      issues: issueByFileName[sourceFileName] === undefined ? [] : [issueByFileName[sourceFileName]],
    };
  };
}

function createMunpiaSettlementRow(overrides: Partial<TabularRow> = {}): TabularRow {
  return {
    번호: 1,
    작품코드: "485076",
    계정: "munpia-main",
    작가: "AreteBooks",
    작품: "나 혼자 히든농장",
    총매출: 2000,
    IOS매출: 1000,
    Google매출: 1000,
    정산: 2268,
    sourceFileName: "munpia-settlement.xlsx",
    sourceRowIndex: 3,
    ...overrides,
  };
}

function createMunpiaAuthorCorrectionRow(overrides: Partial<TabularRow> = {}): TabularRow {
  return {
    작품코드: "485076",
    계정: "munpia-main",
    작품: "나 혼자 히든농장",
    작가명: "Corrected Author",
    sourceFileName: "munpia-author-correction.csv",
    sourceRowIndex: 2,
    ...overrides,
  };
}

function createMunpiaFile(input: {
  fileName: string;
  slot: "settlement" | "authorCorrection";
  content: TabularRow[];
  fileKind?: "csv" | "xlsx";
}) {
  return createFile({
    company: "sr",
    platform: "munpia",
    fileName: input.fileName,
    slot: input.slot,
    fileKind: input.fileKind ?? (input.slot === "settlement" ? "xlsx" : "csv"),
    content: input.content,
  });
}

function createRidibooksBaseRow(overrides: Partial<TabularRow> = {}): TabularRow {
  const [bookId, title, author, publisher] = RIDIBOOKS_COLUMNS.base.identity;
  const [
    normalSales,
    normalCancel,
    appTargetAmount,
    appFee,
    appCancelAmount,
    settlementAmount,
  ] = RIDIBOOKS_COLUMNS.base.amounts;

  return {
    [bookId]: "RIDI-001",
    [title]: "Ridibooks Work",
    [author]: "Ridibooks Author",
    [publisher]: "Ridibooks Publisher",
    [normalSales]: "1,000",
    [normalCancel]: "-100",
    [appTargetAmount]: "500",
    [appFee]: "150",
    [appCancelAmount]: "-50",
    [settlementAmount]: "999",
    sourceFileName: "calculate_1.csv",
    sourceRowIndex: 2,
    ...overrides,
  };
}

function createRidibooksFile1Row(overrides: Partial<TabularRow> = {}): TabularRow {
  const [bookId, title] = RIDIBOOKS_COLUMNS.file1.identity;
  const [normalSales, normalCancel, settlementAmount] = RIDIBOOKS_COLUMNS.file1.amounts;

  return {
    [bookId]: "RIDI-001",
    [title]: "Ridibooks Work",
    [normalSales]: "200",
    [normalCancel]: "-20",
    [settlementAmount]: "30",
    sourceFileName: "calculate_1 (1).csv",
    sourceRowIndex: 2,
    ...overrides,
  };
}

function createRidibooksEventRow(overrides: Partial<TabularRow> = {}): TabularRow {
  const [bookId, title] = RIDIBOOKS_COLUMNS.event.identity;
  const [
    paidAt,
    normalSales,
    normalSettlementAmount,
    iosTargetAmount,
    iosSettlementAmount,
    androidTargetAmount,
    androidSettlementAmount,
    oneStoreTargetAmount,
    oneStoreSettlementAmount,
  ] = RIDIBOOKS_COLUMNS.event.amounts;

  return {
    [bookId]: "RIDI-001",
    [title]: "Ridibooks Work",
    [paidAt]: "2026-06-15",
    [normalSales]: "1,000",
    [normalSettlementAmount]: "700",
    [iosTargetAmount]: "100",
    [iosSettlementAmount]: "44.1",
    [androidTargetAmount]: "200",
    [androidSettlementAmount]: "113.4",
    [oneStoreTargetAmount]: "300",
    [oneStoreSettlementAmount]: "210",
    sourceFileName: "calculate_date_tran_1.csv",
    sourceRowIndex: 2,
    ...overrides,
  };
}

function createRidibooksMgCorrectionRow(overrides: Partial<TabularRow> = {}): TabularRow {
  const [bookId] = RIDIBOOKS_COLUMNS.mgCorrection.matching;
  const [mgFlag] = RIDIBOOKS_COLUMNS.mgCorrection.values;

  return {
    [bookId]: "RIDI-001",
    [mgFlag]: "Y",
    sourceFileName: "ridibooks-mg.csv",
    sourceRowIndex: 2,
    ...overrides,
  };
}

function createRidibooksFile(input: {
  fileName: string;
  slot: "base" | "file1" | "event" | "mgCorrection";
  content: TabularRow[];
  eventPeriod?: {
    startDate: string;
    endDate: string;
  };
}) {
  return createFile({
    company: "raon",
    platform: "ridibooks",
    fileName: input.fileName,
    slot: input.slot,
    content: input.content,
    eventPeriod: input.eventPeriod,
  });
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

  it("parses sanitized six-file series fixtures into expected aggregated settlement rows", () => {
    const result = runBatchParseOrchestrator(
      {
        batchId: "batch-series-sanitized-fixture",
        files: createSanitizedSeriesSampleFiles(),
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
        workTitle: "Sanitized Series Work 1",
        mailerContentTitle: "Sanitized Series Work 1",
        grossSales: 4200,
        settlementAmount: 2851.8,
        sourceFileName: "series-general-1.xls",
      }),
      expect.objectContaining({
        workTitle: "Sanitized Series Work 2",
        mailerContentTitle: "Sanitized Series Work 2",
        grossSales: 2520,
        settlementAmount: 1680.84,
        sourceFileName: "series-general-1.xls",
      }),
      expect.objectContaining({
        workTitle: "Sanitized Series Work 3",
        mailerContentTitle: "Sanitized Series Work 3",
        grossSales: 1200,
        settlementAmount: 814.8,
        sourceFileName: "series-general-1.xls",
      }),
      expect.objectContaining({
        workTitle: "Sanitized Series Work 4",
        mailerContentTitle: "Sanitized Series Work 4",
        grossSales: 600,
        settlementAmount: 407.4,
        sourceFileName: "series-general-1.xls",
      }),
      expect.objectContaining({
        workTitle: "Sanitized Series Work 5",
        mailerContentTitle: "Sanitized Series Work 5",
        grossSales: 0,
        settlementAmount: 0,
        sourceFileName: "series-general-1.xls",
      }),
      expect.objectContaining({
        workTitle: "Sanitized Series Work 1",
        mailerContentTitle: "Sanitized Series Work 1(app)",
        grossSales: 10500,
        settlementAmount: 7129.5,
        sourceFileName: "series-app-1.xls",
      }),
      expect.objectContaining({
        workTitle: "Sanitized Series Work 2",
        mailerContentTitle: "Sanitized Series Work 2(app)",
        grossSales: 6300,
        settlementAmount: 4202.1,
        sourceFileName: "series-app-1.xls",
      }),
      expect.objectContaining({
        workTitle: "Sanitized Series Work 3",
        mailerContentTitle: "Sanitized Series Work 3(app)",
        grossSales: 3000,
        settlementAmount: 2037,
        sourceFileName: "series-app-1.xls",
      }),
      expect.objectContaining({
        workTitle: "Sanitized Series Work 4",
        mailerContentTitle: "Sanitized Series Work 4(app)",
        grossSales: 1500,
        settlementAmount: 1018.5,
        sourceFileName: "series-app-1.xls",
      }),
      expect.objectContaining({
        workTitle: "Sanitized Series Work 5",
        mailerContentTitle: "Sanitized Series Work 5(app)",
        grossSales: 0,
        settlementAmount: 0,
        sourceFileName: "series-app-1.xls",
      }),
    ]);
    expect(result.fileResults).toEqual(
      createSanitizedSeriesSampleFiles().map((file) =>
        expect.objectContaining({
          fileName: file.fileName,
          status: "success",
          rowCount: 5,
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

  it("groups ridibooks base and file1 files before running the group parser", () => {
    const result = runBatchParseOrchestrator(
      {
        batchId: "batch-ridibooks-1",
        files: [
          createRidibooksFile({
            fileName: "calculate_1.csv",
            slot: "base",
            content: [createRidibooksBaseRow()],
          }),
          createRidibooksFile({
            fileName: "calculate_1 (1).csv",
            slot: "file1",
            content: [createRidibooksFile1Row()],
          }),
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
        company: "raon",
        platform: "ridibooks",
        workTitle: "Ridibooks Work",
        mailerContentTitle: "Ridibooks Work",
        grossSales: 720,
        settlementAmount: 534,
      }),
      expect.objectContaining({
        company: "raon",
        platform: "ridibooks",
        mailerContentTitle: "Ridibooks Work(app)",
        grossSales: 550,
        settlementAmount: 280,
      }),
    ]);
    expect(result.fileResults).toEqual([
      expect.objectContaining({ fileName: "calculate_1.csv", status: "success", rowCount: 1, issueCount: 0 }),
      expect.objectContaining({ fileName: "calculate_1 (1).csv", status: "success", rowCount: 1, issueCount: 0 }),
    ]);
  });

  it("passes ridibooks eventPeriod to event files and keeps group issues out of fileResults", () => {
    const result = runBatchParseOrchestrator(
      {
        batchId: "batch-ridibooks-event",
        files: [
          createRidibooksFile({
            fileName: "calculate_1.csv",
            slot: "base",
            content: [createRidibooksBaseRow()],
          }),
          createRidibooksFile({
            fileName: "calculate_1 (1).csv",
            slot: "file1",
            content: [createRidibooksFile1Row()],
          }),
          createRidibooksFile({
            fileName: "calculate_date_tran_1.csv",
            slot: "event",
            content: [createRidibooksEventRow()],
            eventPeriod: {
              startDate: "2026-06-01",
              endDate: "2026-06-30",
            },
          }),
        ],
      },
      {
        adapters: {
          csv: createSeriesAdapter(),
        },
      },
    );

    expect(result.issues).toEqual([]);
    expect(result.rows.map((row) => row.mailerContentTitle)).toEqual([
      "Ridibooks Work(이벤트)",
      "Ridibooks Work(이벤트)(app)",
    ]);
    expect(result.fileResults).toEqual([
      expect.objectContaining({ fileName: "calculate_1.csv", status: "success", issueCount: 0 }),
      expect.objectContaining({ fileName: "calculate_1 (1).csv", status: "success", issueCount: 0 }),
      expect.objectContaining({ fileName: "calculate_date_tran_1.csv", status: "success", issueCount: 0 }),
    ]);
  });

  it("passes optional ridibooks MG correction files to the group parser", () => {
    const result = runBatchParseOrchestrator(
      {
        batchId: "batch-ridibooks-mg",
        files: [
          createRidibooksFile({
            fileName: "calculate_1.csv",
            slot: "base",
            content: [createRidibooksBaseRow()],
          }),
          createRidibooksFile({
            fileName: "calculate_1 (1).csv",
            slot: "file1",
            content: [createRidibooksFile1Row()],
          }),
          createRidibooksFile({
            fileName: "ridibooks-mg.csv",
            slot: "mgCorrection",
            content: [createRidibooksMgCorrectionRow()],
          }),
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
        mailerContentTitle: "Ridibooks Work",
        grossSales: 720,
        settlementAmount: 432,
      }),
      expect.objectContaining({
        mailerContentTitle: "Ridibooks Work(app)",
        grossSales: 550,
        settlementAmount: 280,
      }),
    ]);
  });

  it("returns ridibooks blocked group issues without assigning them to fileResults", () => {
    const result = runBatchParseOrchestrator(
      {
        batchId: "batch-ridibooks-blocked",
        files: [
          createRidibooksFile({
            fileName: "calculate_1.csv",
            slot: "base",
            content: [createRidibooksBaseRow()],
          }),
          createRidibooksFile({
            fileName: "calculate_1 (1).csv",
            slot: "file1",
            content: [createRidibooksFile1Row()],
          }),
          createRidibooksFile({
            fileName: "calculate_date_tran_1.csv",
            slot: "event",
            content: [createRidibooksEventRow()],
          }),
        ],
      },
      {
        adapters: {
          csv: createSeriesAdapter(),
        },
      },
    );

    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        platform: "ridibooks",
        issueType: "missing_field",
        severity: "error",
      }),
    ]);
    expect(result.fileResults).toEqual([
      expect.objectContaining({ fileName: "calculate_1.csv", status: "success", issueCount: 0 }),
      expect.objectContaining({ fileName: "calculate_1 (1).csv", status: "success", issueCount: 0 }),
      expect.objectContaining({ fileName: "calculate_date_tran_1.csv", status: "success", issueCount: 0 }),
    ]);
  });

  it("runs ridibooks and series group paths side by side", () => {
    const result = runBatchParseOrchestrator(
      {
        batchId: "batch-series-ridibooks",
        files: [
          createRidibooksFile({
            fileName: "calculate_1.csv",
            slot: "base",
            content: [createRidibooksBaseRow()],
          }),
          createRidibooksFile({
            fileName: "calculate_1 (1).csv",
            slot: "file1",
            content: [createRidibooksFile1Row()],
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
      expect.objectContaining({ platform: "ridibooks", mailerContentTitle: "Ridibooks Work" }),
      expect.objectContaining({ platform: "ridibooks", mailerContentTitle: "Ridibooks Work(app)" }),
      expect.objectContaining({ platform: "series", mailerContentTitle: "Same Series Work" }),
      expect.objectContaining({ platform: "series", mailerContentTitle: "Same Series Work(app)" }),
    ]);
  });

  it("parses sanitized ridibooks base, file1, event, and MG correction fixtures end to end", () => {
    const [baseBookId] = RIDIBOOKS_COLUMNS.base.identity;
    const [file1BookId] = RIDIBOOKS_COLUMNS.file1.identity;
    const [eventBookId] = RIDIBOOKS_COLUMNS.event.identity;
    const [mgBookId] = RIDIBOOKS_COLUMNS.mgCorrection.matching;

    const result = runBatchParseOrchestrator(
      {
        batchId: "batch-ridibooks-e2e-fixture",
        files: [
          createRidibooksFile({
            fileName: "calculate_1.csv",
            slot: "base",
            content: [
              createRidibooksBaseRow(),
              createRidibooksBaseRow({
                [baseBookId]: "RIDI-002",
                [RIDIBOOKS_COLUMNS.base.identity[1]]: "Ridibooks MG Work",
                sourceRowIndex: 3,
              }),
            ],
          }),
          createRidibooksFile({
            fileName: "calculate_1 (1).csv",
            slot: "file1",
            content: [
              createRidibooksFile1Row(),
              createRidibooksFile1Row({
                [file1BookId]: "RIDI-002",
                [RIDIBOOKS_COLUMNS.file1.identity[1]]: "Ridibooks MG Work",
                sourceRowIndex: 3,
              }),
            ],
          }),
          createRidibooksFile({
            fileName: "calculate_date_tran_1.csv",
            slot: "event",
            content: [createRidibooksEventRow({ [eventBookId]: "RIDI-001" })],
            eventPeriod: {
              startDate: "2026-06-01",
              endDate: "2026-06-30",
            },
          }),
          createRidibooksFile({
            fileName: "ridibooks-mg.csv",
            slot: "mgCorrection",
            content: [
              createRidibooksMgCorrectionRow({
                [mgBookId]: "RIDI-002",
                sourceRowIndex: 2,
              }),
            ],
          }),
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
        workTitle: "Ridibooks Work",
        mailerContentTitle: "Ridibooks Work(이벤트)",
        grossSales: 1000,
        settlementAmount: 700,
        sourceFileName: "calculate_date_tran_1.csv",
      }),
      expect.objectContaining({
        workTitle: "Ridibooks Work",
        mailerContentTitle: "Ridibooks Work(이벤트)(app)",
        grossSales: 600,
        settlementAmount: 367.5,
        sourceFileName: "calculate_date_tran_1.csv",
      }),
      expect.objectContaining({
        workTitle: "Ridibooks MG Work",
        mailerContentTitle: "Ridibooks MG Work",
        grossSales: 720,
        settlementAmount: 432,
        sourceFileName: "calculate_1.csv",
      }),
      expect.objectContaining({
        workTitle: "Ridibooks MG Work",
        mailerContentTitle: "Ridibooks MG Work(app)",
        grossSales: 550,
        settlementAmount: 280,
        sourceFileName: "calculate_1.csv",
      }),
    ]);
    expect(result.fileResults).toEqual([
      expect.objectContaining({ fileName: "calculate_1.csv", status: "success", rowCount: 2, issueCount: 0 }),
      expect.objectContaining({ fileName: "calculate_1 (1).csv", status: "success", rowCount: 2, issueCount: 0 }),
      expect.objectContaining({ fileName: "calculate_date_tran_1.csv", status: "success", rowCount: 1, issueCount: 0 }),
      expect.objectContaining({ fileName: "ridibooks-mg.csv", status: "success", rowCount: 1, issueCount: 0 }),
    ]);
  });

  it("parses munpia settlement and optional authorCorrection as one group", () => {
    const result = runBatchParseOrchestrator(
      {
        batchId: "batch-munpia-1",
        files: [
          createMunpiaFile({
            fileName: "munpia-settlement.xlsx",
            slot: "settlement",
            content: [createMunpiaSettlementRow()],
          }),
          createMunpiaFile({
            fileName: "munpia-author-correction.csv",
            slot: "authorCorrection",
            content: [createMunpiaAuthorCorrectionRow()],
          }),
        ],
      },
      {
        adapters: {
          csv: createSeriesAdapter(),
          xlsx: createSeriesAdapter(),
        },
      },
    );

    expect(result.issues).toEqual([]);
    expect(result.rows).toEqual([
      expect.objectContaining({
        company: "sr",
        platform: "munpia",
        saleMonth: "2026-06",
        workTitle: "나 혼자 히든농장",
        mailerContentTitle: "나 혼자 히든농장",
        author: "Corrected Author",
        grossSales: 2000,
        settlementAmount: 1260,
        sourceFileName: "munpia-settlement.xlsx",
      }),
      expect.objectContaining({
        company: "sr",
        platform: "munpia",
        saleMonth: "2026-06",
        workTitle: "나 혼자 히든농장",
        mailerContentTitle: "나 혼자 히든농장(app)",
        author: "Corrected Author",
        grossSales: 2000,
        settlementAmount: 1008,
        sourceFileName: "munpia-settlement.xlsx",
      }),
    ]);
    expect(result.fileResults).toEqual([
      expect.objectContaining({ fileName: "munpia-settlement.xlsx", platform: "munpia", status: "success", rowCount: 1, issueCount: 0 }),
      expect.objectContaining({ fileName: "munpia-author-correction.csv", platform: "munpia", status: "success", rowCount: 1, issueCount: 0 }),
    ]);
  });

  it("preserves optional munpia authorCorrection adapter issues without blocking valid settlement rows", () => {
    const correctionIssue: ParseIssue = {
      issueId: "batch-munpia-2-author-correction-parse-error",
      batchId: "batch-munpia-2",
      company: "sr",
      platform: "munpia",
      severity: "error",
      issueType: "parse_error",
      message: "Author correction adapter reported a parse error.",
      sourceFileName: "munpia-author-correction.csv",
    };

    const result = runBatchParseOrchestrator(
      {
        batchId: "batch-munpia-2",
        files: [
          createMunpiaFile({
            fileName: "munpia-settlement.xlsx",
            slot: "settlement",
            content: [createMunpiaSettlementRow({ 작가: "Normal Author" })],
          }),
          createMunpiaFile({
            fileName: "munpia-author-correction.csv",
            slot: "authorCorrection",
            content: [createMunpiaAuthorCorrectionRow()],
          }),
        ],
      },
      {
        adapters: {
          csv: createSeriesAdapter({ "munpia-author-correction.csv": correctionIssue }),
          xlsx: createSeriesAdapter(),
        },
      },
    );

    expect(result.rows).toEqual([
      expect.objectContaining({ platform: "munpia", author: "Normal Author", mailerContentTitle: "나 혼자 히든농장" }),
      expect.objectContaining({ platform: "munpia", author: "Normal Author", mailerContentTitle: "나 혼자 히든농장(app)" }),
    ]);
    expect(result.issues).toEqual([correctionIssue]);
    expect(result.fileResults).toEqual([
      expect.objectContaining({ fileName: "munpia-settlement.xlsx", status: "success", issueCount: 0 }),
      expect.objectContaining({ fileName: "munpia-author-correction.csv", status: "failed", issueCount: 1 }),
    ]);
  });

  it("blocks the munpia group when the settlement slot already carries adapter issues", () => {
    const settlementIssue: ParseIssue = {
      issueId: "batch-munpia-3-settlement-parse-error",
      batchId: "batch-munpia-3",
      company: "sr",
      platform: "munpia",
      severity: "error",
      issueType: "parse_error",
      message: "Settlement adapter reported a parse error.",
      sourceFileName: "munpia-settlement.xlsx",
    };

    const result = runBatchParseOrchestrator(
      {
        batchId: "batch-munpia-3",
        files: [
          createMunpiaFile({
            fileName: "munpia-settlement.xlsx",
            slot: "settlement",
            content: [createMunpiaSettlementRow()],
          }),
        ],
      },
      {
        adapters: {
          xlsx: createSeriesAdapter({ "munpia-settlement.xlsx": settlementIssue }),
        },
      },
    );

    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual([settlementIssue]);
    expect(result.fileResults).toEqual([
      expect.objectContaining({ fileName: "munpia-settlement.xlsx", platform: "munpia", status: "failed", rowCount: 1, issueCount: 1 }),
    ]);
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
