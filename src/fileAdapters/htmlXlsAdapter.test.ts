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
        <table><tr><td>ignored first table</td></tr></table>
        <table>${secondTableRows}</table>
      </body>
    </html>
  `;
}

describe("html xls file adapter", () => {
  it("uses the second HTML table and converts it into TabularFileRow objects", () => {
    const html = htmlWithTables(`
      <tr><th>Title</th><th>Author</th><th>Amount</th></tr>
      <tr><td>Series Work</td><td>Series Author</td><td>18420</td></tr>
    `);

    const result = parseHtmlXlsAdapter(baseContext, html);

    expect(result.issues).toEqual([]);
    expect(result.rows).toEqual([
      {
        Title: "Series Work",
        Author: "Series Author",
        Amount: "18420",
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
            <tr><th>Title</th></tr>
            <tr><td>first table value</td></tr>
          </table>
          <table>
            <tr><th>Title</th></tr>
            <tr><td>second table value</td></tr>
          </table>
        </body>
      </html>
    `;

    const result = parseHtmlXlsAdapter(baseContext, html);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].Title).toBe("second table value");
  });

  it("excludes Korean total rows before platform parsing", () => {
    const html = htmlWithTables(`
      <tr><th>Title</th><th>Amount</th></tr>
      <tr><td>Series Work</td><td>18420</td></tr>
      <tr><td>합계</td><td>18420</td></tr>
    `);

    const result = parseHtmlXlsAdapter(baseContext, html);

    expect(result.rows).toEqual([
      expect.objectContaining({ Title: "Series Work", sourceRowIndex: 2 }),
    ]);
  });

  it("excludes empty rows while preserving source row indexes", () => {
    const html = htmlWithTables(`
      <tr><th>Title</th><th>Author</th></tr>
      <tr><td>Series Work</td><td>Series Author</td></tr>
      <tr><td></td><td></td></tr>
      <tr><td>Other Work</td><td>Other Author</td></tr>
    `);

    const result = parseHtmlXlsAdapter(baseContext, html);

    expect(result.rows).toEqual([
      expect.objectContaining({ Title: "Series Work", sourceRowIndex: 2 }),
      expect.objectContaining({ Title: "Other Work", sourceRowIndex: 4 }),
    ]);
  });

  it("flattens multi-row rowspan and colspan headers before reading data rows", () => {
    const html = htmlWithTables(`
      <tr>
        <th rowspan="2">Content</th>
        <th rowspan="2">Author</th>
        <th colspan="3">Rental</th>
        <th colspan="3">Purchase</th>
        <th rowspan="2">Total</th>
      </tr>
      <tr>
        <th>Count</th>
        <th>Paid</th>
        <th>Free</th>
        <th>Count</th>
        <th>Paid</th>
        <th>Free</th>
      </tr>
      <tr>
        <td>Series Work</td>
        <td>Series Author</td>
        <td>1</td>
        <td>100</td>
        <td>0</td>
        <td>2</td>
        <td>200</td>
        <td>0</td>
        <td>300</td>
      </tr>
    `);

    const result = parseHtmlXlsAdapter(baseContext, html);

    expect(result.issues).toEqual([]);
    expect(result.rows).toEqual([
      {
        Content: "Series Work",
        Author: "Series Author",
        "Rental / Count": "1",
        "Rental / Paid": "100",
        "Rental / Free": "0",
        "Purchase / Count": "2",
        "Purchase / Paid": "200",
        "Purchase / Free": "0",
        Total: "300",
        sourceFileName: "contentsSelling_2026-06-08.xls",
        sourceRowIndex: 3,
      },
    ]);
  });

  it("returns parse_error when multi-row header flattening would create an empty header key", () => {
    const html = htmlWithTables(`
      <tr>
        <th rowspan="2">Content</th>
        <th colspan="2">Sales</th>
      </tr>
      <tr>
        <th>Paid</th>
        <th></th>
      </tr>
      <tr>
        <td>Series Work</td>
        <td>100</td>
        <td>0</td>
      </tr>
    `);

    const result = parseHtmlXlsAdapter(baseContext, html);

    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        issueType: "parse_error",
        message: expect.stringContaining("empty header"),
      }),
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
      htmlWithTables("<tr><th></th><th></th></tr><tr><td>value</td><td>100</td></tr>"),
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
        <tr><th>도서명</th><th>작가명</th><th>출판사</th></tr>
        <tr><td>바람의 기록</td><td>김서윤</td><td>라온</td></tr>
      `),
    );

    expect(Object.keys(result.rows[0])).toEqual([
      "도서명",
      "작가명",
      "출판사",
      "sourceFileName",
      "sourceRowIndex",
    ]);
  });
});
