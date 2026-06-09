import { describe, expect, it } from "vitest";
import type { TabularRow } from "./parserContract";
import { RIDIBOOKS_REQUIRED_COLUMNS } from "./ridibooksCalcConstants";
import {
  parseRidibooksFileGroup,
  type RidibooksGroupFileInput,
  type RidibooksGroupParserContext,
} from "./ridibooksGroupParser";

function makeContext(
  overrides: Partial<RidibooksGroupParserContext> = {},
): RidibooksGroupParserContext {
  return {
    batchId: "batch-ridi",
    company: "raon",
    platform: "ridibooks",
    saleMonth: "2026-05",
    sourceFileNames: ["calculate_1.csv", "calculate_1 (1).csv"],
    ...overrides,
  };
}

function makeBaseRow(overrides: Partial<TabularRow> = {}): TabularRow {
  const [bookId, title, author, publisher] = RIDIBOOKS_REQUIRED_COLUMNS.base.identity;
  const [
    normalSales,
    normalCancel,
    appTargetAmount,
    appFee,
    appCancelAmount,
    settlementAmount,
  ] = RIDIBOOKS_REQUIRED_COLUMNS.base.amounts;

  return {
    [bookId]: "RIDI-001",
    [title]: '=T("Sample Work")',
    [author]: "Sample Author",
    [publisher]: "Sample Publisher",
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

function makeFile1Row(overrides: Partial<TabularRow> = {}): TabularRow {
  const [bookId, title] = RIDIBOOKS_REQUIRED_COLUMNS.file1.identity;
  const [normalSales, normalCancel, settlementAmount] = RIDIBOOKS_REQUIRED_COLUMNS.file1.amounts;

  return {
    [bookId]: "RIDI-001",
    [title]: "Sample Work",
    [normalSales]: "200",
    [normalCancel]: "-20",
    [settlementAmount]: "30",
    sourceFileName: "calculate_1 (1).csv",
    sourceRowIndex: 2,
    ...overrides,
  };
}

function makeEventRow(overrides: Partial<TabularRow> = {}): TabularRow {
  const [bookId, title] = RIDIBOOKS_REQUIRED_COLUMNS.event.identity;
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
  ] = RIDIBOOKS_REQUIRED_COLUMNS.event.amounts;

  return {
    [bookId]: "RIDI-001",
    [title]: "Sample Work",
    [paidAt]: "2026-05-15",
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

function makeMgCorrectionRow(overrides: Partial<TabularRow> = {}): TabularRow {
  const [bookId] = RIDIBOOKS_REQUIRED_COLUMNS.mgCorrection.matching;
  const [mgFlag] = RIDIBOOKS_REQUIRED_COLUMNS.mgCorrection.values;

  return {
    [bookId]: "RIDI-001",
    [mgFlag]: "Y",
    sourceFileName: "mg.csv",
    sourceRowIndex: 2,
    ...overrides,
  };
}

function makeFiles(overrides: Partial<Record<"base" | "file1" | "event" | "mgCorrection", TabularRow[]>> = {}): RidibooksGroupFileInput[] {
  return [
    {
      sourceFileName: "calculate_1.csv",
      slot: "base",
      rows: overrides.base ?? [makeBaseRow()],
      issues: [],
    },
    {
      sourceFileName: "calculate_1 (1).csv",
      slot: "file1",
      rows: overrides.file1 ?? [makeFile1Row()],
      issues: [],
    },
    ...(overrides.event
      ? [{
          sourceFileName: "calculate_date_tran_1.csv",
          slot: "event" as const,
          rows: overrides.event,
          issues: [],
        }]
      : []),
    ...(overrides.mgCorrection
      ? [{
          sourceFileName: "mg.csv",
          slot: "mgCorrection" as const,
          rows: overrides.mgCorrection,
          issues: [],
        }]
      : []),
  ];
}

function byTitle(rows: { mailerContentTitle: string }[], title: string) {
  const row = rows.find((item) => item.mailerContentTitle === title);
  if (!row) {
    throw new Error(`Missing row for ${title}`);
  }
  return row;
}

describe("ridibooks group parser", () => {
  it("calculates base/file1 rows and applies explicit MG correction", () => {
    const result = parseRidibooksFileGroup(
      makeContext(),
      makeFiles({ mgCorrection: [makeMgCorrectionRow()] }),
    );

    expect(result.issues).toEqual([]);
    expect(result.rows).toHaveLength(2);
    expect(byTitle(result.rows, "Sample Work")).toEqual(
      expect.objectContaining({
        platform: "ridibooks",
        workTitle: "Sample Work",
        author: "Sample Author",
        publisher: "Sample Publisher",
        grossSales: 720,
        settlementAmount: 432,
      }),
    );
    expect(byTitle(result.rows, "Sample Work(app)")).toEqual(
      expect.objectContaining({
        grossSales: 550,
        settlementAmount: 280,
      }),
    );
  });

  it("blocks when an event file exists without an event period", () => {
    const result = parseRidibooksFileGroup(makeContext(), makeFiles({ event: [makeEventRow()] }));

    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        issueType: "missing_field",
        severity: "error",
        sourceFileName: "calculate_date_tran_1.csv",
      }),
    ]);
  });

  it("replaces base/file1 outputs with event outputs by book ID", () => {
    const result = parseRidibooksFileGroup(
      makeContext({
        eventPeriod: {
          startDate: "2026-05-01",
          endDate: "2026-05-31",
        },
      }),
      makeFiles({ event: [makeEventRow()] }),
    );

    expect(result.issues).toEqual([]);
    expect(result.rows.map((row) => row.mailerContentTitle)).toEqual([
      "Sample Work(이벤트)",
      "Sample Work(이벤트)(app)",
    ]);
    expect(byTitle(result.rows, "Sample Work(이벤트)")).toEqual(
      expect.objectContaining({
        author: "Sample Author",
        publisher: "Sample Publisher",
        grossSales: 1000,
        settlementAmount: 700,
      }),
    );
    expect(byTitle(result.rows, "Sample Work(이벤트)(app)")).toEqual(
      expect.objectContaining({
        grossSales: 600,
        settlementAmount: 367.5,
      }),
    );
  });

  it("validates required columns before calculation", () => {
    const [normalSales] = RIDIBOOKS_REQUIRED_COLUMNS.base.amounts;
    const baseRow = makeBaseRow();
    delete baseRow[normalSales];

    const result = parseRidibooksFileGroup(makeContext(), makeFiles({ base: [baseRow] }));

    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        issueType: "missing_column",
        severity: "error",
        sourceFileName: "calculate_1.csv",
      }),
    ]);
  });

  it("skips rows with missing identity fields", () => {
    const [, title] = RIDIBOOKS_REQUIRED_COLUMNS.base.identity;

    const result = parseRidibooksFileGroup(
      makeContext(),
      makeFiles({ base: [makeBaseRow({ [title]: "" })] }),
    );

    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        issueType: "missing_field",
        severity: "error",
        sourceRowIndex: 2,
      }),
    ]);
  });

  it("keeps zero-adjustment base rows silent while warning on orphan file1 rows", () => {
    const [bookId] = RIDIBOOKS_REQUIRED_COLUMNS.file1.identity;

    const result = parseRidibooksFileGroup(
      makeContext(),
      makeFiles({ file1: [makeFile1Row({ [bookId]: "RIDI-404" })] }),
    );

    expect(byTitle(result.rows, "Sample Work")).toEqual(
      expect.objectContaining({
        grossSales: 900,
        settlementAmount: 630,
      }),
    );
    expect(result.issues).toEqual([
      expect.objectContaining({
        issueType: "mapping_failed",
        severity: "warning",
        sourceFileName: "calculate_1 (1).csv",
      }),
    ]);
  });
});
