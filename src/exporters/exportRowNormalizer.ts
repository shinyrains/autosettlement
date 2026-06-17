import type { SettlementRow } from "../types/settlement";

export function normalizeExportWorkTitle(title: string): string {
  let normalized = title.trim().replace(/\s+/g, " ");
  let previous = "";

  while (previous !== normalized) {
    previous = normalized;
    normalized = normalized
      .replace(/\s*[\[\(（](?:완결|외전|단행본)[\]\)）](?=\s*(?:\([^)]*\)|$))/g, "")
      .replace(/\s+\d+(?:-\d+)?\s*[권화]$/, "")
      .trim();

    if (containsHangul(normalized)) {
      normalized = normalized
        .replace(/\s+\d+(?:-\d+)?\s*$/, "")
        .trim();
    }
  }

  return normalized;
}

function containsHangul(value: string): boolean {
  return /[가-힣]/.test(value);
}

export function normalizeAggregateExportRows(rows: SettlementRow[]): SettlementRow[] {
  const groupedRows = new Map<string, SettlementRow>();

  for (const row of rows) {
    if (row.grossSales === 0 && row.settlementAmount === 0) {
      continue;
    }

    const normalizedTitle = normalizeExportWorkTitle(row.mailerContentTitle || row.workTitle);
    const normalizedWorkTitle = normalizeExportWorkTitle(row.workTitle || row.mailerContentTitle);
    const publisher = row.publisher ?? "";
    const groupKey = [
      row.company,
      row.platform,
      row.saleMonth,
      row.author,
      publisher,
      normalizedTitle,
    ].join("\u001f");

    const existing = groupedRows.get(groupKey);
    if (!existing) {
      groupedRows.set(groupKey, {
        ...row,
        workTitle: normalizedWorkTitle,
        mailerContentTitle: normalizedTitle,
        publisher: row.publisher,
      });
      continue;
    }

    groupedRows.set(groupKey, {
      ...existing,
      grossSales: existing.grossSales + row.grossSales,
      settlementAmount: existing.settlementAmount + row.settlementAmount,
      sourceFileName: mergeUniqueText(existing.sourceFileName, row.sourceFileName),
      sourceRowIndex: Math.min(existing.sourceRowIndex, row.sourceRowIndex),
      issues: [...existing.issues, ...row.issues],
    });
  }

  return Array.from(groupedRows.values()).filter((row) => row.grossSales !== 0 || row.settlementAmount !== 0);
}

function mergeUniqueText(left: string, right: string): string {
  const values = new Set([left, right].filter((value) => value.trim() !== ""));
  return Array.from(values).join(", ");
}
