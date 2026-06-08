import type {
  Company,
  ParseIssue,
  ParseIssueType,
  Platform,
  SettlementRow,
} from "../types/settlement";

export type ParserContext = {
  batchId: string;
  company: Company;
  platform: Platform;
  saleMonth: string;
  sourceFileName: string;
};

export type ParserResult = {
  rows: SettlementRow[];
  issues: ParseIssue[];
};

export type TabularRow = Record<string, unknown>;

export type PlatformParser = (context: ParserContext, rows: TabularRow[]) => ParserResult;

export type PlatformFileGroupParserContext = Omit<ParserContext, "sourceFileName"> & {
  sourceFileNames: string[];
};

export type PlatformFileGroupInput = {
  sourceFileName: string;
  slot?: string;
  rows: TabularRow[];
  issues: ParseIssue[];
};

export type PlatformFileGroupParser = (
  context: PlatformFileGroupParserContext,
  files: PlatformFileGroupInput[],
) => ParserResult;

// Group parsers still return ParserResult. If a formula parser aggregates many source rows,
// keep detailed source refs in internal calculation types and map a representative source
// back to SettlementRow.sourceFileName/sourceRowIndex for MVP output.

export type SimpleExtractColumnMapping = {
  workTitle: string;
  author: string;
  grossSales: string;
  settlementAmount: string;
  publisher?: string;
};

export type SimpleExtractMappingStatus = "ready" | "draft";

export type SimpleExtractMapping = {
  platform: Platform;
  status: SimpleExtractMappingStatus;
  columns: SimpleExtractColumnMapping;
};

export type CreateParseIssueInput = {
  context: ParserContext;
  issueType: ParseIssueType;
  message: string;
  sourceRowIndex?: number;
  rowId?: string;
};
