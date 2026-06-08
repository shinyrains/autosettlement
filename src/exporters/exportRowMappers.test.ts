import { describe, expect, it } from "vitest";
import type { SettlementRow } from "../types/settlement";
import { mapToMailerExportRows, mapToReviewExportRows } from "./exportRowMappers";

const rows: SettlementRow[] = [
  {
    rowId: "row-1",
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
    issues: ["issue-missing-column"],
  },
  {
    rowId: "row-2",
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

describe("export row mappers", () => {
  it("maps SettlementRow values to ReviewExportRow", () => {
    expect(mapToReviewExportRows(rows)).toEqual([
      {
        회사: "raon",
        플랫폼: "series",
        판매월: "2026-06",
        작품명: "검은 별의 서점",
        메일러컨텐츠명: "검은 별의 서점(app)",
        작가명: "한도윤",
        출판사: "라온북스",
        총매출: 18420,
        정산금: 7368,
        원본파일명: "series-app.xls",
        원본행번호: 12,
        "오류/이슈 요약": "issue-missing-column",
      },
      expect.objectContaining({
        회사: "sr",
        플랫폼: "kyobo",
        출판사: "",
        "오류/이슈 요약": "",
      }),
    ]);
  });

  it("maps MailerExportRow in the existing 13-column order", () => {
    const [first] = mapToMailerExportRows(rows);

    expect(Object.keys(first)).toEqual([
      "작가명",
      "컨텐츠",
      "플랫폼",
      "판매월",
      "총매출",
      "정산금",
      "라온수수료",
      "수수료",
      "원지급액",
      "원천징수",
      "실지급액",
      "이메일",
      "작가차감",
    ]);
  });

  it("maps MailerExportRow default values without mailer-side corrections", () => {
    expect(mapToMailerExportRows([rows[0]])).toEqual([
      {
        작가명: "한도윤",
        컨텐츠: "검은 별의 서점(app)",
        플랫폼: "series",
        판매월: "2026-06",
        총매출: 18420,
        정산금: 7368,
        라온수수료: 0,
        수수료: "",
        원지급액: 7368,
        원천징수: 0,
        실지급액: 7368,
        이메일: "",
        작가차감: 0,
      },
    ]);
  });

  it("keeps app content title and source tracking values", () => {
    const reviewRows = mapToReviewExportRows(rows);
    const mailerRows = mapToMailerExportRows(rows);

    expect(reviewRows[0].메일러컨텐츠명).toBe("검은 별의 서점(app)");
    expect(reviewRows[0].원본파일명).toBe("series-app.xls");
    expect(reviewRows[0].원본행번호).toBe(12);
    expect(mailerRows[0].컨텐츠).toBe("검은 별의 서점(app)");
  });

  it("preserves input row order", () => {
    expect(mapToReviewExportRows(rows).map((row) => row.작품명)).toEqual([
      "검은 별의 서점",
      "푸른 달",
    ]);
    expect(mapToMailerExportRows(rows).map((row) => row.컨텐츠)).toEqual([
      "검은 별의 서점(app)",
      "푸른 달",
    ]);
  });
});
