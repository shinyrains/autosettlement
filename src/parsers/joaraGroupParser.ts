import type { ParseIssue, ParseIssueSeverity, ParseIssueType, SettlementRow } from "../types/settlement";
import type { PlatformFileGroupInput, PlatformFileGroupParserContext, ParserResult, TabularRow } from "./parserContract";
import { parseMoney } from "./simpleExtractUtils";

export type JoaraGroupFileSlot = "settlementDetail" | "workSettlement";

export type JoaraGroupFileInput = PlatformFileGroupInput & {
  slot?: string;
};

type JoaraGroupedFiles = {
  settlementDetail?: JoaraGroupFileInput;
  workSettlement?: JoaraGroupFileInput;
};

type GroupKeyParts = {
  workTitle: string;
  workCode: string;
  author: string;
};

type DetailAggregate = GroupKeyParts & {
  grossSales: number;
  sourceFileName: string;
  sourceRowIndex: number;
};

type WorkAggregate = GroupKeyParts & {
  settlementAmount: number;
  sourceFileName: string;
  sourceRowIndex: number;
};

const JOARA_SETTLEMENT_DETAIL_SLOT: JoaraGroupFileSlot = "settlementDetail";
const JOARA_WORK_SETTLEMENT_SLOT: JoaraGroupFileSlot = "workSettlement";
const JOARA_ALLOWED_SLOTS = new Set<JoaraGroupFileSlot>([
  JOARA_SETTLEMENT_DETAIL_SLOT,
  JOARA_WORK_SETTLEMENT_SLOT,
]);
const JOARA_DETAIL_REQUIRED_COLUMNS = ["작품명", "작품코드", "작가명", "판매금액(원)"] as const;
const JOARA_WORK_REQUIRED_COLUMNS = ["작품명", "작품코드", "작가명", "정산금액"] as const;

export function parseJoaraFileGroup(
  context: PlatformFileGroupParserContext,
  files: JoaraGroupFileInput[],
): ParserResult {
  const adapterIssues = files.flatMap((file) => file.issues);
  const slotIssues = validateJoaraFileGroup(context, files);
  if (slotIssues.length > 0) {
    return {
      rows: [],
      issues: [...adapterIssues, ...slotIssues],
    };
  }

  const groupedFiles = groupFilesBySlot(files);
  const requiredAdapterIssues = getRequiredAdapterIssues(groupedFiles);
  const columnIssues = [
    ...validateRequiredColumns(context, groupedFiles.settlementDetail, JOARA_DETAIL_REQUIRED_COLUMNS),
    ...validateRequiredColumns(context, groupedFiles.workSettlement, JOARA_WORK_REQUIRED_COLUMNS),
  ];

  if (requiredAdapterIssues.length > 0 || columnIssues.length > 0) {
    return {
      rows: [],
      issues: [...adapterIssues, ...columnIssues],
    };
  }

  const issues: ParseIssue[] = [...adapterIssues];
  const detailAggregates = collectDetailAggregates(context, groupedFiles.settlementDetail!, issues);
  const workAggregates = collectWorkAggregates(context, groupedFiles.workSettlement!, issues);
  const rows = buildSettlementRows(context, detailAggregates, workAggregates, issues);

  return { rows, issues };
}

function validateJoaraFileGroup(
  context: PlatformFileGroupParserContext,
  files: JoaraGroupFileInput[],
): ParseIssue[] {
  const unknownSlotFile = files.find((file) => !JOARA_ALLOWED_SLOTS.has(file.slot as JoaraGroupFileSlot));
  if (unknownSlotFile) {
    return [
      createIssue(
        context,
        "parse_error",
        "error",
        `Unsupported slot "${String(unknownSlotFile.slot)}" was provided for this Joara group.`,
        unknownSlotFile.sourceFileName,
      ),
    ];
  }

  const settlementDetailFiles = files.filter((file) => file.slot === JOARA_SETTLEMENT_DETAIL_SLOT);
  if (settlementDetailFiles.length === 0) {
    return [createIssue(context, "missing_file", "error", "Required settlementDetail slot is missing for this Joara group.")];
  }
  if (settlementDetailFiles.length > 1) {
    return [
      createIssue(
        context,
        "parse_error",
        "error",
        "settlementDetail slot is declared more than once for this Joara group.",
        settlementDetailFiles[1].sourceFileName,
      ),
    ];
  }

  const workSettlementFiles = files.filter((file) => file.slot === JOARA_WORK_SETTLEMENT_SLOT);
  if (workSettlementFiles.length === 0) {
    return [createIssue(context, "missing_file", "error", "Required workSettlement slot is missing for this Joara group.")];
  }
  if (workSettlementFiles.length > 1) {
    return [
      createIssue(
        context,
        "parse_error",
        "error",
        "workSettlement slot is declared more than once for this Joara group.",
        workSettlementFiles[1].sourceFileName,
      ),
    ];
  }

  return [];
}

function groupFilesBySlot(files: JoaraGroupFileInput[]): JoaraGroupedFiles {
  return {
    settlementDetail: files.find((file) => file.slot === JOARA_SETTLEMENT_DETAIL_SLOT),
    workSettlement: files.find((file) => file.slot === JOARA_WORK_SETTLEMENT_SLOT),
  };
}

function getRequiredAdapterIssues(groupedFiles: JoaraGroupedFiles): ParseIssue[] {
  return [groupedFiles.settlementDetail, groupedFiles.workSettlement]
    .flatMap((file) => file?.issues ?? [])
    .filter((issue) => issue.issueType === "parse_error");
}

function validateRequiredColumns(
  context: PlatformFileGroupParserContext,
  file: JoaraGroupFileInput | undefined,
  columns: readonly string[],
): ParseIssue[] {
  if (!file || file.rows.length === 0) {
    return [];
  }

  const presentColumns = new Set(file.rows.flatMap((row) => Object.keys(row).map((key) => key.trim())));
  return columns
    .filter((column) => !presentColumns.has(column))
    .map((column) =>
      createIssue(
        context,
        "missing_column",
        "error",
        `Joara required column is missing: ${column}.`,
        file.sourceFileName,
      ),
    );
}

function collectDetailAggregates(
  context: PlatformFileGroupParserContext,
  file: JoaraGroupFileInput,
  issues: ParseIssue[],
): Map<string, DetailAggregate> {
  const aggregates = new Map<string, DetailAggregate>();

  for (const row of file.rows) {
    const identity = readIdentityRow(context, row, file, issues, JOARA_DETAIL_REQUIRED_COLUMNS.slice(0, 3));
    if (!identity) {
      continue;
    }

    const grossSales = parseMoney(row["판매금액(원)"]);
    if (grossSales === null) {
      issues.push(
        createIssue(
          context,
          "invalid_value",
          "error",
          "Joara settlementDetail grossSales value cannot be parsed.",
          getSourceFileName(row, file),
          getSourceRowIndex(row),
          buildGroupRowId(context, identity, getSourceFileName(row, file), getSourceRowIndex(row)),
        ),
      );
      continue;
    }

    const groupKey = buildGroupKey(identity);
    const existing = aggregates.get(groupKey);
    if (existing) {
      existing.grossSales += grossSales;
      continue;
    }

    aggregates.set(groupKey, {
      ...identity,
      grossSales,
      sourceFileName: getSourceFileName(row, file),
      sourceRowIndex: getSourceRowIndex(row),
    });
  }

  return aggregates;
}

function collectWorkAggregates(
  context: PlatformFileGroupParserContext,
  file: JoaraGroupFileInput,
  issues: ParseIssue[],
): Map<string, WorkAggregate> {
  const aggregates = new Map<string, WorkAggregate>();

  for (const row of file.rows) {
    const identity = readIdentityRow(context, row, file, issues, JOARA_WORK_REQUIRED_COLUMNS.slice(0, 3));
    if (!identity) {
      continue;
    }

    const settlementAmount = parseMoney(row["정산금액"]);
    if (settlementAmount === null) {
      issues.push(
        createIssue(
          context,
          "invalid_value",
          "error",
          "Joara workSettlement settlementAmount value cannot be parsed.",
          getSourceFileName(row, file),
          getSourceRowIndex(row),
          buildGroupRowId(context, identity, getSourceFileName(row, file), getSourceRowIndex(row)),
        ),
      );
      continue;
    }

    const groupKey = buildGroupKey(identity);
    const existing = aggregates.get(groupKey);
    if (existing) {
      existing.settlementAmount += settlementAmount;
      continue;
    }

    aggregates.set(groupKey, {
      ...identity,
      settlementAmount,
      sourceFileName: getSourceFileName(row, file),
      sourceRowIndex: getSourceRowIndex(row),
    });
  }

  return aggregates;
}

function buildSettlementRows(
  context: PlatformFileGroupParserContext,
  detailAggregates: Map<string, DetailAggregate>,
  workAggregates: Map<string, WorkAggregate>,
  issues: ParseIssue[],
): SettlementRow[] {
  const rows: SettlementRow[] = [];

  for (const [groupKey, detail] of Array.from(detailAggregates.entries())) {
    const work = workAggregates.get(groupKey);
    if (!work) {
      issues.push(
        createIssue(
          context,
          "mapping_failed",
          "error",
          `Joara settlementDetail row group could not be matched to workSettlement: ${groupKey}.`,
          detail.sourceFileName,
          detail.sourceRowIndex,
          buildGroupRowId(context, detail, detail.sourceFileName, detail.sourceRowIndex),
        ),
      );
      continue;
    }

    rows.push({
      rowId: buildGroupRowId(context, detail, detail.sourceFileName, detail.sourceRowIndex),
      company: context.company,
      platform: "joara",
      saleMonth: context.saleMonth,
      workTitle: detail.workTitle,
      mailerContentTitle: detail.workTitle,
      author: detail.author,
      grossSales: detail.grossSales,
      settlementAmount: work.settlementAmount,
      sourceFileName: detail.sourceFileName,
      sourceRowIndex: detail.sourceRowIndex,
      issues: [],
    });
  }

  for (const [groupKey, work] of Array.from(workAggregates.entries())) {
    if (detailAggregates.has(groupKey)) {
      continue;
    }

    issues.push(
      createIssue(
        context,
        "mapping_failed",
        "error",
        `Joara workSettlement row group could not be matched to settlementDetail: ${groupKey}.`,
        work.sourceFileName,
        work.sourceRowIndex,
        buildGroupRowId(context, work, work.sourceFileName, work.sourceRowIndex),
      ),
    );
  }

  return rows;
}

function readIdentityRow(
  context: PlatformFileGroupParserContext,
  row: TabularRow,
  file: JoaraGroupFileInput,
  issues: ParseIssue[],
  columns: readonly [string, string, string] | readonly string[],
): GroupKeyParts | null {
  const [workTitleColumn, workCodeColumn, authorColumn] = columns;
  const workTitle = readText(row[workTitleColumn]);
  const workCode = readText(row[workCodeColumn]);
  const author = readText(row[authorColumn]);
  if (workTitle === "" || workCode === "" || author === "") {
    issues.push(
      createIssue(
        context,
        "missing_field",
        "error",
        "Joara grouped identity field is missing.",
        getSourceFileName(row, file),
        getSourceRowIndex(row),
      ),
    );
    return null;
  }

  return { workTitle, workCode, author };
}

function buildGroupKey(identity: GroupKeyParts): string {
  return [identity.workTitle, identity.workCode, identity.author].join("\u001f");
}

function buildGroupRowId(
  context: PlatformFileGroupParserContext,
  identity: GroupKeyParts,
  sourceFileName: string,
  sourceRowIndex: number,
): string {
  return [
    context.batchId,
    "joara",
    context.company,
    identity.workCode,
    sourceFileName,
    sourceRowIndex,
  ].join("-");
}

function createIssue(
  context: PlatformFileGroupParserContext,
  issueType: ParseIssueType,
  severity: ParseIssueSeverity,
  message: string,
  sourceFileName?: string,
  sourceRowIndex?: number,
  rowId?: string,
): ParseIssue {
  return {
    issueId: [
      context.batchId,
      "joara",
      issueType,
      sourceFileName ?? "file_group",
      sourceRowIndex ?? "file",
    ].join("-"),
    batchId: context.batchId,
    company: context.company,
    platform: "joara",
    severity,
    issueType,
    message,
    sourceFileName,
    sourceRowIndex,
    rowId,
  };
}

function getSourceFileName(row: TabularRow, file: JoaraGroupFileInput): string {
  const sourceFileName = readText(row.sourceFileName);
  return sourceFileName === "" ? file.sourceFileName : sourceFileName;
}

function getSourceRowIndex(row: TabularRow): number {
  const value = row.sourceRowIndex;
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }

  const parsed = Number(String(value ?? "0"));
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

function readText(value: unknown): string {
  return String(value ?? "").trim();
}
