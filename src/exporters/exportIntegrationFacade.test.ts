import { describe, expect, it } from "vitest";
import type { SettlementRow } from "../types/settlement";
import { createExportPackages } from "./exportIntegrationFacade";

const validRows: SettlementRow[] = [
  {
    rowId: "row-raon-1",
    company: "raon",
    platform: "series",
    saleMonth: "2026-06",
    workTitle: "검은 별의 서점",
    mailerContentTitle: "검은 별의 서점(app)",
    author: "한도윤",
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

describe("export integration facade", () => {
  it("returns ready packages when all SettlementRows are valid", () => {
    const result = createExportPackages(validRows);

    expect(result.status).toBe("ready");
    expect(result.issues).toEqual([]);
    expect(result.packages.map((item) => [item.company, item.artifactType, item.rowCount])).toEqual([
      ["raon", "review_excel", 1],
      ["raon", "mailer_excel", 1],
      ["sr", "review_excel", 1],
      ["sr", "mailer_excel", 1],
    ]);
  });

  it("returns blocked without packages when validation issues exist", () => {
    const result = createExportPackages([
      validRows[0],
      { ...validRows[1], rowId: "row-invalid", mailerContentTitle: "" },
    ]);

    expect(result.status).toBe("blocked");
    expect(result.packages).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        rowId: "row-invalid",
        issueType: "missing_field",
        message: expect.stringContaining("mailerContentTitle"),
      }),
    ]);
  });

  it("does not mutate input SettlementRows", () => {
    const before = structuredClone(validRows);

    createExportPackages(validRows);

    expect(validRows).toEqual(before);
  });

  it("returns ready with no packages for an empty valid row list", () => {
    expect(createExportPackages([])).toEqual({
      status: "ready",
      issues: [],
      packages: [],
    });
  });
});
