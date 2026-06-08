import * as XLSX from "xlsx";
import type { MailerExportRow, ReviewExportRow } from "./exportRowTypes";

export const reviewExportHeaders = [
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
] as const satisfies readonly (keyof ReviewExportRow)[];

export const mailerExportHeaders = [
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
] as const satisfies readonly (keyof MailerExportRow)[];

export function createReviewWorkbookBuffer(rows: ReviewExportRow[]): ArrayBuffer {
  return createWorkbookBuffer("정산_통합검수용", reviewExportHeaders, rows);
}

export function createMailerWorkbookBuffer(rows: MailerExportRow[]): ArrayBuffer {
  return createWorkbookBuffer("메일러_발송용", mailerExportHeaders, rows);
}

function createWorkbookBuffer<Row extends Record<string, unknown>>(
  sheetName: string,
  headers: readonly (keyof Row)[],
  rows: Row[],
): ArrayBuffer {
  const workbook = XLSX.utils.book_new();
  const sheetData = [
    [...headers],
    ...rows.map((row) => headers.map((header) => row[header])),
  ];
  const sheet = XLSX.utils.aoa_to_sheet(sheetData);

  XLSX.utils.book_append_sheet(workbook, sheet, sheetName);

  return XLSX.write(workbook, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
}
