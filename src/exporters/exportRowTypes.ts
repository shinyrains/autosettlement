import type { Company, Platform } from "../types/settlement";

export type ReviewExportRow = {
  회사: Company;
  플랫폼: Platform;
  판매월: string;
  작품명: string;
  메일러컨텐츠명: string;
  작가명: string;
  출판사: string;
  총매출: number;
  정산금: number;
  원본파일명: string;
  원본행번호: number;
  "오류/이슈 요약": string;
};

export type MailerExportRow = {
  작가명: string;
  컨텐츠: string;
  플랫폼: Platform;
  판매월: string;
  총매출: number;
  정산금: number;
  라온수수료: number;
  수수료: string;
  원지급액: number;
  원천징수: number;
  실지급액: number;
  이메일: string;
  작가차감: number;
};
