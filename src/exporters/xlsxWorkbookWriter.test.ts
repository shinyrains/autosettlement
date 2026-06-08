import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import type { MailerExportRow, ReviewExportRow } from "./exportRowTypes";
import {
  createMailerWorkbookBuffer,
  createReviewWorkbookBuffer,
} from "./xlsxWorkbookWriter";

const reviewRows: ReviewExportRow[] = [
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
];

const mailerRows: MailerExportRow[] = [
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
];

function readFirstSheetRows(buffer: ArrayBuffer): unknown[][] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
}

describe("xlsx workbook writer", () => {
  it("creates a review workbook buffer with ReviewExportRow header order", () => {
    const rows = readFirstSheetRows(createReviewWorkbookBuffer(reviewRows));

    expect(rows[0]).toEqual([
      "회사",
      "플랫폼",
      "판매월",
      "작품명",
      "메일러컨텐츠명",
      "작가명",
      "출판사",
      "총매출",
      "정산금",
      "원본파일명",
      "원본행번호",
      "오류/이슈 요약",
    ]);
    expect(rows[1]).toEqual([
      "raon",
      "series",
      "2026-06",
      "검은 별의 서점",
      "검은 별의 서점(app)",
      "한도윤",
      "라온북스",
      18420,
      7368,
      "series-app.xls",
      12,
      "issue-missing-column",
    ]);
  });

  it("creates a mailer workbook buffer with the 13-column header order", () => {
    const rows = readFirstSheetRows(createMailerWorkbookBuffer(mailerRows));

    expect(rows[0]).toEqual([
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
    expect(rows[1]).toEqual([
      "한도윤",
      "검은 별의 서점(app)",
      "series",
      "2026-06",
      18420,
      7368,
      0,
      "",
      7368,
      0,
      7368,
      "",
      0,
    ]);
  });

  it("does not mutate input review rows", () => {
    const before = structuredClone(reviewRows);

    createReviewWorkbookBuffer(reviewRows);

    expect(reviewRows).toEqual(before);
  });

  it("does not mutate input mailer rows", () => {
    const before = structuredClone(mailerRows);

    createMailerWorkbookBuffer(mailerRows);

    expect(mailerRows).toEqual(before);
  });
});
