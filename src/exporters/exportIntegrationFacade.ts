import { validateSettlementRows } from "../validators";
import type { ParseIssue, SettlementRow } from "../types/settlement";
import { buildExportPackages, type ExportPackage } from "./exportPackageBuilder";

export type ExportBuildStatus = "ready" | "blocked";

export type ExportBuildResult = {
  packages: ExportPackage[];
  issues: ParseIssue[];
  status: ExportBuildStatus;
};

export function createExportPackages(rows: SettlementRow[]): ExportBuildResult {
  const issues = validateSettlementRows(rows);

  if (issues.length > 0) {
    return {
      packages: [],
      issues,
      status: "blocked",
    };
  }

  return {
    packages: buildExportPackages(rows),
    issues: [],
    status: "ready",
  };
}
