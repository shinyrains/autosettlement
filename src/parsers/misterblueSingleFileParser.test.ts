import { describe, expect, it } from "vitest";
import type { ParserContext, TabularRow } from "./parserContract";
import { parseMisterblueSingleFileRows } from "./misterblueSingleFileParser";

const baseContext: ParserContext = {
  batchId: "batch-misterblue",
  company: "raon",
  platform: "misterblue",
  saleMonth: "2026-04",
  sourceFileName: "misterblue-sample.xlsx",
};

function createRow(overrides: Partial<TabularRow> = {}): TabularRow {
  return {
    작품코드: "raon0115",
    작품명: "대물로 태어나게 해주세요!",
    작가명: "작가A",
    "종량 / 블루머니 / 권별 대여 / 매출액": 0,
    "종량 / 블루머니 / 권별 소장 / 매출액": 480000,
    "종량 / 블루머니 / 전권 대여 / 매출액": 0,
    "종량 / 블루머니 / 전권 소장 / 매출액": 0,
    "종량 / A.앱머니 / 권별 대여 / 매출액": 0,
    "종량 / A.앱머니 / 권별 소장 / 매출액": 52920,
    "종량 / A.앱머니 / 전권 대여 / 매출액": 0,
    "종량 / A.앱머니 / 전권 소장 / 매출액": 0,
    "종량 / i.앱머니 / 권별 대여 / 매출액": 0,
    "종량 / i.앱머니 / 권별 소장 / 매출액": 47040,
    "종량 / i.앱머니 / 전권 대여 / 매출액": 0,
    "종량 / i.앱머니 / 전권 소장 / 매출액": 0,
    "합계(정액+종량) / 정산액": 358789.2,
    sourceFileName: "misterblue-sample.xlsx",
    sourceRowIndex: 29,
    ...overrides,
  };
}

describe("misterblue single-file parser", () => {
  it("splits one source row into normal/app settlement rows", () => {
    const result = parseMisterblueSingleFileRows(baseContext, [createRow()]);

    expect(result.issues).toEqual([]);
    expect(result.rows).toEqual([
      expect.objectContaining({
        rowId: "batch-misterblue-misterblue-29-normal",
        workTitle: "대물로 태어나게 해주세요!",
        mailerContentTitle: "대물로 태어나게 해주세요!",
        author: "작가A",
        grossSales: 480000,
        settlementAmount: 296949.5,
        sourceRowIndex: 29,
      }),
      expect.objectContaining({
        rowId: "batch-misterblue-misterblue-29-app",
        workTitle: "대물로 태어나게 해주세요!",
        mailerContentTitle: "대물로 태어나게 해주세요!(app)",
        author: "작가A",
        grossSales: 99960,
        settlementAmount: 61839.7,
        sourceRowIndex: 29,
      }),
    ]);
  });

  it("assigns the full settlement amount when only normal gross exists", () => {
    const result = parseMisterblueSingleFileRows(baseContext, [
      createRow({
        작품명: "위저드 스톤 [단행본]",
        "종량 / 블루머니 / 권별 소장 / 매출액": 102400,
        "종량 / A.앱머니 / 권별 소장 / 매출액": 0,
        "종량 / i.앱머니 / 권별 소장 / 매출액": 0,
        "합계(정액+종량) / 정산액": 64512,
        sourceRowIndex: 98,
      }),
    ]);

    expect(result.issues).toEqual([]);
    expect(result.rows).toEqual([
      expect.objectContaining({
        workTitle: "위저드 스톤 [단행본]",
        mailerContentTitle: "위저드 스톤 [단행본]",
        grossSales: 102400,
        settlementAmount: 64512,
        sourceRowIndex: 98,
      }),
    ]);
  });

  it("skips aggregate summary rows with blank identity fields", () => {
    const result = parseMisterblueSingleFileRows(baseContext, [
      createRow({
        작품코드: "",
        작품명: "",
        작가명: "",
        "종량 / 블루머니 / 권별 대여 / 매출액": 1256400,
        "종량 / 블루머니 / 권별 소장 / 매출액": 4765300,
        "종량 / 블루머니 / 전권 대여 / 매출액": 345600,
        "종량 / 블루머니 / 전권 소장 / 매출액": 317800,
        "종량 / A.앱머니 / 권별 대여 / 매출액": 412560,
        "종량 / A.앱머니 / 권별 소장 / 매출액": 1047240,
        "종량 / A.앱머니 / 전권 대여 / 매출액": 110160,
        "종량 / A.앱머니 / 전권 소장 / 매출액": 34200,
        "종량 / i.앱머니 / 권별 대여 / 매출액": 19440,
        "종량 / i.앱머니 / 권별 소장 / 매출액": 96240,
        "합계(정액+종량) / 정산액": 5271042,
        sourceRowIndex: 171,
      }),
    ]);

    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual([]);
  });

  it("returns invalid_value when total settlement cannot be parsed", () => {
    const result = parseMisterblueSingleFileRows(baseContext, [
      createRow({ "합계(정액+종량) / 정산액": "N/A" }),
    ]);

    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        issueType: "invalid_value",
        message: expect.stringContaining("합계(정액+종량) / 정산액"),
        sourceRowIndex: 29,
      }),
    ]);
  });
});
