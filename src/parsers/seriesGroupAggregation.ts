import type { SettlementRow } from "../types/settlement";

export function aggregateSeriesSettlementRows(rows: SettlementRow[]): SettlementRow[] {
  const aggregatedRows = new Map<string, SettlementRow>();

  for (const row of rows) {
    const aggregationKey = createSeriesAggregationKey(row);
    const existingRow = aggregatedRows.get(aggregationKey);

    if (existingRow === undefined) {
      aggregatedRows.set(aggregationKey, { ...row, issues: [...row.issues] });
      continue;
    }

    existingRow.grossSales = normalizeAmount(existingRow.grossSales + row.grossSales);
    existingRow.settlementAmount = normalizeAmount(existingRow.settlementAmount + row.settlementAmount);
  }

  return Array.from(aggregatedRows.values());
}

function normalizeAmount(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function createSeriesAggregationKey(row: SettlementRow): string {
  return [
    row.company,
    row.platform,
    row.saleMonth,
    row.workTitle,
    row.author,
    row.publisher ?? "",
    row.mailerContentTitle,
  ].join("\u001f");
}
