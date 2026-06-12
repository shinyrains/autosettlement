import { readFileSync } from "node:fs";
import * as path from "node:path";
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
import type { Company, ParseIssue, Platform, SettlementRow } from "../types/settlement";
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
      && context.platform !== "joara"
      && context.platform !== "bookcube"
      && context.platform !== "onestore"
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

function createJoaraDetailRow(overrides: Partial<TabularRow> = {}): TabularRow {
  return {
    판매일: "2026-05-10",
    작품명: "기사의 일기(Diary of a Knight)",
    작품코드: "1863448",
    작가명: "편곤",
    권차: "2 권",
    "구매/환불": "구매",
    "판매금액(원)": 3200,
    정산비율: "60 %",
    "정산금액(원)": 1920,
    정산일: "2026.06.06",
    sourceFileName: "joara-detail.csv",
    sourceRowIndex: 2,
    ...overrides,
  };
}

function createJoaraWorkRow(overrides: Partial<TabularRow> = {}): TabularRow {
  return {
    작품명: "기사의 일기(Diary of a Knight)",
    작품코드: "1863448",
    작가명: "편곤",
    단가: 100,
    판매건수: 20,
    비율: "60%",
    정산금액: 5500,
    정산일: "2026.06.06",
    sourceFileName: "joara-work.csv",
    sourceRowIndex: 2,
    ...overrides,
  };
}

function createJoaraFile(input: {
  fileName: string;
  slot: "settlementDetail" | "workSettlement";
  content: TabularRow[];
}) {
  return createFile({
    company: "raon",
    platform: "joara",
    fileName: input.fileName,
    slot: input.slot,
    fileKind: "csv",
    content: input.content,
    saleMonth: "2026-05",
  });
}

function readMisterblueSampleWorkbook(): Uint8Array {
  return readFileSync(
    path.resolve(
      process.cwd(),
      "tmp/platform-samples/misterblue/작품별정산_2026-04-01_2026-04-30.xlsx",
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

function readKakaoPageSampleWorkbook(): Uint8Array {
  return readFileSync(
    path.resolve(
      process.cwd(),
      "tmp/platform-samples/kakao_page/카카오페이지 일반계약_2026-05_주식회사 에스알이앤엠_CP월정산내역.xlsx",
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

  it("keeps file status successful when a single-file parser returns warning-only issues", () => {
    const warningIssue: ParseIssue = {
      issueId: "batch-warning-guru_company-warning-only",
      batchId: "batch-warning",
      company: "raon",
      platform: "guru_company",
      severity: "warning",
      issueType: "mapping_failed",
      message: "Non-blocking parser warning.",
      sourceFileName: "warning.csv",
    };
    const warningRow: SettlementRow = {
      rowId: "batch-warning-row-1",
      company: "raon",
      platform: "guru_company",
      saleMonth: "2026-06",
      workTitle: "Warning Work",
      mailerContentTitle: "Warning Work",
      author: "Warning Author",
      grossSales: 1000,
      settlementAmount: 400,
      sourceFileName: "warning.csv",
      sourceRowIndex: 2,
      issues: [],
    };

    const result = runBatchParseOrchestrator(
      {
        batchId: "batch-warning",
        files: [
          createFile({
            company: "raon",
            platform: "guru_company",
            fileName: "warning.csv",
            content: createSimpleExtractCsv("guru_company", {
              workTitle: "Warning Work",
              author: "Warning Author",
              grossSales: "1000",
              settlementAmount: "400",
            }),
          }),
        ],
      },
      {
        parseRows: () => ({ rows: [warningRow], issues: [warningIssue] }),
      },
    );

    expect(result.issues).toEqual([warningIssue]);
    expect(result.fileResults).toEqual([
      expect.objectContaining({ fileName: "warning.csv", status: "success", rowCount: 1, issueCount: 1 }),
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
      expect.objectContaining({ platform: "series", issueType: "mapping_failed", sourceFileName: "series.csv" }),
    ]);
    expect(result.fileResults[0]).toEqual(
      expect.objectContaining({ fileName: "series.csv", status: "failed", rowCount: 1, issueCount: 1 }),
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

  it("does not distribute source-less series group validation issues into per-file results", () => {
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
        sourceFileName: undefined,
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

  it("assigns source-file series group validation issues to the matching file result", () => {
    const files = createSeriesFiles();
    const invalidSlotFile = { ...files[0], slot: "unexpected-slot" };

    const result = runBatchParseOrchestrator(
      {
        batchId: "batch-series-source-file-invalid",
        files: [invalidSlotFile, ...files.slice(1)],
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
        sourceFileName: invalidSlotFile.fileName,
      }),
    );
    expect(result.fileResults[0]).toEqual(
      expect.objectContaining({
        fileName: invalidSlotFile.fileName,
        status: "failed",
        rowCount: 1,
        issueCount: 1,
      }),
    );
    expect(result.fileResults.slice(1)).toEqual(
      files.slice(1).map((file) =>
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

  it("assigns ridibooks source-file blocked group issues to the matching fileResult", () => {
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
      expect.objectContaining({ fileName: "calculate_date_tran_1.csv", status: "failed", issueCount: 1 }),
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

  it("parses an Epyrus CP949 CSV through the batch orchestrator single-file path", () => {
    const result = runBatchParseOrchestrator({
      batchId: "batch-epyrus-1",
      files: [
        createFile({
          company: "raon",
          platform: "epyrus",
          fileName: "2026년04월정산내역_라온E＆M.csv",
          fileKind: "csv",
          saleMonth: "2026-04",
          content: readEpyrusSampleCsv(),
        }),
      ],
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

  it("parses a Misterblue workbook through the batch orchestrator single-file path", () => {
    const result = runBatchParseOrchestrator({
      batchId: "batch-misterblue-1",
      files: [
        createFile({
          company: "raon",
          platform: "misterblue",
          fileName: "작품별정산_2026-04-01_2026-04-30.xlsx",
          fileKind: "xlsx",
          saleMonth: "2026-04",
          content: readMisterblueSampleWorkbook(),
        }),
      ],
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

  it("parses a Panmurim workbook through the batch orchestrator single-file path", () => {
    const result = runBatchParseOrchestrator({
      batchId: "batch-panmurim-1",
      files: [
        createFile({
          company: "raon",
          platform: "panmurim",
          fileName: "（주）라온이앤엠_2026년 5월.xlsx",
          fileKind: "xlsx",
          saleMonth: "2026-05",
          content: readPanmurimSampleWorkbook(),
        }),
      ],
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

  it("parses a Bookcube workbook through the batch orchestrator single-file path", () => {
    const result = runBatchParseOrchestrator({
      batchId: "batch-bookcube-1",
      files: [
        createFile({
          company: "raon",
          platform: "bookcube",
          fileName: "북큐브 상세매출 2026-5~2026-5 (1).xlsx",
          fileKind: "xlsx",
          saleMonth: "2026-05",
          content: readBookcubeSampleWorkbook(),
        }),
      ],
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

  it("parses an Onestore workbook through the batch orchestrator single-file path", () => {
    const result = runBatchParseOrchestrator({
      batchId: "batch-onestore-1",
      files: [
        createFile({
          company: "raon",
          platform: "onestore",
          fileName: "정산내역_20260608_163327.xlsx",
          fileKind: "xlsx",
          saleMonth: "2026-06",
          content: readOnestoreSampleWorkbook(),
        }),
      ],
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

  it("parses a Kakao Page workbook through the batch orchestrator single-file path", () => {
    const result = runBatchParseOrchestrator({
      batchId: "batch-kakao-page-1",
      files: [
        createFile({
          company: "sr",
          platform: "kakao_page",
          fileName: "카카오페이지 일반계약_2026-05_주식회사 에스알이앤엠_CP월정산내역.xlsx",
          fileKind: "xlsx",
          saleMonth: "2026-05",
          content: readKakaoPageSampleWorkbook(),
        }),
      ],
    });

    expect(result.issues).toEqual([]);
    expect(result.rows).toHaveLength(207);
    expect(result.rows[0]).toEqual(
      expect.objectContaining({
        company: "sr",
        platform: "kakao_page",
        saleMonth: "2026-05",
        workTitle: "둠스데이 [완결]",
        mailerContentTitle: "둠스데이 [완결]",
        author: "산호초",
        publisher: "Arete",
        grossSales: 2340,
        settlementAmount: 1499,
        sourceFileName: "카카오페이지 일반계약_2026-05_주식회사 에스알이앤엠_CP월정산내역.xlsx",
        sourceRowIndex: 3,
      }),
    );
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

  it("parses joara settlementDetail and workSettlement as one grouped batch", () => {
    const result = runBatchParseOrchestrator(
      {
        batchId: "batch-joara-1",
        files: [
          createJoaraFile({
            fileName: "joara-detail.csv",
            slot: "settlementDetail",
            content: [
              createJoaraDetailRow(),
              createJoaraDetailRow({ sourceRowIndex: 3, "판매금액(원)": 1800, "정산금액(원)": 1080 }),
            ],
          }),
          createJoaraFile({
            fileName: "joara-work.csv",
            slot: "workSettlement",
            content: [createJoaraWorkRow({ 정산금액: 5500 })],
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
        platform: "joara",
        saleMonth: "2026-05",
        workTitle: "기사의 일기(Diary of a Knight)",
        mailerContentTitle: "기사의 일기(Diary of a Knight)",
        author: "편곤",
        grossSales: 5000,
        settlementAmount: 5500,
        sourceFileName: "joara-detail.csv",
        sourceRowIndex: 2,
      }),
    ]);
    expect(result.fileResults).toEqual([
      expect.objectContaining({ fileName: "joara-detail.csv", platform: "joara", status: "success", rowCount: 2, issueCount: 0 }),
      expect.objectContaining({ fileName: "joara-work.csv", platform: "joara", status: "success", rowCount: 1, issueCount: 0 }),
    ]);
  });

  it("surfaces joara adapter issues and blocks grouped output when a required slot fails", () => {
    const joaraIssue: ParseIssue = {
      issueId: "batch-joara-2-parse_error-joara-work.csv-file",
      batchId: "batch-joara-2",
      company: "raon",
      platform: "joara",
      severity: "error",
      issueType: "parse_error",
      message: "Joara workSettlement adapter failed.",
      sourceFileName: "joara-work.csv",
    };

    const result = runBatchParseOrchestrator(
      {
        batchId: "batch-joara-2",
        files: [
          createJoaraFile({
            fileName: "joara-detail.csv",
            slot: "settlementDetail",
            content: [createJoaraDetailRow()],
          }),
          createJoaraFile({
            fileName: "joara-work.csv",
            slot: "workSettlement",
            content: [createJoaraWorkRow()],
          }),
        ],
      },
      {
        adapters: {
          csv: createSeriesAdapter({ "joara-work.csv": joaraIssue }),
        },
      },
    );

    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual([joaraIssue]);
    expect(result.fileResults).toEqual([
      expect.objectContaining({ fileName: "joara-detail.csv", platform: "joara", status: "success", issueCount: 0 }),
      expect.objectContaining({ fileName: "joara-work.csv", platform: "joara", status: "failed", issueCount: 1 }),
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
