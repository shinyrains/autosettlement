import type {
  ParserContext,
  ParserResult,
  PlatformFileGroupInput,
  PlatformFileGroupParserContext,
} from "./parserContract";
import { SERIES_REQUIRED_FILE_COUNTS, type SeriesCalcGroup } from "./seriesCalcConstants";
import { aggregateSeriesSettlementRows } from "./seriesGroupAggregation";
import { parseSeriesSingleFileRows } from "./seriesSingleFileParser";
import type { ParseIssue, ParseIssueType } from "../types/settlement";

const VALID_SERIES_SLOTS = new Set<SeriesCalcGroup>(["general", "app"]);

export function parseSeriesFileGroup(
  context: PlatformFileGroupParserContext,
  files: PlatformFileGroupInput[],
): ParserResult {
  const validationIssues = validateSeriesFileGroup(context, files);
  if (validationIssues.length > 0) {
    return { rows: [], issues: validationIssues };
  }

  const mergedResult = files.reduce<ParserResult>(
    (result, file) => {
      const slot = file.slot as SeriesCalcGroup;
      const singleFileResult = parseSeriesSingleFileRows(createParserContext(context, file), file.rows, slot);
      result.rows.push(...singleFileResult.rows);
      result.issues.push(...file.issues, ...singleFileResult.issues);
      return result;
    },
    { rows: [], issues: [] },
  );

  return {
    rows: aggregateSeriesSettlementRows(mergedResult.rows),
    issues: mergedResult.issues,
  };
}

function validateSeriesFileGroup(
  context: PlatformFileGroupParserContext,
  files: PlatformFileGroupInput[],
): ParseIssue[] {
  const slotIssues = files.flatMap((file) => {
    if (file.slot === undefined || !VALID_SERIES_SLOTS.has(file.slot as SeriesCalcGroup)) {
      return [
        createSeriesGroupIssue(
          context,
          "mapping_failed",
          `Series file slot must be general or app: ${file.slot ?? "missing"}.`,
          file.sourceFileName,
        ),
      ];
    }
    return [];
  });

  if (slotIssues.length > 0) {
    return slotIssues;
  }

  const countIssues: ParseIssue[] = [];
  const generalCount = countFilesBySlot(files, "general");
  const appCount = countFilesBySlot(files, "app");

  if (files.length !== SERIES_REQUIRED_FILE_COUNTS.total) {
    countIssues.push(
      createSeriesGroupIssue(
        context,
        "mapping_failed",
        `Series file group must contain exactly ${SERIES_REQUIRED_FILE_COUNTS.total} files.`,
      ),
    );
  }

  if (generalCount < SERIES_REQUIRED_FILE_COUNTS.general) {
    countIssues.push(
      createSeriesGroupIssue(
        context,
        "missing_file",
        `Series general slot requires ${SERIES_REQUIRED_FILE_COUNTS.general} files.`,
      ),
    );
  }

  if (appCount < SERIES_REQUIRED_FILE_COUNTS.app) {
    countIssues.push(
      createSeriesGroupIssue(
        context,
        "missing_file",
        `Series app slot requires ${SERIES_REQUIRED_FILE_COUNTS.app} files.`,
      ),
    );
  }

  if (generalCount > SERIES_REQUIRED_FILE_COUNTS.general) {
    countIssues.push(
      createSeriesGroupIssue(
        context,
        "mapping_failed",
        `Series general slot must not exceed ${SERIES_REQUIRED_FILE_COUNTS.general} files.`,
      ),
    );
  }

  if (appCount > SERIES_REQUIRED_FILE_COUNTS.app) {
    countIssues.push(
      createSeriesGroupIssue(
        context,
        "mapping_failed",
        `Series app slot must not exceed ${SERIES_REQUIRED_FILE_COUNTS.app} files.`,
      ),
    );
  }

  return countIssues;
}

function countFilesBySlot(files: PlatformFileGroupInput[], slot: SeriesCalcGroup): number {
  return files.filter((file) => file.slot === slot).length;
}

function createParserContext(
  context: PlatformFileGroupParserContext,
  file: PlatformFileGroupInput,
): ParserContext {
  return {
    batchId: context.batchId,
    company: context.company,
    platform: context.platform,
    saleMonth: context.saleMonth,
    sourceFileName: file.sourceFileName,
  };
}

function createSeriesGroupIssue(
  context: PlatformFileGroupParserContext,
  issueType: ParseIssueType,
  message: string,
  sourceFileName?: string,
): ParseIssue {
  return {
    issueId: [
      context.batchId,
      "series",
      "group",
      issueType,
      sourceFileName ?? "file_group",
    ].join("-"),
    batchId: context.batchId,
    company: context.company,
    platform: "series",
    severity: "error",
    issueType,
    message,
    sourceFileName,
  };
}
