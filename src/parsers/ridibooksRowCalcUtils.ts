import type { TabularRow } from "./parserContract";
import {
  RIDIBOOKS_CALC_RATES,
  RIDIBOOKS_REQUIRED_COLUMNS,
} from "./ridibooksCalcConstants";

export type RidibooksSourceRef = {
  sourceFileName: string;
  sourceRowIndex: number;
};

export type RidibooksCalculatedOutputKind = "normal" | "app";

export type RidibooksCalculatedOutput = {
  kind: RidibooksCalculatedOutputKind;
  grossSales: number;
  settlementAmount: number;
  sourceRefs: RidibooksSourceRef[];
};

export type RidibooksRowCalculation = {
  outputRows: RidibooksCalculatedOutput[];
  sourceRefs: RidibooksSourceRef[];
};

export function calculateRidibooksBaseFilePair(
  baseRow: TabularRow,
  file1Row?: TabularRow,
): RidibooksRowCalculation {
  const sourceRefs = [
    ...createSourceRefs(baseRow),
    ...(file1Row ? createSourceRefs(file1Row) : []),
  ];

  return {
    outputRows: [
      calculateNormalOutput(baseRow, file1Row),
      calculateAppOutput(baseRow),
    ],
    sourceRefs,
  };
}

function calculateNormalOutput(
  baseRow: TabularRow,
  file1Row?: TabularRow,
): RidibooksCalculatedOutput {
  const [baseNormalSales, baseNormalCancel] = RIDIBOOKS_REQUIRED_COLUMNS.base.amounts;
  const [file1NormalSales, file1NormalCancel, file1SettlementAmount] =
    RIDIBOOKS_REQUIRED_COLUMNS.file1.amounts;

  const normalSalesDiff = parseRidibooksNumber(baseRow[baseNormalSales])
    - parseRidibooksNumber(file1Row?.[file1NormalSales]);
  const normalCancelDiff = parseRidibooksNumber(baseRow[baseNormalCancel])
    - parseRidibooksNumber(file1Row?.[file1NormalCancel]);
  const grossSales = normalizeAmount(normalSalesDiff + normalCancelDiff);

  return {
    kind: "normal",
    grossSales,
    settlementAmount: normalizeAmount(
      grossSales * RIDIBOOKS_CALC_RATES.normal
        + parseRidibooksNumber(file1Row?.[file1SettlementAmount]),
    ),
    sourceRefs: [
      ...createSourceRefs(baseRow),
      ...(file1Row ? createSourceRefs(file1Row) : []),
    ],
  };
}

function calculateAppOutput(baseRow: TabularRow): RidibooksCalculatedOutput {
  const [, , appTargetAmount, appFee, appCancelAmount] = RIDIBOOKS_REQUIRED_COLUMNS.base.amounts;
  const targetAmount = parseRidibooksNumber(baseRow[appTargetAmount]);
  const fee = parseRidibooksNumber(baseRow[appFee]);
  const cancelAmount = parseRidibooksNumber(baseRow[appCancelAmount]);

  return {
    kind: "app",
    grossSales: normalizeAmount(targetAmount - cancelAmount),
    settlementAmount: normalizeAmount(
      (targetAmount - fee - cancelAmount) * RIDIBOOKS_CALC_RATES.app,
    ),
    sourceRefs: createSourceRefs(baseRow),
  };
}

function parseRidibooksNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const normalized = String(value ?? "").trim().replace(/,/g, "");
  if (normalized === "") {
    return 0;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function createSourceRefs(row: TabularRow): RidibooksSourceRef[] {
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
