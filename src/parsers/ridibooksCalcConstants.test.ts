import { describe, expect, it } from "vitest";
import {
  RIDIBOOKS_CALC_RATES,
  RIDIBOOKS_EVENT_PERIOD_POLICY,
  RIDIBOOKS_FILE_SLOTS,
  RIDIBOOKS_MG_POLICY,
  RIDIBOOKS_OUTPUT_SUFFIXES,
  RIDIBOOKS_REQUIRED_COLUMNS,
} from "./ridibooksCalcConstants";

describe("ridibooks calculation constants", () => {
  it("fixes required file slots without relying on file names", () => {
    expect(RIDIBOOKS_FILE_SLOTS).toEqual({
      base: { required: true },
      file1: { required: true },
      event: { required: false },
      mgCorrection: { required: false },
    });
  });

  it("fixes normal, app, and MG rates", () => {
    expect(RIDIBOOKS_CALC_RATES).toEqual({
      normal: 0.7,
      app: 0.7,
      mg: 0.6,
    });
  });

  it("fixes output suffix policy", () => {
    expect(RIDIBOOKS_OUTPUT_SUFFIXES).toEqual({
      normal: "",
      app: "(app)",
      event: "(이벤트)",
      eventApp: "(이벤트)(app)",
    });
  });

  it("fixes MG and event period policies", () => {
    expect(RIDIBOOKS_MG_POLICY).toMatchObject({
      source: "explicit_correction_input",
      forbidsFilenameInference: true,
      defaultWhenMissing: "non_mg",
    });
    expect(RIDIBOOKS_EVENT_PERIOD_POLICY).toMatchObject({
      requiredWhenEventFileExists: true,
      missingPeriodBlocksParsing: true,
    });
  });

  it("defines required column groups for base, file_1, event, and MG correction inputs", () => {
    expect(RIDIBOOKS_REQUIRED_COLUMNS.base.identity).toEqual([
      "도서 ID",
      "제목",
      "저자",
      "출판사",
    ]);
    expect(RIDIBOOKS_REQUIRED_COLUMNS.base.amounts).toEqual([
      "일반 판매액",
      "일반 취소액",
      "앱마켓 정산대상액",
      "앱마켓 수수료",
      "앱마켓 취소액",
      "정산액",
    ]);
    expect(RIDIBOOKS_REQUIRED_COLUMNS.file1.amounts).toEqual([
      "일반 판매액",
      "일반 취소액",
      "정산액",
    ]);
    expect(RIDIBOOKS_REQUIRED_COLUMNS.event.identity).toEqual(["도서ID", "제목"]);
    expect(RIDIBOOKS_REQUIRED_COLUMNS.event.amounts).toEqual([
      "결제일",
      "일반 판매액",
      "일반 정산액",
      "iOS 앱마켓 정산대상액",
      "iOS 앱마켓 정산액",
      "Android 앱마켓 정산대상액",
      "Android 앱마켓 정산액",
      "OneStore 앱마켓 정산대상액",
      "OneStore 앱마켓 정산액",
    ]);
    expect(RIDIBOOKS_REQUIRED_COLUMNS.mgCorrection.matching).toContain("도서 ID");
  });
});
