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
    const packages = buildExportPackages([rows[0], { ...rows[0], rowId: "row-raon-2" }]);

    expect(packages).toEqual([
      expect.objectContaining({ artifactType: "review_excel", rowCount: 2 }),
      expect.objectContaining({ artifactType: "mailer_excel", rowCount: 2 }),
    ]);
  });
});
