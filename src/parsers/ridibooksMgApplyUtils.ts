import type { ParseIssue } from "../types/settlement";
import {
  RIDIBOOKS_CALC_RATES,
  RIDIBOOKS_REQUIRED_COLUMNS,
} from "./ridibooksCalcConstants";
import type { ParserContext, TabularRow } from "./parserContract";
import type {
  RidibooksRowCalculation,
  RidibooksSourceRef,
} from "./ridibooksRowCalcUtils";

export type RidibooksMgCorrectionInput = {
  context: ParserContext;
  bookId: string;
  workTitle: string;
  calculation: RidibooksRowCalculation;
  correctionRows: TabularRow[];
};

export type RidibooksMgCorrectionResult = {
  calculation: RidibooksRowCalculation;
  issues: ParseIssue[];
};

export function applyRidibooksMgCorrection({
  context,
  bookId,
  workTitle,
  calculation,
  correctionRows,
}: RidibooksMgCorrectionInput): RidibooksMgCorrectionResult {
  if (correctionRows.length === 0) {
    return { calculation, issues: [] };
  }

  const correction = findCorrectionRow({ context, bookId, workTitle, correctionRows });
  if ("issueId" in correction) {
    return { calculation, issues: [correction] };
  }

  if (!isMgEnabled(correction.row)) {
    return {
      calculation,
      issues: [
        createRidibooksMgIssue({
          context,
          row: correction.row,
          issueType: "invalid_value",
          message: "MG correction value must be an explicit enabled flag.",
        }),
      ],
    };
  }

  return {
    calculation: applyMgRate(calculation, createSourceRefs(correction.row)),
    issues: [],
  };
}

function findCorrectionRow({
  context,
  bookId,
  workTitle,
  correctionRows,
}: {
  context: ParserContext;
  bookId: string;
  workTitle: string;
  correctionRows: TabularRow[];
}): { row: TabularRow } | ParseIssue {
  const [bookIdColumn, titleColumn] = RIDIBOOKS_REQUIRED_COLUMNS.mgCorrection.matching;
  const matched = correctionRows.find((row) =>
    readText(row[bookIdColumn]) === bookId
      || (readText(row[bookIdColumn]) === "" && readText(row[titleColumn]) === workTitle),
  );

  if (matched) {
    return { row: matched };
  }

  return createRidibooksMgIssue({
    context,
    row: correctionRows[0],
    issueType: "mapping_failed",
    message: `MG correction row could not be matched for ${bookId}.`,
  });
}

function applyMgRate(
  calculation: RidibooksRowCalculation,
  correctionSourceRefs: RidibooksSourceRef[],
): RidibooksRowCalculation {
  return {
    sourceRefs: [...calculation.sourceRefs, ...correctionSourceRefs],
    outputRows: calculation.outputRows.map((row) => {
      if (row.kind !== "normal") {
        return row;
      }

      return {
        ...row,
        settlementAmount: normalizeAmount(row.grossSales * RIDIBOOKS_CALC_RATES.mg),
        sourceRefs: [...row.sourceRefs, ...correctionSourceRefs],
      };
    }),
  };
}

function isMgEnabled(row: TabularRow): boolean {
  const [mgFlagColumn] = RIDIBOOKS_REQUIRED_COLUMNS.mgCorrection.values;
  return ["y", "yes", "true", "1", "mg"].includes(readText(row[mgFlagColumn]).toLowerCase());
}

function createRidibooksMgIssue({
  context,
  row,
  issueType,
  message,
}: {
  context: ParserContext;
  row: TabularRow | undefined;
  issueType: "mapping_failed" | "invalid_value";
  message: string;
}): ParseIssue {
  const sourceFileName = typeof row?.sourceFileName === "string"
    ? row.sourceFileName
    : context.sourceFileName;
  const sourceRowIndex = typeof row?.sourceRowIndex === "number" ? row.sourceRowIndex : undefined;

  return {
    issueId: [
      context.batchId,
      context.platform,
      "mg",
      issueType,
      sourceRowIndex ?? "file",
    ].join("-"),
    batchId: context.batchId,
    company: context.company,
    platform: context.platform,
    severity: "error",
    issueType,
    message,
    sourceFileName,
    sourceRowIndex,
  };
}

function readText(value: unknown): string {
  return String(value ?? "").trim();
}

function createSourceRefs(row: TabularRow): RidibooksSourceRef[] {
  const sourceFileName = row.sourceFileName;
  const sourceRowIndex = row.sourceRowIndex;

  if (typeof sourceFileName !== "string" || typeof sourceRowIndex !== "number") {
    return [];
  }

  return [{ sourceFileName, sourceRowIndex }];
}

function normalizeAmount(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
