import type { BatchParseOrchestratorResult } from "../orchestrators/batchParseOrchestrator";
import type { Company, ParseIssue, ParseIssueType, Platform, SettlementRow } from "../types/settlement";

const validCompanies = new Set<Company>(["raon", "sr"]);
const validPlatforms = new Set<Platform>([
  "novelpia",
  "mootoon",
  "panmurim",
  "epyrus",
  "kyobo",
  "yes24",
  "aladin",
  "guru_company",
  "series",
  "joara",
  "bookcube",
  "onestore",
  "kakao_page",
  "munpia",
  "misterblue",
  "ridibooks",
]);

export function validateSettlementRow(row: SettlementRow): ParseIssue[] {
  return [
    ...validateRequiredTextFields(row),
    ...validateCompanyAndPlatform(row),
    ...validateMoneyFields(row),
    ...validateSourceTrace(row),
  ];
}

export function validateSettlementRows(rows: SettlementRow[]): ParseIssue[] {
  return rows.flatMap(validateSettlementRow);
}

export function validateBatchParseResult(result: BatchParseOrchestratorResult): ParseIssue[] {
  return validateSettlementRows(result.rows);
}

function validateRequiredTextFields(row: SettlementRow): ParseIssue[] {
  return [
    validateRequiredText(row, "workTitle", row.workTitle),
    validateRequiredText(row, "mailerContentTitle", row.mailerContentTitle),
    validateRequiredText(row, "author", row.author),
    validateRequiredText(row, "saleMonth", row.saleMonth),
  ].filter((issue): issue is ParseIssue => issue !== null);
}

function validateCompanyAndPlatform(row: SettlementRow): ParseIssue[] {
  const issues: ParseIssue[] = [];

  if (!validCompanies.has(row.company)) {
    issues.push(createPreExportIssue(row, "invalid_value", "company is missing or invalid."));
  }

  if (!validPlatforms.has(row.platform)) {
    issues.push(createPreExportIssue(row, "invalid_value", "platform is missing or invalid."));
  }

  return issues;
}

function validateMoneyFields(row: SettlementRow): ParseIssue[] {
  return [
    validateNonNegativeNumber(row, "grossSales", row.grossSales),
    validateNonNegativeNumber(row, "settlementAmount", row.settlementAmount),
  ].filter((issue): issue is ParseIssue => issue !== null);
}

function validateSourceTrace(row: SettlementRow): ParseIssue[] {
  const issues: ParseIssue[] = [];

  const sourceFileNameIssue = validateRequiredText(row, "sourceFileName", row.sourceFileName);
  if (sourceFileNameIssue) {
    issues.push(sourceFileNameIssue);
  }

  if (!Number.isInteger(row.sourceRowIndex) || row.sourceRowIndex < 1) {
    issues.push(createPreExportIssue(row, "invalid_value", "sourceRowIndex is missing or invalid."));
  }

  return issues;
}

function validateRequiredText(
  row: SettlementRow,
  fieldName: keyof SettlementRow,
  value: unknown,
): ParseIssue | null {
  if (typeof value === "string" && value.trim() !== "") {
    return null;
  }

  return createPreExportIssue(row, "missing_field", `${String(fieldName)} is required before export.`);
}

function validateNonNegativeNumber(
  row: SettlementRow,
  fieldName: "grossSales" | "settlementAmount",
  value: unknown,
): ParseIssue | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return null;
  }

  return createPreExportIssue(row, "invalid_value", `${fieldName} must be a non-negative number.`);
}

function createPreExportIssue(
  row: SettlementRow,
  issueType: ParseIssueType,
  message: string,
): ParseIssue {
  return {
    issueId: `${row.rowId}-pre_export-${issueType}-${message.split(" ")[0]}`,
    batchId: "pre-export",
    company: validCompanies.has(row.company) ? row.company : "raon",
    platform: validPlatforms.has(row.platform) ? row.platform : "novelpia",
    severity: "error",
    issueType,
    message,
    sourceFileName: row.sourceFileName,
    sourceRowIndex: row.sourceRowIndex,
    rowId: row.rowId,
  };
}
