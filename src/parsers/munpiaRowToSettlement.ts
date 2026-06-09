import type { Company, SettlementRow } from "../types/settlement";
import { MUNPIA_OUTPUT_SUFFIXES } from "./munpiaCalcConstants";
import type { MunpiaCalculatedOutput } from "./munpiaRowCalcUtils";

export type MunpiaRowToSettlementContext = {
  batchId: string;
  company: Company;
  saleMonth: string;
  sourceFileName: string;
};

export type MunpiaSettlementIdentity = {
  workCode: string;
  workTitle: string;
  author: string;
};

export type MapMunpiaOutputToSettlementInput = {
  context: MunpiaRowToSettlementContext;
  identity: MunpiaSettlementIdentity;
  output: MunpiaCalculatedOutput;
};

export function mapMunpiaCalculatedOutputToSettlement({
  context,
  identity,
  output,
}: MapMunpiaOutputToSettlementInput): SettlementRow {
  const representativeSource = output.sourceRefs[0] ?? {
    sourceFileName: context.sourceFileName,
    sourceRowIndex: 0,
  };
  const workCode = readText(identity.workCode);
  const workTitle = readText(identity.workTitle);

  return {
    rowId: [
      context.batchId,
      "munpia",
      context.company,
      workCode,
      output.kind,
      representativeSource.sourceFileName,
      representativeSource.sourceRowIndex,
    ].join("-"),
    company: context.company,
    platform: "munpia",
    saleMonth: context.saleMonth,
    workTitle,
    mailerContentTitle: `${workTitle}${MUNPIA_OUTPUT_SUFFIXES[output.kind]}`,
    author: readText(identity.author),
    grossSales: output.grossSales,
    settlementAmount: output.settlementAmount,
    sourceFileName: representativeSource.sourceFileName,
    sourceRowIndex: representativeSource.sourceRowIndex,
    issues: [],
  };
}

function readText(value: unknown): string {
  return String(value ?? "").trim();
}
