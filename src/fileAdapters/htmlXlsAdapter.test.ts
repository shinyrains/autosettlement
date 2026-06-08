import { describe, expect, it } from "vitest";
import { parseHtmlXlsAdapter } from "./htmlXlsAdapter";
import type { FileAdapterContext } from "./types";

const baseContext: FileAdapterContext = {
  batchId: "batch-html-xls",
  company: "raon",
  platform: "series",
  saleMonth: "2026-06",
  sourceFileName: "contentsSelling_2026-06-08.xls",
  fileKind: "html_xls",
};

function htmlWithTables(secondTableRows: string): string {
  return `
    <html>
      <body>
        <table><tr><td>정산 제목 영역</td></tr></table>
        <table>${secondTableRows}</table>
      </body>
    </html>
  `;
}

describe("html xls file adapter", () => {
  it("uses the second HTML table and converts it into TabularFileRow objects", () => {
    const html = htmlWithTables(`
      <tr><th>작품명</th><th>작가명</th><th>쿠키</th></tr>
      <tr><td>검은 별의 서점</td><td>한도윤</td><td>18420</td></tr>
    `);

    const result = parseHtmlXlsAdapter(baseContext, html);

    expect(result.issues).toEqual([]);
    expect(result.rows).toEqual([
      {
        작품명: "검은 별의 서점",
        작가명: "한도윤",
        쿠키: "18420",
        sourceFileName: "contentsSelling_2026-06-08.xls",
        sourceRowIndex: 2,
      },
    ]);
  });

  it("does not read rows from the first HTML table", () => {
    const html = `
      <html>
        <body>
          <table>
            <tr><th>작품명</th></tr>
            <tr><td>첫 번째 table 값</td></tr>
          </table>
          <table>
            <tr><th>작품명</th></tr>
            <tr><td>두 번째 table 값</td></tr>
          </table>
        </body>
      </html>
    `;

    const result = parseHtmlXlsAdapter(baseContext, html);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].작품명).toBe("두 번째 table 값");
  });

  it("excludes the final 합계 row", () => {
    const html = htmlWithTables(`
      <tr><th>작품명</th><th>쿠키</th></tr>
      <tr><td>검은 별의 서점</td><td>18420</td></tr>
      <tr><td>합계</td><td>18420</td></tr>
    `);

    const result = parseHtmlXlsAdapter(baseContext, html);

    expect(result.rows).toEqual([
      expect.objectContaining({ 작품명: "검은 별의 서점", sourceRowIndex: 2 }),
    ]);
  });

  it("excludes empty rows while preserving source row indexes", () => {
    const html = htmlWithTables(`
      <tr><th>작품명</th><th>작가명</th></tr>
      <tr><td>검은 별의 서점</td><td>한도윤</td></tr>
      <tr><td></td><td></td></tr>
      <tr><td>푸른 달</td><td>서하린</td></tr>
    `);

    const result = parseHtmlXlsAdapter(baseContext, html);

    expect(result.rows).toEqual([
      expect.objectContaining({ 작품명: "검은 별의 서점", sourceRowIndex: 2 }),
      expect.objectContaining({ 작품명: "푸른 달", sourceRowIndex: 4 }),
    ]);
  });

  it("returns parse_error when the second table is missing", () => {
    const result = parseHtmlXlsAdapter(
      baseContext,
      "<html><body><table><tr><td>only one table</td></tr></table></body></html>",
    );

    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        issueType: "parse_error",
        severity: "error",
        sourceFileName: "contentsSelling_2026-06-08.xls",
        message: expect.stringContaining("second table"),
      }),
    ]);
  });

  it("returns parse_error for an empty second table", () => {
    const result = parseHtmlXlsAdapter(baseContext, htmlWithTables(""));

    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        issueType: "parse_error",
        message: expect.stringContaining("empty"),
      }),
    ]);
  });

  it("returns parse_error when the header row is missing", () => {
    const result = parseHtmlXlsAdapter(
      baseContext,
      htmlWithTables("<tr><th></th><th></th></tr><tr><td>값</td><td>100</td></tr>"),
    );

    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        issueType: "parse_error",
        message: expect.stringContaining("header"),
      }),
    ]);
  });

  it("keeps Korean column names exactly as headers", () => {
    const result = parseHtmlXlsAdapter(
      baseContext,
      htmlWithTables(`
        <tr><th>도서명</th><th>저자명</th><th>출판사</th></tr>
        <tr><td>바람의 기록</td><td>김서윤</td><td>라온</td></tr>
      `),
    );

    expect(Object.keys(result.rows[0])).toEqual([
      "도서명",
      "저자명",
      "출판사",
      "sourceFileName",
      "sourceRowIndex",
    ]);
  });
});
