import { describe, expect, it } from "vitest";
import type { ParserContext, TabularRow } from "./parserContract";
import {
  applyMunpiaAuthorCorrection,
  requiresMunpiaAuthorCorrection,
} from "./munpiaAuthorCorrectionUtils";
import {
  MUNPIA_AUTHOR_CORRECTION_COLUMNS,
  MUNPIA_REQUIRED_COLUMNS,
} from "./munpiaCalcConstants";

const context: ParserContext = {
  batchId: "batch-munpia",
  company: "sr",
  platform: "munpia",
  saleMonth: "2026-05",
  sourceFileName: "munpia-author-correction.csv",
};

function makeCorrectionRow(overrides: Partial<TabularRow> = {}): TabularRow {
  return {
    [MUNPIA_AUTHOR_CORRECTION_COLUMNS.workCode]: "485076",
    [MUNPIA_AUTHOR_CORRECTION_COLUMNS.workTitle]: "나 혼자 히든농장",
    [MUNPIA_AUTHOR_CORRECTION_COLUMNS.author]: "Corrected Author",
    sourceFileName: "munpia-author-correction.csv",
    sourceRowIndex: 2,
    ...overrides,
  };
}

function makeInput(overrides: Partial<Parameters<typeof applyMunpiaAuthorCorrection>[0]> = {}) {
  return {
    context,
    author: "AreteBooks",
    workCode: "485076",
    workTitle: "나 혼자 히든농장",
    correctionRows: [makeCorrectionRow()],
    ...overrides,
  };
}

describe("munpia author correction utils", () => {
  it("detects author labels that require explicit correction", () => {
    expect(requiresMunpiaAuthorCorrection("AreteBooks")).toBe(true);
    expect(requiresMunpiaAuthorCorrection(" aretebooks ")).toBe(true);
    expect(requiresMunpiaAuthorCorrection("Sample Author")).toBe(false);
  });

  it("leaves normal authors unchanged without requiring correction rows", () => {
    const result = applyMunpiaAuthorCorrection(makeInput({
      author: "Sample Author",
      correctionRows: [],
    }));

    expect(result).toEqual({
      author: "Sample Author",
      issues: [],
    });
  });

  it("corrects company author labels by work code first", () => {
    const result = applyMunpiaAuthorCorrection(makeInput({
      correctionRows: [
        makeCorrectionRow({
          [MUNPIA_AUTHOR_CORRECTION_COLUMNS.workCode]: "",
          [MUNPIA_AUTHOR_CORRECTION_COLUMNS.workTitle]: "나 혼자 히든농장",
          [MUNPIA_AUTHOR_CORRECTION_COLUMNS.author]: "Fallback Author",
        }),
        makeCorrectionRow({
          [MUNPIA_AUTHOR_CORRECTION_COLUMNS.workCode]: "485076",
          [MUNPIA_AUTHOR_CORRECTION_COLUMNS.author]: "Primary Author",
        }),
      ],
    }));

    expect(result).toEqual({
      author: "Primary Author",
      issues: [],
    });
  });

  it("uses work title fallback only when correction work code is blank", () => {
    const result = applyMunpiaAuthorCorrection(makeInput({
      workCode: "485076",
      workTitle: "나 혼자 히든농장",
      correctionRows: [
        makeCorrectionRow({
          [MUNPIA_AUTHOR_CORRECTION_COLUMNS.workCode]: "",
          [MUNPIA_AUTHOR_CORRECTION_COLUMNS.workTitle]: "나 혼자 히든농장",
          [MUNPIA_AUTHOR_CORRECTION_COLUMNS.author]: "Fallback Author",
        }),
      ],
    }));

    expect(result).toEqual({
      author: "Fallback Author",
      issues: [],
    });
  });

  it("returns mapping_failed when required correction cannot be matched", () => {
    const result = applyMunpiaAuthorCorrection(makeInput({
      correctionRows: [
        makeCorrectionRow({
          [MUNPIA_AUTHOR_CORRECTION_COLUMNS.workCode]: "404",
          [MUNPIA_AUTHOR_CORRECTION_COLUMNS.workTitle]: "Other Work",
        }),
      ],
    }));

    expect(result.author).toBe("AreteBooks");
    expect(result.issues).toEqual([
      expect.objectContaining({
        issueType: "mapping_failed",
        severity: "error",
        sourceFileName: "munpia-author-correction.csv",
        sourceRowIndex: 2,
      }),
    ]);
  });

  it("returns missing_field when matched correction author is blank", () => {
    const result = applyMunpiaAuthorCorrection(makeInput({
      correctionRows: [
        makeCorrectionRow({
          [MUNPIA_AUTHOR_CORRECTION_COLUMNS.author]: "",
        }),
      ],
    }));

    expect(result.author).toBe("AreteBooks");
    expect(result.issues).toEqual([
      expect.objectContaining({
        issueType: "missing_field",
        severity: "error",
        sourceFileName: "munpia-author-correction.csv",
        sourceRowIndex: 2,
      }),
    ]);
  });

  it("uses Munpia source columns as correction input keys", () => {
    expect(MUNPIA_REQUIRED_COLUMNS.correction).toEqual([
      MUNPIA_AUTHOR_CORRECTION_COLUMNS.workCode,
      MUNPIA_AUTHOR_CORRECTION_COLUMNS.account,
    ]);
  });
});
