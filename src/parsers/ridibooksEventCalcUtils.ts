import type { TabularRow } from "./parserContract";
import { RIDIBOOKS_REQUIRED_COLUMNS } from "./ridibooksCalcConstants";
import type { RidibooksSourceRef } from "./ridibooksRowCalcUtils";

export type RidibooksEventPeriod = {
  startDate: string;
  endDate: string;
};

export type RidibooksEventOutputKind = "normal" | "app" | "event" | "eventApp";

export type RidibooksEventCalculatedOutput = {
  kind: RidibooksEventOutputKind;
  grossSales: number;
  settlementAmount: number;
  sourceRefs: RidibooksSourceRef[];
};

export type RidibooksEventRowCalculation = {
  outputRows: RidibooksEventCalculatedOutput[];
  sourceRefs: RidibooksSourceRef[];
};

export function calculateRidibooksEventRow(
  eventRow: TabularRow,
  eventPeriod: RidibooksEventPeriod,
): RidibooksEventRowCalculation {
  const sourceRefs = createSourceRefs(eventRow);
  const isEventPeriodRow = isWithinEventPeriod(
    readText(eventRow[RIDIBOOKS_REQUIRED_COLUMNS.event.amounts[0]]),
    eventPeriod,
  );

  return {
    outputRows: [
      calculateNormalEventOutput(eventRow, sourceRefs, isEventPeriodRow),
      calculateAppEventOutput(eventRow, sourceRefs, isEventPeriodRow),
    ],
    sourceRefs,
  };
}

function calculateNormalEventOutput(
  row: TabularRow,
  sourceRefs: RidibooksSourceRef[],
  isEventPeriodRow: boolean,
): RidibooksEventCalculatedOutput {
  const [, normalSales, normalSettlementAmount] = RIDIBOOKS_REQUIRED_COLUMNS.event.amounts;

  return {
    kind: isEventPeriodRow ? "event" : "normal",
    grossSales: normalizeAmount(parseRidibooksNumber(row[normalSales])),
    settlementAmount: normalizeAmount(parseRidibooksNumber(row[normalSettlementAmount])),
    sourceRefs,
  };
}

function calculateAppEventOutput(
  row: TabularRow,
  sourceRefs: RidibooksSourceRef[],
  isEventPeriodRow: boolean,
): RidibooksEventCalculatedOutput {
  const [
    ,
    ,
    ,
    iosTargetAmount,
    iosSettlementAmount,
    androidTargetAmount,
    androidSettlementAmount,
    oneStoreTargetAmount,
    oneStoreSettlementAmount,
  ] = RIDIBOOKS_REQUIRED_COLUMNS.event.amounts;

  return {
    kind: isEventPeriodRow ? "eventApp" : "app",
    grossSales: normalizeAmount(
      sumValues([
        parseRidibooksNumber(row[iosTargetAmount]),
        parseRidibooksNumber(row[androidTargetAmount]),
        parseRidibooksNumber(row[oneStoreTargetAmount]),
      ]),
    ),
    settlementAmount: normalizeAmount(
      sumValues([
        parseRidibooksNumber(row[iosSettlementAmount]),
        parseRidibooksNumber(row[androidSettlementAmount]),
        parseRidibooksNumber(row[oneStoreSettlementAmount]),
      ]),
    ),
    sourceRefs,
  };
}

function isWithinEventPeriod(paidAt: string, eventPeriod: RidibooksEventPeriod): boolean {
  return paidAt >= eventPeriod.startDate && paidAt <= eventPeriod.endDate;
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

function sumValues(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function readText(value: unknown): string {
  return String(value ?? "").trim();
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
