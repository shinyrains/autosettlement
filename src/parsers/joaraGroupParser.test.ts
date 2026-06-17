import { describe, expect, it } from "vitest";
import type { PlatformFileGroupParserContext, TabularRow } from "./parserContract";
import { parseJoaraFileGroup, type JoaraGroupFileInput } from "./joaraGroupParser";

const baseContext: PlatformFileGroupParserContext = {
  batchId: "batch-joara",
  company: "raon",
  platform: "joara",
  saleMonth: "2026-05",
  sourceFileNames: ["joara-detail.csv", "joara-work.csv"],
};

function createDetailRow(overrides: Partial<TabularRow> = {}): TabularRow {
  return {
    판매일: "2026-05-10",
    작품명: "기사의 일기(Diary of a Knight)",
    작품코드: "1863448",
    작가명: "편곤",
    권차: "2 권",
    "구매/환불": "구매",
    "판매금액(원)": "3200",
    정산비율: "60 %",
    "정산금액(원)": "1920",
    정산일: "2026.06.06",
    sourceFileName: "joara-detail.csv",
    sourceRowIndex: 2,
    ...overrides,
  };
}

function createWorkRow(overrides: Partial<TabularRow> = {}): TabularRow {
  return {
    작품명: "기사의 일기(Diary of a Knight)",
    작품코드: "1863448",
    작가명: "편곤",
    단가: "100",
    판매건수: "20",
    비율: "60%",
    정산금액: "5500",
    정산일: "2026.06.06",
    sourceFileName: "joara-work.csv",
    sourceRowIndex: 2,
    ...overrides,
  };
}

function createFiles(input: {
  detailRows?: TabularRow[];
  workRows?: TabularRow[];
  detailIssues?: JoaraGroupFileInput["issues"];
  workIssues?: JoaraGroupFileInput["issues"];
}): JoaraGroupFileInput[] {
  const files: JoaraGroupFileInput[] = [];

  if (input.detailRows) {
    files.push({
      sourceFileName: "joara-detail.csv",
      slot: "settlementDetail",
      rows: input.detailRows,
      issues: input.detailIssues ?? [],
    });
  }

  if (input.workRows) {
    files.push({
      sourceFileName: "joara-work.csv",
      slot: "workSettlement",
      rows: input.workRows,
      issues: input.workIssues ?? [],
    });
  }

  return files;
}

describe("joara group parser", () => {
  it("aggregates detail gross and uses workSettlement as authoritative settlement source", () => {
    const result = parseJoaraFileGroup(
      baseContext,
      createFiles({
        detailRows: [
          createDetailRow(),
          createDetailRow({ sourceRowIndex: 3, "판매금액(원)": "1800", "정산금액(원)": "1080" }),
        ],
        workRows: [createWorkRow({ 정산금액: "5500" })],
      }),
    );

    expect(result.issues).toEqual([]);
    expect(result.rows).toEqual([
      {
        rowId: "batch-joara-joara-raon-1863448-joara-detail.csv-2",
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
        issues: [],
      },
    ]);
  });

  it("returns missing_file when the grouped detail file is absent", () => {
    const result = parseJoaraFileGroup(
      baseContext,
      createFiles({
        workRows: [createWorkRow()],
      }),
    );

    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        issueType: "missing_file",
        message: "Required settlementDetail slot is missing for this Joara group.",
      }),
    ]);
  });

  it("returns invalid_value when detail money cannot be parsed", () => {
    const result = parseJoaraFileGroup(
      baseContext,
      createFiles({
        detailRows: [createDetailRow({ "판매금액(원)": "bad-money" })],
        workRows: [createWorkRow()],
      }),
    );

    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        issueType: "invalid_value",
        sourceFileName: "joara-detail.csv",
        sourceRowIndex: 2,
      }),
      expect.objectContaining({
        issueType: "mapping_failed",
        sourceFileName: "joara-work.csv",
        sourceRowIndex: 2,
      }),
    ]);
  });

  it("emits mapping_failed for unmatched groups on both sides", () => {
    const result = parseJoaraFileGroup(
      baseContext,
      createFiles({
        detailRows: [createDetailRow()],
        workRows: [createWorkRow({ 작품코드: "9999999", 작품명: "다른 작품" })],
      }),
    );

    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        issueType: "mapping_failed",
        sourceFileName: "joara-detail.csv",
        sourceRowIndex: 2,
      }),
      expect.objectContaining({
        issueType: "mapping_failed",
        sourceFileName: "joara-work.csv",
        sourceRowIndex: 2,
      }),
    ]);
  });

  it("collapses completely mismatched Joara file pairs into one actionable file-pair issue", () => {
    const result = parseJoaraFileGroup(
      baseContext,
      createFiles({
        detailRows: [
          createDetailRow(),
          createDetailRow({ 작품명: "칼든 자들의 도시", 작품코드: "1862403", 작가명: "장영훈", sourceRowIndex: 3 }),
        ],
        workRows: [
          createWorkRow({ 작품명: "다른 작품 A", 작품코드: "1000001", 작가명: "작가A", sourceRowIndex: 2 }),
          createWorkRow({ 작품명: "다른 작품 B", 작품코드: "1000002", 작가명: "작가B", sourceRowIndex: 3 }),
        ],
      }),
    );

    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        issueType: "mapping_failed",
        sourceFileName: "joara-detail.csv, joara-work.csv",
        sourceRowIndex: undefined,
        message: expect.stringContaining("같은 작품 그룹이 없습니다"),
      }),
    ]);
  });


  it("blocks when the workSettlement file is missing a required column", () => {
    const result = parseJoaraFileGroup(
      baseContext,
      createFiles({
        detailRows: [createDetailRow()],
        workRows: [
          {
            작품명: "기사의 일기(Diary of a Knight)",
            작품코드: "1863448",
            작가명: "편곤",
            sourceFileName: "joara-work.csv",
            sourceRowIndex: 2,
          },
        ],
      }),
    );

    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        issueType: "missing_column",
        message: "Joara required column is missing: 정산금액.",
      }),
    ]);
  });
});
