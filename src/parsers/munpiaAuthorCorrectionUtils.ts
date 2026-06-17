import type { ParseIssue } from "../types/settlement";
import type { ParserContext, TabularRow } from "./parserContract";
import {
  MUNPIA_AUTHOR_CORRECTION_COLUMNS,
  MUNPIA_AUTHOR_CORRECTION_POLICY,
} from "./munpiaCalcConstants";

export type MunpiaAuthorCorrectionInput = {
  context: ParserContext;
  author: string;
  workCode: string;
  workTitle: string;
  correctionRows: TabularRow[];
};

export type MunpiaAuthorCorrectionResult = {
  author: string;
  issues: ParseIssue[];
};

export function applyMunpiaAuthorCorrection({
  context,
  author,
  workCode,
  workTitle,
  correctionRows,
}: MunpiaAuthorCorrectionInput): MunpiaAuthorCorrectionResult {
  const sourceAuthor = readText(author);
  if (!requiresMunpiaAuthorCorrection(sourceAuthor)) {
    return { author: sourceAuthor, issues: [] };
  }

  const correctionRow = findCorrectionRow({ workCode, workTitle, correctionRows });
  if (!correctionRow) {
    return {
      author: sourceAuthor,
      issues: [
        createMunpiaAuthorCorrectionIssue({
          context,
          row: correctionRows[0],
          issueType: "mapping_failed",
          message: `문피아 작가 보정 파일에서 ${workCode || workTitle}에 해당하는 행을 찾지 못했습니다. AreteBooks 같은 계정/회사 작가명은 원본 정산 파일만으로 실제 작가를 확정할 수 없으므로 작품코드/작품/작가명이 포함된 작가 보정 파일을 함께 업로드해야 합니다.`,
        }),
      ],
    };
  }

  const correctedAuthor = readText(correctionRow[MUNPIA_AUTHOR_CORRECTION_COLUMNS.author]);
  if (correctedAuthor === "") {
    return {
      author: sourceAuthor,
      issues: [
        createMunpiaAuthorCorrectionIssue({
          context,
          row: correctionRow,
          issueType: "missing_field",
          message: "Munpia author correction row is missing author.",
        }),
      ],
    };
  }

  return { author: correctedAuthor, issues: [] };
}

export function requiresMunpiaAuthorCorrection(author: string): boolean {
  const normalizedAuthor = readText(author).toLowerCase();
  return MUNPIA_AUTHOR_CORRECTION_POLICY.requiredForAuthorLabels.some(
    (label) => readText(label).toLowerCase() === normalizedAuthor,
  );
}

function findCorrectionRow({
  workCode,
  workTitle,
  correctionRows,
}: {
  workCode: string;
  workTitle: string;
  correctionRows: TabularRow[];
}): TabularRow | undefined {
  const normalizedWorkCode = readText(workCode);
  const normalizedWorkTitle = readText(workTitle);

  const primaryMatch = correctionRows.find(
    (row) => normalizedWorkCode !== ""
      && readText(row[MUNPIA_AUTHOR_CORRECTION_COLUMNS.workCode]) === normalizedWorkCode,
  );
  if (primaryMatch) {
    return primaryMatch;
  }

  return correctionRows.find(
    (row) => readText(row[MUNPIA_AUTHOR_CORRECTION_COLUMNS.workCode]) === ""
      && normalizedWorkTitle !== ""
      && readText(row[MUNPIA_AUTHOR_CORRECTION_COLUMNS.workTitle]) === normalizedWorkTitle,
  );
}

function createMunpiaAuthorCorrectionIssue({
  context,
  row,
  issueType,
  message,
}: {
  context: ParserContext;
  row: TabularRow | undefined;
  issueType: "mapping_failed" | "missing_field";
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
      "author-correction",
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
