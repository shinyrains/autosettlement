import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import type { SettlementRow } from "../types/settlement";
import { buildExportPackages } from "./exportPackageBuilder";

const rows: SettlementRow[] = [
  {
    rowId: "row-raon-1",
    company: "raon",
    platform: "series",
    saleMonth: "2026-06",
    workTitle: "검은 별의 서점",
    mailerContentTitle: "검은 별의 서점(app)",
    author: "한도윤",
    publisher: "라온북스",
    grossSales: 18420,
    settlementAmount: 7368,
    sourceFileName: "series-app.xls",
    sourceRowIndex: 12,
    issues: [],
  },
  {
    rowId: "row-sr-1",
    company: "sr",
    platform: "kyobo",
    saleMonth: "2026-06",
    workTitle: "푸른 달",
    mailerContentTitle: "푸른 달",
    author: "서하린",
    grossSales: 25000,
    settlementAmount: 10000,
    sourceFileName: "kyobo.xlsx",
    sourceRowIndex: 3,
    issues: [],
  },
];

function readFirstSheetRows(buffer: ArrayBuffer): unknown[][] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
}

describe("export package builder", () => {
  it("builds two export packages per company with rows", () => {
    const packages = buildExportPackages(rows);

    expect(packages.map((item) => [item.company, item.artifactType, item.fileName, item.rowCount])).toEqual([
      ["raon", "review_excel", "라온_정산_통합검수용.xlsx", 1],
      ["raon", "mailer_excel", "라온_메일러_발송용.xlsx", 1],
      ["sr", "review_excel", "에스알_정산_통합검수용.xlsx", 1],
      ["sr", "mailer_excel", "에스알_메일러_발송용.xlsx", 1],
    ]);
  });

  it("keeps each company workbook scoped to that company rows", () => {
    const packages = buildExportPackages(rows);
    const raonReview = packages.find(
      (item) => item.company === "raon" && item.artifactType === "review_excel",
    );
    const srMailer = packages.find(
      (item) => item.company === "sr" && item.artifactType === "mailer_excel",
    );

    expect(readFirstSheetRows(raonReview!.workbookBuffer)[1]).toContain("raon");
    expect(readFirstSheetRows(raonReview!.workbookBuffer)[1]).toContain("검은 별의 서점");
    expect(readFirstSheetRows(raonReview!.workbookBuffer).flat()).not.toContain("푸른 달");
    expect(readFirstSheetRows(srMailer!.workbookBuffer)[1]).toContain("푸른 달");
    expect(readFirstSheetRows(srMailer!.workbookBuffer).flat()).not.toContain("검은 별의 서점(app)");
  });

  it("does not create packages for companies without rows", () => {
    const packages = buildExportPackages([rows[0]]);

    expect(packages.map((item) => item.company)).toEqual(["raon", "raon"]);
    expect(packages.map((item) => item.fileName)).toEqual([
      "라온_정산_통합검수용.xlsx",
      "라온_메일러_발송용.xlsx",
    ]);
  });

  it("does not mutate input SettlementRow objects", () => {
    const before = structuredClone(rows);

    buildExportPackages(rows);

    expect(rows).toEqual(before);
  });

  it("sets rowCount from rows included in each package", () => {
    const packages = buildExportPackages([
      rows[0],
      { ...rows[0], rowId: "row-raon-2", workTitle: "검은 별의 서점 외전", mailerContentTitle: "검은 별의 서점 외전" },
    ]);

    expect(packages.map((item) => ({ artifactType: item.artifactType, rowCount: item.rowCount }))).toEqual([
      { artifactType: "review_excel", rowCount: 2 },
      { artifactType: "mailer_excel", rowCount: 2 },
    ]);
  });

  it("normalizes trailing volume markers, aggregates equal works, and excludes zero-sales works before export", () => {
    const sourceRows: SettlementRow[] = [
      {
        rowId: "row-onestore-1",
        company: "raon",
        platform: "onestore",
        saleMonth: "2026-06",
        workTitle: "무당괴공 01",
        mailerContentTitle: "무당괴공 01",
        author: "작가A",
        publisher: "비카페",
        grossSales: 1000,
        settlementAmount: 400,
        sourceFileName: "onestore.xlsx",
        sourceRowIndex: 1,
        issues: [],
      },
      {
        rowId: "row-onestore-2",
        company: "raon",
        platform: "onestore",
        saleMonth: "2026-06",
        workTitle: "무당괴공 12 (완결)",
        mailerContentTitle: "무당괴공 12 (완결)",
        author: "작가A",
        publisher: "비카페",
        grossSales: 3000,
        settlementAmount: 1200,
        sourceFileName: "onestore.xlsx",
        sourceRowIndex: 2,
        issues: [],
      },
      {
        rowId: "row-onestore-3",
        company: "raon",
        platform: "onestore",
        saleMonth: "2026-06",
        workTitle: "무당괴공 13권 [완결]",
        mailerContentTitle: "무당괴공 13권 [완결]",
        author: "작가A",
        publisher: "비카페",
        grossSales: 2000,
        settlementAmount: 800,
        sourceFileName: "onestore.xlsx",
        sourceRowIndex: 3,
        issues: [],
      },
      {
        rowId: "row-onestore-zero-same-work",
        company: "raon",
        platform: "onestore",
        saleMonth: "2026-06",
        workTitle: "무당괴공 14권",
        mailerContentTitle: "무당괴공 14권",
        author: "작가A",
        publisher: "비카페",
        grossSales: 0,
        settlementAmount: 999,
        sourceFileName: "onestore.xlsx",
        sourceRowIndex: 4,
        issues: [],
      },
      {
        rowId: "row-aladin-1",
        company: "raon",
        platform: "aladin",
        saleMonth: "2026-06",
        workTitle: "기사의 일기(Diary of a Knight) 15",
        mailerContentTitle: "기사의 일기(Diary of a Knight) 15",
        author: "작가B",
        publisher: "아레테",
        grossSales: 0,
        settlementAmount: 0,
        sourceFileName: "aladin.csv",
        sourceRowIndex: 5,
        issues: [],
      },
    ];

    const packages = buildExportPackages(sourceRows);
    const reviewRows = readFirstSheetRows(packages.find((item) => item.artifactType === "review_excel")!.workbookBuffer);
    const mailerRows = readFirstSheetRows(packages.find((item) => item.artifactType === "mailer_excel")!.workbookBuffer);

    expect(packages.find((item) => item.artifactType === "review_excel")?.rowCount).toBe(1);
    expect(packages.find((item) => item.artifactType === "mailer_excel")?.rowCount).toBe(1);
    expect(reviewRows[1]).toContain("무당괴공");
    expect(reviewRows[1]).toContain(6000);
    expect(reviewRows[1]).toContain(2400);
    expect(mailerRows[1]).toContain("무당괴공");
    expect(mailerRows[1]).toContain(6000);
    expect(mailerRows.flat()).not.toContain("기사의 일기(Diary of a Knight)");
  });

  it("keeps Yes24 publisher names distinct while aggregating normalized titles", () => {
    const sourceRows: SettlementRow[] = [
      {
        rowId: "row-yes24-arete",
        company: "sr",
        platform: "yes24",
        saleMonth: "2026-06",
        workTitle: "창천마신 10",
        mailerContentTitle: "창천마신 10",
        author: "작가C",
        publisher: "아레테",
        grossSales: 1000,
        settlementAmount: 400,
        sourceFileName: "yes24.xlsx",
        sourceRowIndex: 1,
        issues: [],
      },
      {
        rowId: "row-yes24-bcafe",
        company: "sr",
        platform: "yes24",
        saleMonth: "2026-06",
        workTitle: "창천마신 11",
        mailerContentTitle: "창천마신 11",
        author: "작가C",
        publisher: "비카페",
        grossSales: 2000,
        settlementAmount: 800,
        sourceFileName: "yes24.xlsx",
        sourceRowIndex: 2,
        issues: [],
      },
    ];

    const packages = buildExportPackages(sourceRows);
    const reviewRows = readFirstSheetRows(packages.find((item) => item.artifactType === "review_excel")!.workbookBuffer);

    expect(packages.find((item) => item.artifactType === "review_excel")?.rowCount).toBe(2);
    expect(reviewRows[1]).toContain("창천마신");
    expect(reviewRows[1]).toContain("아레테");
    expect(reviewRows[2]).toContain("창천마신");
    expect(reviewRows[2]).toContain("비카페");
  });
});
