import type { SettlementRow } from "../types/settlement";
import type { MailerExportRow, ReviewExportRow } from "./exportRowTypes";

export function mapToReviewExportRows(rows: SettlementRow[]): ReviewExportRow[] {
  return rows.map((row) => ({
    회사: row.company,
    플랫폼: row.platform,
    판매월: row.saleMonth,
    작품명: row.workTitle,
    메일러컨텐츠명: row.mailerContentTitle,
    작가명: row.author,
    출판사: row.publisher ?? "",
    총매출: row.grossSales,
    정산금: row.settlementAmount,
    원본파일명: row.sourceFileName,
    원본행번호: row.sourceRowIndex,
    "오류/이슈 요약": row.issues.join(", "),
  }));
}

export function mapToMailerExportRows(rows: SettlementRow[]): MailerExportRow[] {
  return rows.map((row) => ({
    작가명: row.author,
    컨텐츠: row.mailerContentTitle,
    플랫폼: row.platform,
    판매월: row.saleMonth,
    총매출: row.grossSales,
    정산금: row.settlementAmount,
    라온수수료: 0,
    수수료: "",
    // These are handoff defaults, not AutoSettlement's final mailer-side calculation.
    // Display corrections, withholding, deductions, and final sending remain mailer responsibilities.
    원지급액: row.settlementAmount,
    원천징수: 0,
    실지급액: row.settlementAmount,
    이메일: "",
    작가차감: 0,
  }));
}
