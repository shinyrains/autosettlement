import type { Company, SettlementRow } from "../types/settlement";
import type { RidibooksEventCalculatedOutput } from "./ridibooksEventCalcUtils";
import { RIDIBOOKS_OUTPUT_SUFFIXES } from "./ridibooksCalcConstants";
import type { RidibooksCalculatedOutput } from "./ridibooksRowCalcUtils";

export type RidibooksRowToSettlementContext = {
  batchId: string;
  company: Company;
  saleMonth: string;
  sourceFileName: string;
};

export type RidibooksSettlementIdentity = {
  bookId: string;
  workTitle: string;
  author: string;
  publisher?: string;
};

export type RidibooksSettlementOutput =
  | RidibooksCalculatedOutput
  | RidibooksEventCalculatedOutput;

export type MapRidibooksOutputToSettlementInput = {
  context: RidibooksRowToSettlementContext;
  identity: RidibooksSettlementIdentity;
  output: RidibooksSettlementOutput;
};

export function mapRidibooksCalculatedOutputToSettlement({
  context,
  identity,
  output,
}: MapRidibooksOutputToSettlementInput): SettlementRow {
  const representativeSource = output.sourceRefs[0] ?? {
    sourceFileName: context.sourceFileName,
    sourceRowIndex: 0,
  };
  const publisher = normalizeOptionalText(identity.publisher);

  return {
    rowId: [
      context.batchId,
      "ridibooks",
      context.company,
      identity.bookId,
      output.kind,
      representativeSource.sourceFileName,
      representativeSource.sourceRowIndex,
    ].join("-"),
    company: context.company,
    platform: "ridibooks",
    saleMonth: context.saleMonth,
    workTitle: identity.workTitle,
    mailerContentTitle: `${identity.workTitle}${RIDIBOOKS_OUTPUT_SUFFIXES[output.kind]}`,
    author: identity.author,
    ...(publisher ? { publisher } : {}),
    grossSales: output.grossSales,
    settlementAmount: output.settlementAmount,
    sourceFileName: representativeSource.sourceFileName,
    sourceRowIndex: representativeSource.sourceRowIndex,
    issues: [],
  };
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  const normalized = String(value ?? "").trim();
  return normalized === "" ? undefined : normalized;
}
