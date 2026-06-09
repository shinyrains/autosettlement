import type { Company, ParseIssue } from "../types/settlement";
import type { ParserResult, TabularRow } from "./parserContract";
import { RIDIBOOKS_REQUIRED_COLUMNS, type RidibooksFileSlot } from "./ridibooksCalcConstants";
import {
  calculateRidibooksEventRow,
  type RidibooksEventCalculatedOutput,
  type RidibooksEventPeriod,
  type RidibooksEventRowCalculation,
} from "./ridibooksEventCalcUtils";
import { applyRidibooksEventOverride } from "./ridibooksEventOverrideUtils";
import { applyRidibooksMgCorrection } from "./ridibooksMgApplyUtils";
import {
  calculateRidibooksBaseFilePair,
  type RidibooksRowCalculation,
} from "./ridibooksRowCalcUtils";
import {
  mapRidibooksCalculatedOutputToSettlement,
  type RidibooksSettlementIdentity,
} from "./ridibooksRowToSettlement";

export type RidibooksGroupParserContext = {
  batchId: string;
  company: Company;
  platform: "ridibooks";
  saleMonth: string;
  sourceFileNames: string[];
  eventPeriod?: RidibooksEventPeriod;
};

export type RidibooksGroupFileInput = {
  sourceFileName: string;
  slot: RidibooksFileSlot;
  rows: TabularRow[];
  issues: ParseIssue[];
};

type RidibooksGroupedFiles = Record<RidibooksFileSlot, RidibooksGroupFileInput | undefined>;

type ValidBaseRow = {
  bookId: string;
  identity: RidibooksSettlementIdentity;
  row: TabularRow;
};

type ValidFile1Row = {
  bookId: string;
  row: TabularRow;
};

type ValidEventRow = {
  bookId: string;
  row: TabularRow;
};

type RidibooksBookCalculationWithIdentity = {
  bookId: string;
  workTitle: string;
  identity: RidibooksSettlementIdentity;
  calculation: RidibooksRowCalculation;
};

type RidibooksEventBookCalculationWithIdentity = {
  bookId: string;
  workTitle: string;
  identity: RidibooksSettlementIdentity;
  calculation: RidibooksEventRowCalculation;
};

const RIDIBOOKS_SLOTS: RidibooksFileSlot[] = ["base", "file1", "event", "mgCorrection"];

export function parseRidibooksFileGroup(
  context: RidibooksGroupParserContext,
  files: RidibooksGroupFileInput[],
): ParserResult {
  const adapterIssues = files.flatMap((file) => file.issues);
  const slotValidation = validateSlots(context, files);
  const groupedFiles = groupFilesBySlot(files);
  const requiredAdapterIssues = getRequiredAdapterIssues(groupedFiles);
  const eventPeriodIssues = validateEventPeriod(context, groupedFiles.event);
  const columnIssues = validateGroupColumns(context, groupedFiles);
  const blockedIssues = [
    ...slotValidation.issues,
    ...requiredAdapterIssues,
    ...eventPeriodIssues,
    ...columnIssues,
  ];

  if (blockedIssues.length > 0) {
    return { rows: [], issues: [...adapterIssues, ...blockedIssues] };
  }

  const issues: ParseIssue[] = [...adapterIssues];
  const baseRows = collectBaseRows(context, groupedFiles.base!, issues);
  const file1Rows = collectFile1Rows(context, groupedFiles.file1!, issues);
  const file1ByBookId = indexFile1Rows(file1Rows);
  const usedFile1BookIds = new Set<string>();
  const baseCalculations = calculateBaseRows({
    context,
    baseRows,
    file1ByBookId,
    mgFile: groupedFiles.mgCorrection,
    usedFile1BookIds,
    issues,
  });

  if (baseRows.length > 0) {
    collectUnmatchedFile1Issues(context, file1Rows, usedFile1BookIds, issues);
  }

  const eventCalculations = groupedFiles.event
    ? calculateEventRows({
        context,
        eventFile: groupedFiles.event,
        baseByBookId: new Map(baseRows.map((row) => [row.bookId, row])),
        issues,
      })
    : [];

  const overridden = applyRidibooksEventOverride({
    baseCalculations: baseCalculations.map(({ bookId, workTitle, calculation }) => ({
      bookId,
      workTitle,
      calculation,
    })),
    eventCalculations: eventCalculations.map(({ bookId, workTitle, calculation }) => ({
      bookId,
      workTitle,
      calculation,
    })),
  });
  issues.push(...overridden.issues);

  const identityByBookId = new Map<string, RidibooksSettlementIdentity>([
    ...baseCalculations.map((item) => [item.bookId, item.identity] as const),
    ...eventCalculations.map((item) => [item.bookId, item.identity] as const),
  ]);

  const rows = overridden.calculations.flatMap((calculation) => {
    const identity = identityByBookId.get(calculation.bookId);
    if (!identity) {
      return [];
    }

    return calculation.calculation.outputRows.map((output) =>
      mapRidibooksCalculatedOutputToSettlement({
        context: {
          batchId: context.batchId,
          company: context.company,
          saleMonth: context.saleMonth,
          sourceFileName: context.sourceFileNames[0] ?? "ridibooks",
        },
        identity,
        output,
      }),
    );
  });

  return { rows, issues };
}

function validateSlots(
  context: RidibooksGroupParserContext,
  files: RidibooksGroupFileInput[],
): { issues: ParseIssue[] } {
  const issues: ParseIssue[] = [];

  for (const file of files) {
    if (!RIDIBOOKS_SLOTS.includes(file.slot)) {
      issues.push(createIssue(context, "mapping_failed", "error", `Unknown Ridibooks slot: ${String(file.slot)}.`, file.sourceFileName));
    }
  }

  for (const slot of RIDIBOOKS_SLOTS) {
    const slotFiles = files.filter((file) => file.slot === slot);
    if ((slot === "base" || slot === "file1") && slotFiles.length === 0) {
      issues.push(createIssue(context, "missing_file", "error", `Ridibooks ${slot} file is required.`));
    }
    if (slotFiles.length > 1) {
      issues.push(createIssue(context, "mapping_failed", "error", `Ridibooks ${slot} slot must not be duplicated.`, slotFiles[1].sourceFileName));
    }
  }

  return { issues };
}

function groupFilesBySlot(files: RidibooksGroupFileInput[]): RidibooksGroupedFiles {
  return {
    base: files.find((file) => file.slot === "base"),
    file1: files.find((file) => file.slot === "file1"),
    event: files.find((file) => file.slot === "event"),
    mgCorrection: files.find((file) => file.slot === "mgCorrection"),
  };
}

function getRequiredAdapterIssues(files: RidibooksGroupedFiles): ParseIssue[] {
  return [files.base, files.file1]
    .flatMap((file) => file?.issues ?? [])
    .filter((issue) => issue.issueType === "parse_error");
}

function validateEventPeriod(
  context: RidibooksGroupParserContext,
  eventFile: RidibooksGroupFileInput | undefined,
): ParseIssue[] {
  if (!eventFile) {
    return [];
  }

  if (readText(context.eventPeriod?.startDate) !== "" && readText(context.eventPeriod?.endDate) !== "") {
    return [];
  }

  return [
    createIssue(
      context,
      "missing_field",
      "error",
      "Ridibooks eventPeriod.startDate and eventPeriod.endDate are required when event file exists.",
      eventFile.sourceFileName,
    ),
  ];
}

function validateGroupColumns(
  context: RidibooksGroupParserContext,
  files: RidibooksGroupedFiles,
): ParseIssue[] {
  return [
    ...validateRequiredColumns(context, files.base, [
      ...RIDIBOOKS_REQUIRED_COLUMNS.base.identity,
      ...RIDIBOOKS_REQUIRED_COLUMNS.base.amounts,
    ]),
    ...validateRequiredColumns(context, files.file1, [
      ...RIDIBOOKS_REQUIRED_COLUMNS.file1.identity,
      ...RIDIBOOKS_REQUIRED_COLUMNS.file1.amounts,
    ]),
    ...validateRequiredColumns(context, files.event, [
      ...RIDIBOOKS_REQUIRED_COLUMNS.event.identity,
      ...RIDIBOOKS_REQUIRED_COLUMNS.event.amounts,
    ]),
    ...validateRequiredColumns(context, files.mgCorrection, [
      RIDIBOOKS_REQUIRED_COLUMNS.mgCorrection.matching[0],
      ...RIDIBOOKS_REQUIRED_COLUMNS.mgCorrection.values,
    ]),
  ];
}

function validateRequiredColumns(
  context: RidibooksGroupParserContext,
  file: RidibooksGroupFileInput | undefined,
  columns: readonly string[],
): ParseIssue[] {
  if (!file || file.rows.length === 0) {
    return [];
  }

  const presentColumns = new Set(file.rows.flatMap((row) => Object.keys(row)));
  return columns
    .filter((column) => !presentColumns.has(column))
    .map((column) =>
      createIssue(
        context,
        "missing_column",
        "error",
        `Ridibooks required column is missing: ${column}.`,
        file.sourceFileName,
      ),
    );
}

function collectBaseRows(
  context: RidibooksGroupParserContext,
  file: RidibooksGroupFileInput,
  issues: ParseIssue[],
): ValidBaseRow[] {
  const [bookIdColumn, titleColumn, authorColumn, publisherColumn] =
    RIDIBOOKS_REQUIRED_COLUMNS.base.identity;

  return file.rows.flatMap((row) => {
    const requiredValues = [
      [bookIdColumn, readText(row[bookIdColumn])],
      [titleColumn, readText(row[titleColumn])],
      [authorColumn, readText(row[authorColumn])],
      [publisherColumn, readText(row[publisherColumn])],
    ] as const;
    const missing = requiredValues.find(([, value]) => value === "");
    if (missing) {
      issues.push(createIssue(
        context,
        "missing_field",
        "error",
        `Ridibooks base identity field is missing: ${missing[0]}.`,
        getSourceFileName(row, file),
        getSourceRowIndex(row),
      ));
      return [];
    }

    return [{
      bookId: requiredValues[0][1],
      identity: {
        bookId: requiredValues[0][1],
        workTitle: requiredValues[1][1],
        author: requiredValues[2][1],
        publisher: requiredValues[3][1],
      },
      row,
    }];
  });
}

function collectFile1Rows(
  context: RidibooksGroupParserContext,
  file: RidibooksGroupFileInput,
  issues: ParseIssue[],
): ValidFile1Row[] {
  const [bookIdColumn, titleColumn] = RIDIBOOKS_REQUIRED_COLUMNS.file1.identity;

  return file.rows.flatMap((row) => {
    const bookId = readText(row[bookIdColumn]);
    const title = readText(row[titleColumn]);
    if (bookId === "" || title === "") {
      issues.push(createIssue(
        context,
        "missing_field",
        "error",
        "Ridibooks file1 identity field is missing.",
        getSourceFileName(row, file),
        getSourceRowIndex(row),
      ));
      return [];
    }

    return [{ bookId, row }];
  });
}

function indexFile1Rows(rows: ValidFile1Row[]): Map<string, ValidFile1Row> {
  return new Map(rows.map((row) => [row.bookId, row]));
}

function calculateBaseRows({
  context,
  baseRows,
  file1ByBookId,
  mgFile,
  usedFile1BookIds,
  issues,
}: {
  context: RidibooksGroupParserContext;
  baseRows: ValidBaseRow[];
  file1ByBookId: Map<string, ValidFile1Row>;
  mgFile: RidibooksGroupFileInput | undefined;
  usedFile1BookIds: Set<string>;
  issues: ParseIssue[];
}): RidibooksBookCalculationWithIdentity[] {
  return baseRows.map((baseRow) => {
    const file1Row = file1ByBookId.get(baseRow.bookId);
    if (file1Row) {
      usedFile1BookIds.add(baseRow.bookId);
    } else {
      issues.push(createIssue(
        context,
        "mapping_failed",
        "warning",
        `Ridibooks file1 row was not found for ${baseRow.bookId}; zero adjustment was used.`,
        getSourceFileName(baseRow.row),
        getSourceRowIndex(baseRow.row),
      ));
    }

    const calculation = calculateRidibooksBaseFilePair(baseRow.row, file1Row?.row);
    const mgResult = applyRidibooksMgCorrection({
      context: createParserContext(context, mgFile?.sourceFileName ?? context.sourceFileNames[0] ?? "ridibooks"),
      bookId: baseRow.bookId,
      workTitle: baseRow.identity.workTitle,
      calculation,
      correctionRows: mgFile?.issues.some((issue) => issue.issueType === "parse_error")
        ? []
        : mgFile?.rows ?? [],
    });
    issues.push(...mgResult.issues);

    return {
      bookId: baseRow.bookId,
      workTitle: baseRow.identity.workTitle,
      identity: baseRow.identity,
      calculation: mgResult.calculation,
    };
  });
}

function collectUnmatchedFile1Issues(
  context: RidibooksGroupParserContext,
  file1Rows: ValidFile1Row[],
  usedFile1BookIds: Set<string>,
  issues: ParseIssue[],
): void {
  for (const file1Row of file1Rows) {
    if (usedFile1BookIds.has(file1Row.bookId)) {
      continue;
    }

    issues.push(createIssue(
      context,
      "mapping_failed",
      "warning",
      `Ridibooks file1 row did not match any base row: ${file1Row.bookId}.`,
      getSourceFileName(file1Row.row),
      getSourceRowIndex(file1Row.row),
    ));
  }
}

function calculateEventRows({
  context,
  eventFile,
  baseByBookId,
  issues,
}: {
  context: RidibooksGroupParserContext;
  eventFile: RidibooksGroupFileInput;
  baseByBookId: Map<string, ValidBaseRow>;
  issues: ParseIssue[];
}): RidibooksEventBookCalculationWithIdentity[] {
  const eventRows = collectEventRows(context, eventFile, issues);
  const calculationByBookId = new Map<string, RidibooksEventBookCalculationWithIdentity>();

  for (const eventRow of eventRows) {
    const baseRow = baseByBookId.get(eventRow.bookId);
    if (!baseRow) {
      issues.push(createIssue(
        context,
        "mapping_failed",
        "error",
        `Ridibooks event row could not be joined to base row: ${eventRow.bookId}.`,
        getSourceFileName(eventRow.row, eventFile),
        getSourceRowIndex(eventRow.row),
      ));
      continue;
    }

    const rowCalculation = calculateRidibooksEventRow(eventRow.row, context.eventPeriod!);
    const existing = calculationByBookId.get(eventRow.bookId);
    if (!existing) {
      calculationByBookId.set(eventRow.bookId, {
        bookId: eventRow.bookId,
        workTitle: baseRow.identity.workTitle,
        identity: baseRow.identity,
        calculation: rowCalculation,
      });
      continue;
    }

    existing.calculation = mergeEventCalculations(existing.calculation, rowCalculation);
  }

  return [...calculationByBookId.values()];
}

function collectEventRows(
  context: RidibooksGroupParserContext,
  file: RidibooksGroupFileInput,
  issues: ParseIssue[],
): ValidEventRow[] {
  const [bookIdColumn, titleColumn] = RIDIBOOKS_REQUIRED_COLUMNS.event.identity;

  return file.rows.flatMap((row) => {
    const bookId = readText(row[bookIdColumn]);
    const title = readText(row[titleColumn]);
    if (bookId === "" || title === "") {
      issues.push(createIssue(
        context,
        "missing_field",
        "error",
        "Ridibooks event identity field is missing.",
        getSourceFileName(row, file),
        getSourceRowIndex(row),
      ));
      return [];
    }

    return [{ bookId, row }];
  });
}

function mergeEventCalculations(
  left: RidibooksEventRowCalculation,
  right: RidibooksEventRowCalculation,
): RidibooksEventRowCalculation {
  const outputByKind = new Map<string, RidibooksEventCalculatedOutput>();

  for (const output of [...left.outputRows, ...right.outputRows]) {
    const existing = outputByKind.get(output.kind);
    if (!existing) {
      outputByKind.set(output.kind, { ...output, sourceRefs: [...output.sourceRefs] });
      continue;
    }

    outputByKind.set(output.kind, {
      ...existing,
      grossSales: normalizeAmount(existing.grossSales + output.grossSales),
      settlementAmount: normalizeAmount(existing.settlementAmount + output.settlementAmount),
      sourceRefs: [...existing.sourceRefs, ...output.sourceRefs],
    });
  }

  return {
    outputRows: [...outputByKind.values()],
    sourceRefs: [...left.sourceRefs, ...right.sourceRefs],
  };
}

function createParserContext(context: RidibooksGroupParserContext, sourceFileName: string) {
  return {
    batchId: context.batchId,
    company: context.company,
    platform: context.platform,
    saleMonth: context.saleMonth,
    sourceFileName,
  };
}

function createIssue(
  context: RidibooksGroupParserContext,
  issueType: ParseIssue["issueType"],
  severity: ParseIssue["severity"],
  message: string,
  sourceFileName?: string,
  sourceRowIndex?: number,
): ParseIssue {
  return {
    issueId: [
      context.batchId,
      "ridibooks",
      issueType,
      severity,
      sourceFileName ?? "group",
      sourceRowIndex ?? "file",
      hashText(message),
    ].join("-"),
    batchId: context.batchId,
    company: context.company,
    platform: "ridibooks",
    severity,
    issueType,
    message,
    ...(sourceFileName ? { sourceFileName } : {}),
    ...(sourceRowIndex !== undefined ? { sourceRowIndex } : {}),
  };
}

function getSourceFileName(row: TabularRow, fallbackFile?: RidibooksGroupFileInput): string | undefined {
  return typeof row.sourceFileName === "string" ? row.sourceFileName : fallbackFile?.sourceFileName;
}

function getSourceRowIndex(row: TabularRow): number | undefined {
  return typeof row.sourceRowIndex === "number" ? row.sourceRowIndex : undefined;
}

function readText(value: unknown): string {
  const text = String(value ?? "").trim();
  const excelTextMatch = text.match(/^=T\("([\s\S]*)"\)$/);
  return excelTextMatch ? excelTextMatch[1].trim() : text;
}

function normalizeAmount(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function hashText(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36);
}
