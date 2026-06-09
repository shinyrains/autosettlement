import type {
  ParserContext,
  ParserResult,
  PlatformFileGroupInput,
  PlatformFileGroupParserContext,
} from "./parserContract";
import { MUNPIA_REQUIRED_COLUMNS } from "./munpiaCalcConstants";
import { parseMunpiaSingleFileRows } from "./munpiaSingleFileParser";
import type { ParseIssue } from "../types/settlement";

export type MunpiaGroupFileSlot = "settlement" | "authorCorrection";

export type MunpiaGroupFileInput = PlatformFileGroupInput & {
  slot?: string;
  worksheetCount?: number;
  sheetName?: string;
};

const MUNPIA_SETTLEMENT_SLOT: MunpiaGroupFileSlot = "settlement";
const MUNPIA_AUTHOR_CORRECTION_SLOT: MunpiaGroupFileSlot = "authorCorrection";
const MUNPIA_ALLOWED_SLOTS = new Set<MunpiaGroupFileSlot>([
  MUNPIA_SETTLEMENT_SLOT,
  MUNPIA_AUTHOR_CORRECTION_SLOT,
]);
const MUNPIA_SETTLEMENT_REQUIRED_COLUMNS = [
  ...MUNPIA_REQUIRED_COLUMNS.identity,
  ...MUNPIA_REQUIRED_COLUMNS.amounts,
] as const;

export function parseMunpiaFileGroup(
  context: PlatformFileGroupParserContext,
  files: MunpiaGroupFileInput[],
): ParserResult {
  const adapterIssues = files.flatMap((file) => file.issues);
  const blockingIssues = validateMunpiaFileGroup(context, files);
  if (blockingIssues.length > 0) {
    return {
      rows: [],
      issues: [...adapterIssues, ...blockingIssues],
    };
  }

  const settlementFile = files.find((file) => file.slot === MUNPIA_SETTLEMENT_SLOT);
  if (!settlementFile) {
    return {
      rows: [],
      issues: [...adapterIssues, createMissingSettlementIssue(context)],
    };
  }

  if (settlementFile.issues.length > 0) {
    return {
      rows: [],
      issues: [...adapterIssues],
    };
  }

  const settlementBlockingIssues = validateSettlementBlockingIssues(context, settlementFile);
  if (settlementBlockingIssues.length > 0) {
    return {
      rows: [],
      issues: [...adapterIssues, ...settlementBlockingIssues],
    };
  }

  const authorCorrectionFile = files.find((file) => file.slot === MUNPIA_AUTHOR_CORRECTION_SLOT);
  const parsed = parseMunpiaSingleFileRows(
    createParserContext(context, settlementFile),
    settlementFile.rows,
    {
      authorCorrectionRows: authorCorrectionFile?.rows,
    },
  );

  return {
    rows: parsed.rows,
    issues: [...adapterIssues, ...parsed.issues],
  };
}

function validateMunpiaFileGroup(
  context: PlatformFileGroupParserContext,
  files: MunpiaGroupFileInput[],
): ParseIssue[] {
  const unknownSlotIssue = files.find((file) => !MUNPIA_ALLOWED_SLOTS.has(file.slot as MunpiaGroupFileSlot));
  if (unknownSlotIssue) {
    return [createUnknownSlotIssue(context, unknownSlotIssue)];
  }

  const settlementFiles = files.filter((file) => file.slot === MUNPIA_SETTLEMENT_SLOT);
  if (settlementFiles.length === 0) {
    return [createMissingSettlementIssue(context)];
  }

  if (settlementFiles.length > 1) {
    return [createDuplicateSettlementIssue(context)];
  }

  const authorCorrectionFiles = files.filter((file) => file.slot === MUNPIA_AUTHOR_CORRECTION_SLOT);
  if (authorCorrectionFiles.length > 1) {
    return [createDuplicateAuthorCorrectionIssue(context)];
  }

  const settlementFile = settlementFiles[0];
  if ((settlementFile.worksheetCount ?? 1) > 1 && readText(settlementFile.sheetName) === "") {
    return [createMultisheetWithoutSheetNameIssue(context, settlementFile.sourceFileName)];
  }

  return [];
}

function validateSettlementBlockingIssues(
  context: PlatformFileGroupParserContext,
  file: MunpiaGroupFileInput,
): ParseIssue[] {
  if (file.rows.length === 0) {
    return [];
  }

  const presentColumns = new Set(file.rows.flatMap((row) => Object.keys(trimHeaderNames(row))));
  return MUNPIA_SETTLEMENT_REQUIRED_COLUMNS
    .filter((column) => !presentColumns.has(column))
    .map((column) => createMissingRequiredColumnIssue(context, file.sourceFileName, column));
}

function trimHeaderNames(row: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key.trim(), value]));
}

function createParserContext(
  context: PlatformFileGroupParserContext,
  file: MunpiaGroupFileInput,
): ParserContext {
  return {
    batchId: context.batchId,
    company: context.company,
    platform: context.platform,
    saleMonth: context.saleMonth,
    sourceFileName: file.sourceFileName,
  };
}

function createMissingSettlementIssue(context: PlatformFileGroupParserContext): ParseIssue {
  return {
    issueId: `${context.batchId}-munpia-${context.company}-missing-settlement-slot`,
    batchId: context.batchId,
    company: context.company,
    platform: "munpia",
    severity: "error",
    issueType: "missing_file",
    message: "Required settlement slot is missing for this Munpia group.",
  };
}

function createDuplicateSettlementIssue(context: PlatformFileGroupParserContext): ParseIssue {
  return {
    issueId: `${context.batchId}-munpia-${context.company}-duplicate-settlement-slot`,
    batchId: context.batchId,
    company: context.company,
    platform: "munpia",
    severity: "error",
    issueType: "parse_error",
    message: "Settlement slot is declared more than once for this Munpia group.",
  };
}

function createDuplicateAuthorCorrectionIssue(context: PlatformFileGroupParserContext): ParseIssue {
  return {
    issueId: `${context.batchId}-munpia-${context.company}-duplicate-author-correction-slot`,
    batchId: context.batchId,
    company: context.company,
    platform: "munpia",
    severity: "error",
    issueType: "parse_error",
    message: "authorCorrection slot is declared more than once for this Munpia group.",
  };
}

function createUnknownSlotIssue(
  context: PlatformFileGroupParserContext,
  file: MunpiaGroupFileInput,
): ParseIssue {
  return {
    issueId: `${context.batchId}-munpia-${context.company}-unknown-slot`,
    batchId: context.batchId,
    company: context.company,
    platform: "munpia",
    severity: "error",
    issueType: "parse_error",
    message: `Unsupported slot "${String(file.slot)}" was provided for this Munpia group.`,
    sourceFileName: file.sourceFileName,
  };
}

function createMultisheetWithoutSheetNameIssue(
  context: PlatformFileGroupParserContext,
  sourceFileName: string,
): ParseIssue {
  return {
    issueId: `${context.batchId}-munpia-${context.company}-multisheet-without-sheet-name`,
    batchId: context.batchId,
    company: context.company,
    platform: "munpia",
    severity: "error",
    issueType: "parse_error",
    message: "Settlement workbook has multiple worksheets but no explicit sheetName was provided.",
    sourceFileName,
  };
}

function createMissingRequiredColumnIssue(
  context: PlatformFileGroupParserContext,
  sourceFileName: string,
  column: string,
): ParseIssue {
  return {
    issueId: `${context.batchId}-munpia-${context.company}-missing-required-column-${getColumnIssueSlug(column)}`,
    batchId: context.batchId,
    company: context.company,
    platform: "munpia",
    severity: "error",
    issueType: "missing_column",
    message: `Munpia required column is missing: ${column}.`,
    sourceFileName,
  };
}

function getColumnIssueSlug(column: string): string {
  switch (column) {
    case "작가":
      return "author";
    case "작품":
      return "work-title";
    case "총매출":
      return "gross-sales";
    case "IOS매출":
      return "ios-sales";
    case "Google매출":
      return "google-sales";
    default:
      return column.replace(/\s+/g, "-").toLowerCase();
  }
}

function readText(value: unknown): string {
  return String(value ?? "").trim();
}
