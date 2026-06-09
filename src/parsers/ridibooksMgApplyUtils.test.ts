import { describe, expect, it } from "vitest";
import type { ParserContext, TabularRow } from "./parserContract";
import { RIDIBOOKS_REQUIRED_COLUMNS } from "./ridibooksCalcConstants";
import type { RidibooksRowCalculation } from "./ridibooksRowCalcUtils";
import {
  applyRidibooksMgCorrection,
  type RidibooksMgCorrectionInput,
} from "./ridibooksMgApplyUtils";

const context: ParserContext = {
  batchId: "batch-ridi",
  company: "raon",
  platform: "ridibooks",
  saleMonth: "2026-05",
  sourceFileName: "mg-correction.csv",
};

function makeCalculation(): RidibooksRowCalculation {
  return {
    outputRows: [
      {
        kind: "normal",
        grossSales: 720,
        settlementAmount: 534,
        sourceRefs: [
          { sourceFileName: "calculate_1.csv", sourceRowIndex: 2 },
          { sourceFileName: "calculate_1 (1).csv", sourceRowIndex: 2 },
        ],
      },
      {
        kind: "app",
        grossSales: 550,
        settlementAmount: 280,
        sourceRefs: [{ sourceFileName: "calculate_1.csv", sourceRowIndex: 2 }],
      },
    ],
    sourceRefs: [
      { sourceFileName: "calculate_1.csv", sourceRowIndex: 2 },
      { sourceFileName: "calculate_1 (1).csv", sourceRowIndex: 2 },
    ],
  };
}

function makeCorrectionRow(overrides: Partial<TabularRow> = {}): TabularRow {
  const [bookId] = RIDIBOOKS_REQUIRED_COLUMNS.mgCorrection.matching;
  const [mgFlag] = RIDIBOOKS_REQUIRED_COLUMNS.mgCorrection.values;

  return {
    [bookId]: "RIDI-001",
    [mgFlag]: "Y",
    sourceFileName: "mg-correction.csv",
    sourceRowIndex: 2,
    ...overrides,
  };
}

function makeInput(overrides: Partial<RidibooksMgCorrectionInput> = {}): RidibooksMgCorrectionInput {
  return {
    context,
    bookId: "RIDI-001",
    workTitle: "Sample Work",
    calculation: makeCalculation(),
    correctionRows: [makeCorrectionRow()],
    ...overrides,
  };
}

describe("ridibooks MG apply utils", () => {
  it("applies explicit MG correction to the normal output only", () => {
    const result = applyRidibooksMgCorrection(makeInput());

    expect(result.issues).toEqual([]);
    expect(result.calculation.outputRows).toEqual([
      expect.objectContaining({
        kind: "normal",
        grossSales: 720,
        settlementAmount: 432,
        sourceRefs: [
          { sourceFileName: "calculate_1.csv", sourceRowIndex: 2 },
          { sourceFileName: "calculate_1 (1).csv", sourceRowIndex: 2 },
          { sourceFileName: "mg-correction.csv", sourceRowIndex: 2 },
        ],
      }),
      expect.objectContaining({
        kind: "app",
        grossSales: 550,
        settlementAmount: 280,
        sourceRefs: [{ sourceFileName: "calculate_1.csv", sourceRowIndex: 2 }],
      }),
    ]);
  });

  it("leaves calculation unchanged when explicit MG correction is absent", () => {
    const calculation = makeCalculation();
    const result = applyRidibooksMgCorrection(makeInput({ calculation, correctionRows: [] }));

    expect(result).toEqual({ calculation, issues: [] });
  });

  it("matches by work title only as an explicit fallback", () => {
    const [bookId, title] = RIDIBOOKS_REQUIRED_COLUMNS.mgCorrection.matching;
    const result = applyRidibooksMgCorrection(
      makeInput({
        correctionRows: [
          makeCorrectionRow({
            [bookId]: "",
            [title]: "Sample Work",
          }),
        ],
      }),
    );

    expect(result.issues).toEqual([]);
    expect(result.calculation.outputRows[0].settlementAmount).toBe(432);
  });

  it("returns mapping_failed when an explicit correction row cannot be matched", () => {
    const [bookId] = RIDIBOOKS_REQUIRED_COLUMNS.mgCorrection.matching;
    const result = applyRidibooksMgCorrection(
      makeInput({
        correctionRows: [makeCorrectionRow({ [bookId]: "RIDI-404" })],
      }),
    );

    expect(result.calculation).toEqual(makeCalculation());
    expect(result.issues).toEqual([
      expect.objectContaining({
        issueType: "mapping_failed",
        severity: "error",
        sourceFileName: "mg-correction.csv",
        sourceRowIndex: 2,
      }),
    ]);
  });

  it("returns invalid_value when an explicit MG flag is not recognized", () => {
    const [mgFlag] = RIDIBOOKS_REQUIRED_COLUMNS.mgCorrection.values;
    const result = applyRidibooksMgCorrection(
      makeInput({
        correctionRows: [makeCorrectionRow({ [mgFlag]: "maybe" })],
      }),
    );

    expect(result.calculation).toEqual(makeCalculation());
    expect(result.issues).toEqual([
      expect.objectContaining({
        issueType: "invalid_value",
        severity: "error",
      }),
    ]);
  });
});
