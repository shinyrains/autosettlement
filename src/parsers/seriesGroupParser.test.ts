import { describe, expect, it } from "vitest";
import type {
  PlatformFileGroupInput,
  PlatformFileGroupParserContext,
  TabularRow,
} from "./parserContract";
import { parseSeriesFileGroup } from "./seriesGroupParser";
import {
  SERIES_CATEGORY_COLUMN_MAPPINGS,
  SERIES_IDENTITY_COLUMNS,
  SERIES_REFERENCE_COLUMNS,
} from "./seriesColumnMappings";
import type { ParseIssue } from "../types/settlement";

const context: PlatformFileGroupParserContext = {
  batchId: "batch-series-group",
  company: "sr",
  platform: "series",
  saleMonth: "2026-06",
  sourceFileNames: [
    "general-1.xls",
    "general-2.xls",
    "general-3.xls",
    "app-1.xls",
    "app-2.xls",
    "app-3.xls",
  ],
};

function row(input: {
  title: string;
  author?: string;
  sourceFileName: string;
  sourceRowIndex: number;
  cookieAutoCharge: number;
}): TabularRow {
  return {
    [SERIES_IDENTITY_COLUMNS.workTitle]: input.title,
    [SERIES_IDENTITY_COLUMNS.author]: input.author ?? "Series Author",
    [SERIES_IDENTITY_COLUMNS.publisher]: "Arete",
    [SERIES_CATEGORY_COLUMN_MAPPINGS.cookie_auto_charge[5]]: input.cookieAutoCharge,
    [SERIES_REFERENCE_COLUMNS.total]: input.cookieAutoCharge,
    sourceFileName: input.sourceFileName,
    sourceRowIndex: input.sourceRowIndex,
  };
}

function file(input: {
  sourceFileName: string;
  slot?: string;
  amount?: number;
  title?: string;
  issues?: ParseIssue[];
}): PlatformFileGroupInput {
  return {
    sourceFileName: input.sourceFileName,
    slot: input.slot,
    rows: [
      row({
        title: input.title ?? "Same Work",
        sourceFileName: input.sourceFileName,
        sourceRowIndex: 2,
        cookieAutoCharge: input.amount ?? 100,
      }),
    ],
    issues: input.issues ?? [],
  };
}

function validFiles(): PlatformFileGroupInput[] {
  return [
    file({ sourceFileName: "general-1.xls", slot: "general", amount: 100 }),
    file({ sourceFileName: "general-2.xls", slot: "general", amount: 200 }),
    file({ sourceFileName: "general-3.xls", slot: "general", amount: 300 }),
    file({ sourceFileName: "app-1.xls", slot: "app", amount: 400 }),
    file({ sourceFileName: "app-2.xls", slot: "app", amount: 500 }),
    file({ sourceFileName: "app-3.xls", slot: "app", amount: 600 }),
  ];
}

describe("series group parser", () => {
  it("validates 3 general and 3 app files, then aggregates parsed rows by settlement key", () => {
    const result = parseSeriesFileGroup(context, validFiles());

    expect(result.issues).toEqual([]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows.map((parsedRow) => parsedRow.grossSales)).toEqual([600, 1500]);
    expect(result.rows.map((parsedRow) => parsedRow.settlementAmount)).toEqual([407.4, 1018.5]);
    expect(result.rows.map((parsedRow) => parsedRow.mailerContentTitle)).toEqual([
      "Same Work",
      "Same Work(app)",
    ]);
    expect(result.rows.map((parsedRow) => parsedRow.sourceFileName)).toEqual([
      "general-1.xls",
      "app-1.xls",
    ]);
  });

  it("returns a mapping_failed issue when a file slot is missing", () => {
    const files = validFiles();
    files[0] = file({ sourceFileName: "general-1.xls" });

    const result = parseSeriesFileGroup(context, files);

    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        issueType: "mapping_failed",
        severity: "error",
        sourceFileName: "general-1.xls",
      }),
    ]);
  });

  it("returns missing_file when general or app file counts are short", () => {
    const result = parseSeriesFileGroup(context, validFiles().slice(0, 5));

    expect(result.rows).toEqual([]);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        issueType: "missing_file",
        severity: "error",
        message: expect.stringContaining("app"),
      }),
    );
  });

  it("returns mapping_failed when the group has too many files", () => {
    const result = parseSeriesFileGroup(context, [
      ...validFiles(),
      file({ sourceFileName: "extra.xls", slot: "app" }),
    ]);

    expect(result.rows).toEqual([]);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        issueType: "mapping_failed",
        severity: "error",
        message: expect.stringContaining("6"),
      }),
    );
  });

  it("includes input file issues in the final issues", () => {
    const inputIssue: ParseIssue = {
      issueId: "adapter-issue",
      batchId: context.batchId,
      company: context.company,
      platform: "series",
      severity: "error",
      issueType: "parse_error",
      message: "adapter issue",
      sourceFileName: "general-1.xls",
    };
    const files = validFiles();
    files[0] = file({ sourceFileName: "general-1.xls", slot: "general", issues: [inputIssue] });

    const result = parseSeriesFileGroup(context, files);

    expect(result.issues).toContain(inputIssue);
    expect(result.rows).toHaveLength(2);
  });
});
