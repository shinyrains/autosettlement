import type { TabularRow } from "./parserContract";
import {
  MUNPIA_CALC_RATES,
  MUNPIA_REQUIRED_COLUMNS,
  MUNPIA_TOTAL_ROW_POLICY,
  type MunpiaOutputKind,
} from "./munpiaCalcConstants";

export type MunpiaSourceRef = {
  sourceFileName: string;
  sourceRowIndex: number;
};

export type MunpiaCalculatedOutput = {
  kind: MunpiaOutputKind;
  grossSales: number;
  settlementAmount: number;
  sourceRefs: MunpiaSourceRef[];
};

export type MunpiaRowCalculation = {
  outputRows: MunpiaCalculatedOutput[];
  referenceSettlementAmount: number;
  sourceRefs: MunpiaSourceRef[];
};

export function calculateMunpiaRow(row: TabularRow): MunpiaRowCalculation {
  const sourceRefs = createSourceRefs(row);
  const [webGrossColumn, iosGrossColumn, googleGrossColumn] = MUNPIA_REQUIRED_COLUMNS.amounts;
  const [referenceSettlementColumn] = MUNPIA_REQUIRED_COLUMNS.reference;

  const webGrossSales = parseMunpiaNumber(row[webGrossColumn]);
  const iosGrossSales = parseMunpiaNumber(row[iosGrossColumn]);
  const googleGrossSales = parseMunpiaNumber(row[googleGrossColumn]);
  const appGrossSales = normalizeAmount(iosGrossSales + googleGrossSales);

  const outputRows: MunpiaCalculatedOutput[] = [];

  if (webGrossSales !== 0) {
    outputRows.push({
      kind: "web",
      grossSales: webGrossSales,
      settlementAmount: roundSettlementAmount(webGrossSales * MUNPIA_CALC_RATES.web),
      sourceRefs,
    });
  }

  if (appGrossSales !== 0) {
    outputRows.push({
      kind: "app",
      grossSales: appGrossSales,
      settlementAmount: roundSettlementAmount(
        iosGrossSales * MUNPIA_CALC_RATES.iosApp
          + googleGrossSales * MUNPIA_CALC_RATES.googleApp,
      ),
      sourceRefs,
    });
  }

  return {
    outputRows,
    referenceSettlementAmount: parseMunpiaNumber(row[referenceSettlementColumn]),
    sourceRefs,
  };
}

export function isMunpiaTotalRow(row: TabularRow): boolean {
  return String(row[MUNPIA_TOTAL_ROW_POLICY.markerColumn] ?? "").trim()
    === MUNPIA_TOTAL_ROW_POLICY.markerValue;
}

function parseMunpiaNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const normalized = String(value ?? "").trim().replace(/,/g, "");
  if (normalized === "" || normalized === "-") {
    return 0;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function createSourceRefs(row: TabularRow): MunpiaSourceRef[] {
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

function roundSettlementAmount(value: number): number {
  return Math.round(value);
}
